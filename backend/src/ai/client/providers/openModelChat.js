const { z } = require('zod');
const { AiProviderError } = require('./errors');

// Shared logic for open-model chat providers (Groq, Hugging Face, Ollama).
// Each provider only implements `send()` — one HTTP call in its own wire
// format — and this file handles everything that must behave identically
// across them:
//   - our prompt format -> plain chat messages
//   - asking for JSON and VALIDATING it against the prompt's zod schema
//   - one repair retry when the model returns malformed or off-schema JSON
//   - the { reply, toolCall } envelope agents expect
//
// Why validate + retry instead of trusting constrained decoding: support
// for JSON-schema output differs per provider and per model (Groq only on a
// few models, HF depends on the routed provider, Ollama on the model).
// Validation makes the contract hold everywhere; constrained decoding, where
// available, just makes the retry rarer.

const MAX_JSON_ATTEMPTS = 2;

// Leading system messages are instructions; any later role:'system' entry
// is treated as data and sent as user content, so resume text can never
// gain instruction authority.
function normalizeMessages(messages) {
  const system = [];
  const out = [];

  for (const message of messages) {
    if (message.role === 'system' && out.length === 0) {
      system.push(message.content);
      continue;
    }
    const role = message.role === 'assistant' ? 'assistant' : 'user';
    out.push({ role, content: String(message.content ?? '') });
  }

  if (out.length === 0 || out[0].role !== 'user') {
    throw new AiProviderError('Prompt must contain a user message before any assistant turn', { code: 'bad_prompt' });
  }

  return system.length ? [{ role: 'system', content: system.join('\n\n') }, ...out] : out;
}

// JSON Schema for a zod schema, tightened for strict constrained decoding:
// every object closed (additionalProperties:false) with all keys required.
function toStrictJsonSchema(schema) {
  const json = z.toJSONSchema(schema);
  delete json.$schema;

  const tighten = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'object' && node.properties) {
      node.additionalProperties = false;
      node.required = Object.keys(node.properties);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(tighten);
      else if (typeof value === 'object') tighten(value);
    }
  };
  tighten(json);
  return json;
}

function jsonInstruction(jsonSchema) {
  return (
    'Respond with ONLY a single JSON object — no prose, no markdown code fences — that matches this JSON Schema:\n' +
    JSON.stringify(jsonSchema)
  );
}

function withJsonInstruction(messages, instruction) {
  if (messages[0]?.role === 'system') {
    return [{ role: 'system', content: `${messages[0].content}\n\n${instruction}` }, ...messages.slice(1)];
  }
  return [{ role: 'system', content: instruction }, ...messages];
}

// Models often wrap JSON in ```json fences or add a sentence around it.
function extractJson(text) {
  const trimmed = (text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new Error('response was not JSON');
  }
}

// Argument-free tools (every agent tool here is a repository read).
function toFunctionTools(tools) {
  return tools.map(({ name, description }) => ({
    type: 'function',
    function: { name, description, parameters: { type: 'object', properties: {}, required: [] } },
  }));
}

// send({ messages, tools, jsonSchema }) must resolve to
//   { text, toolCall: { name, args } | null, finishReason: 'stop' | 'length' | ..., tokensIn, tokensOut }
// jsonSchema is set only when JSON output is wanted AND no tools are offered
// (most providers can't combine constrained output with tool calling).
async function runChat({ send, messages, schema, structured = false, tools = [], agent = false }) {
  let chatMessages = normalizeMessages(messages);
  const jsonSchema = structured ? toStrictJsonSchema(schema) : null;
  if (structured) chatMessages = withJsonInstruction(chatMessages, jsonInstruction(jsonSchema));

  const functionTools = toFunctionTools(tools);
  let tokensIn = 0;
  let tokensOut = 0;

  for (let attempt = 1; attempt <= MAX_JSON_ATTEMPTS; attempt++) {
    const result = await send({
      messages: chatMessages,
      tools: functionTools,
      jsonSchema: structured && functionTools.length === 0 ? jsonSchema : null,
    });
    tokensIn += result.tokensIn || 0;
    tokensOut += result.tokensOut || 0;

    if (result.toolCall && agent) {
      return { content: { reply: null, toolCall: result.toolCall }, tokensIn, tokensOut };
    }
    if (result.finishReason === 'length') {
      throw new AiProviderError('Model output was cut off at the max token limit', { code: 'max_tokens' });
    }

    const text = (result.text || '').trim();

    if (!structured) {
      if (!text) throw new AiProviderError('Model returned an empty response', { code: 'bad_output' });
      return { content: agent ? { reply: text, toolCall: null } : text, tokensIn, tokensOut };
    }

    let problem;
    try {
      const parsed = schema.safeParse(extractJson(text));
      if (parsed.success) {
        return { content: agent ? { reply: parsed.data, toolCall: null } : parsed.data, tokensIn, tokensOut };
      }
      problem = parsed.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ');
    } catch (err) {
      problem = err.message;
    }

    if (attempt === MAX_JSON_ATTEMPTS) {
      throw new AiProviderError(`Model output did not match the expected JSON shape: ${problem}`, { code: 'bad_output' });
    }

    // Repair turn: show the model its own output and what was wrong with it.
    chatMessages = [
      ...chatMessages,
      { role: 'assistant', content: text || '(empty)' },
      { role: 'user', content: `That response was invalid (${problem}). Reply with ONLY the corrected JSON object.` },
    ];
  }

  throw new AiProviderError('unreachable', { code: 'bad_output' });
}

// fetch with a timeout and a readable error for non-2xx responses.
async function postJson(url, { headers = {}, body, timeoutMs, providerName }) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new AiProviderError(`${providerName} did not respond within ${timeoutMs}ms`, { code: 'timeout' });
    }
    throw new AiProviderError(`Could not reach ${providerName} at ${url}: ${err.cause?.code || err.message}`, {
      code: 'unreachable',
    });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new AiProviderError(`${providerName} request failed with HTTP ${response.status}`, {
      code: response.status === 429 ? 'rate_limited' : response.status === 401 || response.status === 403 ? 'auth' : 'http_error',
      details: detail.slice(0, 500),
    });
    error.status = response.status;
    throw error;
  }

  return response.json();
}

module.exports = {
  runChat,
  postJson,
  normalizeMessages,
  toStrictJsonSchema,
  extractJson,
  toFunctionTools,
};
