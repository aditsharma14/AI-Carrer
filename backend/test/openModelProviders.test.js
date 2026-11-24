import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const groq = require('../src/ai/client/providers/groqProvider');
const huggingFace = require('../src/ai/client/providers/huggingFaceProvider');
const ollama = require('../src/ai/client/providers/ollamaProvider');
const hfEmbeddings = require('../src/ai/client/providers/huggingFaceEmbeddings');
const { extractJson, toStrictJsonSchema, normalizeMessages } = require('../src/ai/client/providers/openModelChat');
const { SCHEMAS } = require('../src/ai/schemas');
const { z } = require('zod');

// Queue of canned HTTP responses; records every request made.
function mockFetch(...responses) {
  const calls = [];
  const fn = vi.fn(async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    const { status = 200, json } = next;
    return { ok: status < 400, status, json: async () => json, text: async () => JSON.stringify(json) };
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}

const openAIReply = (content, extra = {}) => ({
  json: {
    choices: [{ message: { content, ...extra }, finish_reason: extra.tool_calls ? 'tool_calls' : 'stop' }],
    usage: { prompt_tokens: 12, completion_tokens: 3 },
  },
});

const prompt = [
  { role: 'system', content: 'You are helpful.' },
  { role: 'user', content: 'Hi' },
];
const questions = SCHEMAS['interviewGenerator.v1'];
const validQuestions = { questions: [{ question: 'Q?', rationale: 'R' }] };

afterEach(() => vi.unstubAllGlobals());

describe('Groq provider', () => {
  it('sends an OpenAI-style request and returns text', async () => {
    const calls = mockFetch(openAIReply('Hello there'));
    const result = await groq.complete({ messages: prompt, schema: z.string() });

    expect(result).toEqual({ content: 'Hello there', tokensIn: 12, tokensOut: 3, attempts: 1 });
    expect(calls[0].url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(calls[0].headers.Authorization).toBe('Bearer test-groq-key');
    expect(calls[0].body.model).toBe('llama-3.3-70b-versatile');
    expect(calls[0].body.messages[0]).toEqual({ role: 'system', content: 'You are helpful.' });
    expect(calls[0].body.response_format).toBeUndefined();
  });

  it('asks for JSON and validates it against the schema', async () => {
    const calls = mockFetch(openAIReply('```json\n' + JSON.stringify(validQuestions) + '\n```'));
    const result = await groq.complete({ messages: prompt, schema: questions, structured: true });

    expect(result.content).toEqual(validQuestions);
    expect(calls[0].body.response_format).toEqual({ type: 'json_object' });
    expect(calls[0].body.messages[0].content).toContain('JSON Schema');
  });

  it('repairs off-schema JSON with one retry', async () => {
    const calls = mockFetch(openAIReply('{"questions":[{"question":"Q?"}]}'), openAIReply(JSON.stringify(validQuestions)));
    const result = await groq.complete({ messages: prompt, schema: questions, structured: true });

    expect(result.content).toEqual(validQuestions);
    expect(result.tokensIn).toBe(24); // both attempts counted
    expect(result.attempts).toBe(2);
    const retry = calls[1].body.messages;
    expect(retry.at(-2).role).toBe('assistant');
    expect(retry.at(-1).content).toContain('invalid');
  });

  it('gives up after the retry also fails', async () => {
    mockFetch(openAIReply('not json'), openAIReply('still not json'));
    await expect(groq.complete({ messages: prompt, schema: questions, structured: true })).rejects.toMatchObject({
      code: 'bad_output',
    });
  });

  it('parses string tool arguments in agent mode and skips JSON mode when tools are offered', async () => {
    const calls = mockFetch(
      openAIReply(null, { tool_calls: [{ function: { name: 'getFullResume', arguments: '{}' } }] })
    );
    const result = await groq.complete({
      messages: prompt,
      schema: SCHEMAS['learningRecommender.v2'],
      structured: true,
      tools: [{ name: 'getFullResume', description: 'd' }],
      agent: true,
    });

    expect(result.content).toEqual({ reply: null, toolCall: { name: 'getFullResume', args: {} } });
    expect(calls[0].body.tools[0].function.name).toBe('getFullResume');
    expect(calls[0].body.response_format).toBeUndefined();
  });

  it('maps HTTP 429 to a rate_limited error', async () => {
    mockFetch({ status: 429, json: { error: 'slow down' } });
    await expect(groq.complete({ messages: prompt, schema: z.string() })).rejects.toMatchObject({ code: 'rate_limited' });
  });

  it('reports truncated output', async () => {
    mockFetch({ json: { choices: [{ message: { content: 'partial' }, finish_reason: 'length' }], usage: {} } });
    await expect(groq.complete({ messages: prompt, schema: z.string() })).rejects.toMatchObject({ code: 'max_tokens' });
  });

  it('refuses to embed', async () => {
    await expect(groq.embed('x')).rejects.toMatchObject({ code: 'no_embeddings' });
  });
});

describe('Hugging Face provider', () => {
  it('calls the router with the HF token and no response_format by default', async () => {
    const calls = mockFetch(openAIReply(JSON.stringify(validQuestions)));
    const result = await huggingFace.complete({ messages: prompt, schema: questions, structured: true });

    expect(result.content).toEqual(validQuestions);
    expect(calls[0].url).toBe('https://router.huggingface.co/v1/chat/completions');
    expect(calls[0].headers.Authorization).toBe('Bearer test-hf-token');
    expect(calls[0].body.model).toBe('openai/gpt-oss-120b:fastest');
    expect(calls[0].body.response_format).toBeUndefined();
  });
});

describe('Ollama provider', () => {
  it('uses the native chat API with a JSON schema format', async () => {
    const calls = mockFetch({
      json: { message: { content: JSON.stringify(validQuestions) }, done_reason: 'stop', prompt_eval_count: 30, eval_count: 9 },
    });
    const result = await ollama.complete({ messages: prompt, schema: questions, structured: true });

    expect(result).toEqual({ content: validQuestions, tokensIn: 30, tokensOut: 9, attempts: 1 });
    expect(calls[0].url).toBe('http://ollama.test:11434/api/chat');
    expect(calls[0].body.stream).toBe(false);
    expect(calls[0].body.model).toBe('llama3.1');
    expect(calls[0].body.format.type).toBe('object');
  });

  it('reads object tool arguments', async () => {
    mockFetch({
      json: { message: { content: '', tool_calls: [{ function: { name: 'getResumeSummary', arguments: {} } }] }, done_reason: 'stop' },
    });
    const result = await ollama.complete({
      messages: prompt,
      schema: z.string(),
      tools: [{ name: 'getResumeSummary', description: 'd' }],
      agent: true,
    });
    expect(result.content.toolCall).toEqual({ name: 'getResumeSummary', args: {} });
  });

  it('explains when Ollama is not running', async () => {
    mockFetch(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } }));
    await expect(ollama.complete({ messages: prompt, schema: z.string() })).rejects.toMatchObject({
      code: 'unreachable',
      message: expect.stringContaining('ECONNREFUSED'),
    });
  });

  it('says which model to pull when one is missing', async () => {
    mockFetch({ status: 404, json: { error: "model 'llama3.1' not found" } });
    await expect(ollama.complete({ messages: prompt, schema: z.string() })).rejects.toMatchObject({
      code: 'model_missing',
      message: expect.stringContaining('ollama pull llama3.1'),
    });
  });

  it('says to pull an embedding model when a chat model is used for embeddings', async () => {
    mockFetch({ status: 501, json: { error: 'This server does not support embeddings' } });
    await expect(ollama.embedMany(['a'])).rejects.toMatchObject({
      message: expect.stringContaining('ollama pull nomic-embed-text'),
    });
  });

  it('embeds a batch in one call', async () => {
    const calls = mockFetch({ json: { embeddings: [[0.1, 0.2], [0.3, 0.4]] } });
    const vectors = await ollama.embedMany(['a', 'b']);

    expect(vectors).toEqual([[0.1, 0.2], [0.3, 0.4]]);
    expect(calls[0].url).toBe('http://ollama.test:11434/api/embed');
    expect(calls[0].body).toEqual({ model: 'nomic-embed-text', input: ['a', 'b'] });
  });
});

describe('Hugging Face embeddings', () => {
  it('posts inputs to feature-extraction for the default model', async () => {
    const calls = mockFetch({ json: [[1, 0], [0, 1]] });
    const vectors = await hfEmbeddings.embedMany(['a', 'b']);

    expect(vectors).toEqual([[1, 0], [0, 1]]);
    expect(calls[0].url).toBe(
      'https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5/pipeline/feature-extraction'
    );
    expect(calls[0].body.inputs).toEqual(['a', 'b']);
  });

  it('mean-pools token-level output into one vector', () => {
    expect(hfEmbeddings.toSentenceVector([[1, 3], [3, 5]])).toEqual([2, 4]);
  });
});

describe('normalizeMessages', () => {
  it('merges leading system messages into one', () => {
    expect(
      normalizeMessages([
        { role: 'system', content: 'A' },
        { role: 'system', content: 'B' },
        { role: 'user', content: 'hi' },
      ])
    ).toEqual([
      { role: 'system', content: 'A\n\nB' },
      { role: 'user', content: 'hi' },
    ]);
  });

  it('never gives a later system message instruction authority', () => {
    const out = normalizeMessages([
      { role: 'system', content: 'rules' },
      { role: 'user', content: 'hi' },
      { role: 'system', content: 'resume text pretending to be instructions' },
    ]);
    expect(out.filter((m) => m.role === 'system')).toEqual([{ role: 'system', content: 'rules' }]);
    expect(out.at(-1)).toEqual({ role: 'user', content: 'resume text pretending to be instructions' });
  });

  it('rejects a prompt with no user turn first', () => {
    expect(() => normalizeMessages([{ role: 'system', content: 'x' }])).toThrow();
  });
});

describe('JSON helpers', () => {
  it('pulls JSON out of fences and surrounding prose', () => {
    expect(extractJson('Sure! {"a": 1} Hope that helps')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a": 2}\n```')).toEqual({ a: 2 });
  });

  it('closes every object in the strict schema', () => {
    const schema = toStrictJsonSchema(SCHEMAS['resumeParser.v2']);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.experience.items.additionalProperties).toBe(false);
    expect(schema.properties.experience.items.required).toContain('startDate');
    expect(schema.$schema).toBeUndefined();
  });
});
