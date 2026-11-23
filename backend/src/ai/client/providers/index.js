const stubProvider = require('./stubProvider');

// Completions and embeddings are chosen independently (AI_PROVIDER and
// EMBEDDING_PROVIDER): Groq has no embeddings endpoint, so the standard
// setup is Groq for chat + Hugging Face for embeddings.
//
// Real providers are required lazily so the stub-only setup never loads
// code or needs credentials for providers it doesn't use.
const COMPLETION_PROVIDERS = {
  stub: () => stubProvider,
  groq: () => require('./groqProvider'),
  huggingface: () => require('./huggingFaceProvider'),
  ollama: () => require('./ollamaProvider'),
};

const EMBEDDING_PROVIDERS = {
  stub: () => stubProvider,
  huggingface: () => require('./huggingFaceEmbeddings'),
  ollama: () => require('./ollamaProvider'),
};

function resolve(registry, kind, providerName) {
  const load = registry[providerName];
  if (!load) {
    throw new Error(
      `${kind} provider '${providerName}' is not implemented. Available: ${Object.keys(registry).join(', ')}.`
    );
  }
  return load();
}

function getProvider(providerName) {
  return resolve(COMPLETION_PROVIDERS, 'AI', providerName);
}

function getEmbeddingProvider(providerName) {
  return resolve(EMBEDDING_PROVIDERS, 'Embedding', providerName);
}

module.exports = { getProvider, getEmbeddingProvider, COMPLETION_PROVIDERS, EMBEDDING_PROVIDERS };
