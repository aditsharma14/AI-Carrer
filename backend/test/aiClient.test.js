import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const aiClient = require('../src/ai/client/aiClient');
const { runAgentStep } = require('../src/ai/agents/agentOrchestrator');

describe('aiClient.complete (stub provider)', () => {
  it('returns mock output that matches the schema', async () => {
    const out = await aiClient.complete({
      promptVersion: 'interviewGenerator.v1',
      messages: [],
      mock: () => ({ questions: [{ question: 'q', rationale: 'r' }] }),
    });
    expect(out.questions).toHaveLength(1);
  });

  it('rejects a mock that drifts from the schema', async () => {
    await expect(
      aiClient.complete({
        promptVersion: 'resumeReviewer.v1',
        messages: [],
        mock: () => [{ section: 'x' }], // old bare-array shape
      })
    ).rejects.toBeInstanceOf(aiClient.AiOutputError);
  });

  it('treats prompts without a schema as text', async () => {
    const out = await aiClient.complete({ promptVersion: 'atsScorer.v1', messages: [], mock: () => 'fine' });
    expect(out).toBe('fine');
  });
});

describe('runAgentStep', () => {
  it('runs a tool, then answers from its result', async () => {
    let handlerCalls = 0;
    const { reply, roundsUsed } = await runAgentStep({
      promptVersion: 'careerCoach.v2',
      buildMessages: () => [],
      tools: {
        getLatestSkillGap: {
          description: 'd',
          handler: async () => {
            handlerCalls++;
            return { gaps: ['docker'] };
          },
        },
      },
      mock: (toolResult) =>
        toolResult
          ? { reply: `learn ${toolResult.gaps[0]}`, toolCall: null }
          : { reply: null, toolCall: { name: 'getLatestSkillGap', args: {} } },
    });

    expect(handlerCalls).toBe(1);
    expect(reply).toBe('learn docker');
    expect(roundsUsed).toBe(2);
  });

  it('validates structured agent replies', async () => {
    await expect(
      runAgentStep({
        promptVersion: 'learningRecommender.v2',
        buildMessages: () => [],
        mock: () => ({ reply: { items: [{ skill: 'sql' }] }, toolCall: null }),
      })
    ).rejects.toBeInstanceOf(aiClient.AiOutputError);
  });
});

describe('aiClient usage stats', () => {
  it('counts calls and latencies, and resets', async () => {
    aiClient.resetStats();
    await aiClient.complete({ promptVersion: 'atsScorer.v1', messages: [], mock: () => 'ok' });
    await aiClient.complete({ promptVersion: 'atsScorer.v1', messages: [], mock: () => 'ok' });
    const stats = aiClient.getStats();
    expect(stats.calls).toBe(2);
    expect(stats.errors).toBe(0);
    expect(stats.latenciesMs).toHaveLength(2);

    aiClient.resetStats();
    expect(aiClient.getStats().calls).toBe(0);
  });

  it('counts schema failures as output errors', async () => {
    aiClient.resetStats();
    await expect(
      aiClient.complete({ promptVersion: 'resumeReviewer.v1', messages: [], mock: () => [{ bad: true }] })
    ).rejects.toBeInstanceOf(aiClient.AiOutputError);
    const stats = aiClient.getStats();
    expect(stats.errors).toBe(1);
    expect(stats.outputErrors).toBe(1);
  });
});
