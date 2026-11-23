const aiClient = require('../client/aiClient');

// Every agent (Career Coach, Hiring, Interview, Learning) shares this one
// loop instead of a multi-agent framework — see docs/ARCHITECTURE.md §7.2.
// The tools an agent calls here are functions we already wrote and trust
// (getResumeSummary, getLatestSkillGap...), not arbitrary external APIs
// needing sandboxing, so this ~20-line loop is the right amount of machinery.
const MAX_TOOL_ROUNDS = 3;

// buildMessages(toolResult): (toolResult | null) => messages[]
// tools: { [toolName]: { description: string, handler: async (args) => result } }
// mock: () => { reply, toolCall: null } | { toolCall: { name, args } }   (stub mode only)
//
// Each round rebuilds the prompt with the latest tool result folded in as
// data (see the prompt builders' <tool_result> blocks) rather than replaying
// a tool_use/tool_result transcript — every tool here is a single cheap read,
// so one result is all the context the next round needs.
async function runAgentStep({ promptVersion, buildMessages, tools = {}, mock }) {
  let lastToolResult = null;
  const toolDefs = Object.entries(tools).map(([name, { description }]) => ({ name, description }));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await aiClient.complete({
      promptVersion,
      messages: buildMessages(lastToolResult),
      mock: () => mock(lastToolResult),
      // Once a tool has answered, stop offering tools: the model should
      // answer from the result, not call the same read again.
      tools: lastToolResult ? [] : toolDefs,
      agent: true,
    });

    if (!response.toolCall) {
      return { reply: response.reply, roundsUsed: round + 1 };
    }

    const tool = tools[response.toolCall.name];
    if (!tool) {
      return { reply: "I tried to use a tool that isn't available right now.", roundsUsed: round + 1 };
    }

    lastToolResult = await tool.handler(response.toolCall.args).catch((err) => ({ error: err.message }));
  }

  // Hard cap hit: force-terminate with whatever we have rather than loop forever.
  return { reply: "I'm having trouble completing this right now — please try again.", roundsUsed: MAX_TOOL_ROUNDS };
}

module.exports = { runAgentStep, MAX_TOOL_ROUNDS };
