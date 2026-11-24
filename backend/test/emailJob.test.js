import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const processEmailJob = require('../src/queue/processors/email.processor');
const { UnrecoverableError } = require('bullmq');

const message = { to: 'jane.doe@example.com', subject: 'Hello', text: 'Body text' };

describe('email job', () => {
  it('rejects an invalid payload without retrying', async () => {
    for (const data of [
      { ...message, to: 'not-an-email' },
      { ...message, subject: 'Hi\r\nBcc: x@y.z' },
      { ...message, text: '' },
      {},
    ]) {
      await expect(processEmailJob({ data })).rejects.toBeInstanceOf(UnrecoverableError);
    }
  });

  it('sends a valid payload', async () => {
    const result = await processEmailJob({ data: message }); // log mode by default
    expect(result).toEqual({ delivered: false });
  });
});
