const env = require('../../../config/env');
const { runChat, postJson } = require('./openModelChat');

// Ollama — models running locally (or on your own server). No API key, no
// per-token cost, data never leaves the machine. Uses Ollama's native API
// rather than its OpenAI shim because native `format` accepts a full JSON
// schema (constrained decoding) on every model.
//
// Setup:  ollama pull llama3.1 && ollama pull nomic-embed-text
// Models must be pulled before use; a missing model returns HTTP 404.
const NAME = 'Ollama';

// Turn Ollama's two most common setup errors into an exact fix.
//   404 — the model was never pulled
//   501 — a chat-only model was used for embeddings
async function withSetupHints(model, kind, request) {
  try {
    return await request();
  } catch (err) {
    if (err.status === 404) {
      err.message = `Ollama model '${model}' is not installed — run: ollama pull ${model}`;
      err.code = 'model_missing';
    } else if (err.status === 501 && kind === 'embed') {
      err.message = `Ollama model '${model}' can't produce embeddings — run: ollama pull nomic-embed-text (and set EMBEDDING_MODEL=nomic-embed-text)`;
      err.code = 'model_missing';
    }
    throw err;
  }
}

async function send({ messages, tools, jsonSchema }) {
  const body = {
    model: env.ai.modelFor('ollama'),
    messages,
    stream: false,
    options: { num_predict: env.ai.maxTokens, temperature: 0.2 },
  };
  if (tools.length) body.tools = tools;
  if (jsonSchema) body.format = jsonSchema;

  const json = await withSetupHints(body.model, 'chat', () =>
    postJson(`${env.ai.ollama.baseUrl}/api/chat`, { body, timeoutMs: env.ai.timeoutMs, providerName: NAME })
  );

  const call = json.message?.tool_calls?.[0];
  return {
    text: json.message?.content ?? '',
    // Ollama tool arguments are already an object (not a JSON string).
    toolCall: call ? { name: call.function.name, args: call.function.arguments || {} } : null,
    finishReason: json.done_reason,
    tokensIn: json.prompt_eval_count ?? 0,
    tokensOut: json.eval_count ?? 0,
  };
}

async function complete(options) {
  return runChat({ send, ...options });
}

// /api/embed takes a string or an array and returns { embeddings: [[...]] }.
const MAX_BATCH = 64;

async function embedMany(texts) {
  const model = env.ai.embeddingModelFor('ollama');
  const vectors = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const json = await withSetupHints(model, 'embed', () =>
      postJson(`${env.ai.ollama.baseUrl}/api/embed`, {
        body: { model, input: texts.slice(i, i + MAX_BATCH) },
        timeoutMs: env.ai.timeoutMs,
        providerName: NAME,
      })
    );
    vectors.push(...json.embeddings);
  }
  return vectors;
}

async function embed(text) {
  const [vector] = await embedMany([text]);
  return vector;
}

module.exports = { complete, embed, embedMany, send };
