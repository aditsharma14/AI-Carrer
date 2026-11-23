// config/env.js crashes on boot without these — give tests harmless values.
// AI stays on the stub so no test can ever reach a paid API.
process.env.MONGODB_URI ||= 'mongodb://localhost:27017/test';
process.env.JWT_ACCESS_SECRET ||= 'test-access';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh';
process.env.AI_PROVIDER = 'stub';
process.env.EMBEDDING_PROVIDER = 'stub';
// Fake credentials so provider tests get past key checks; those tests stub
// global fetch, so nothing is ever sent anywhere.
process.env.GROQ_API_KEY = 'test-groq-key';
process.env.HF_TOKEN = 'test-hf-token';
process.env.OLLAMA_BASE_URL = 'http://ollama.test:11434';
