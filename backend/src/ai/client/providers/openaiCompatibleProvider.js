const { runChat, postJson } = require('./openModelChat');
const { AiProviderError } = require('./errors');

// Groq and the Hugging Face router both speak the OpenAI chat-completions
// wire format, so one implementation serves both. getConfig() is read on
// every call (not at require time) so tests and env changes take effect.
//
// getConfig() => { name, baseUrl, apiKey, model, maxTokens, timeoutMs, jsonMode }
//   jsonMode: 'json_schema' — constrained decoding (only some models support it)
//             'json_object' — "valid JSON" mode; shape enforced by validation
//             'none'        — prompt instruction + validation only (works everywhere)
function createOpenAICompatibleProvider(getConfig) {
  async function send({ messages, tools, jsonSchema }) {
    const config = getConfig();
    if (!config.apiKey) {
      throw new AiProviderError(`${config.name} needs an API key — set ${config.keyEnvVar}`, { code: 'auth' });
    }

    const body = {
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      // Low temperature: these are extraction / grading / explanation tasks,
      // where run-to-run consistency matters more than creativity.
      temperature: 0.2,
    };
    if (tools.length) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }
    if (jsonSchema && config.jsonMode === 'json_schema') {
      body.response_format = { type: 'json_schema', json_schema: { name: 'output', strict: true, schema: jsonSchema } };
    } else if (jsonSchema && config.jsonMode === 'json_object') {
      body.response_format = { type: 'json_object' };
    }

    const json = await postJson(`${config.baseUrl}/chat/completions`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body,
      timeoutMs: config.timeoutMs,
      providerName: config.name,
    });

    const choice = json.choices?.[0];
    if (!choice) throw new AiProviderError(`${config.name} returned no choices`, { code: 'bad_output' });

    const call = choice.message?.tool_calls?.[0];
    let toolCall = null;
    if (call) {
      // OpenAI-format tool arguments are a JSON *string*.
      let args = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }
      toolCall = { name: call.function.name, args };
    }

    return {
      text: choice.message?.content ?? '',
      toolCall,
      finishReason: choice.finish_reason,
      tokensIn: json.usage?.prompt_tokens ?? 0,
      tokensOut: json.usage?.completion_tokens ?? 0,
    };
  }

  return {
    complete: (options) => runChat({ send, ...options }),
    send,
  };
}

module.exports = { createOpenAICompatibleProvider };
