// One error type for every real provider, so callers (and logs) can tell
// "the model declined / produced junk / the server was down" apart by `code`
// no matter which provider is configured.
class AiProviderError extends Error {
  constructor(message, { code, details } = {}) {
    super(message);
    this.name = 'AiProviderError';
    this.code = code;
    this.details = details;
  }
}

module.exports = { AiProviderError };
