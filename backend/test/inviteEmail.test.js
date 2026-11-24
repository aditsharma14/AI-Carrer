import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const env = require('../src/config/env');
const { sendInviteEmail } = require('../src/modules/identity/inviteEmail');

afterEach(() => vi.restoreAllMocks());

describe('invite email helper', () => {
  it('queues the rendered invitation', async () => {
    const enqueue = vi.fn();
    const ok = await sendInviteEmail({ to: 'a@b.co', inviterName: 'Asha', orgName: 'Acme', role: 'recruiter' }, { enqueue });
    expect(ok).toBe(true);
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.co', subject: 'Asha invited you to join Acme' }));
    expect(enqueue.mock.calls[0][0].text).toContain(`${env.clientOrigin}/login`);
  });

  it('never throws when the queue is down', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const enqueue = vi.fn().mockRejectedValue(new Error('redis down'));
    await expect(sendInviteEmail({ to: 'a@b.co', role: 'recruiter' }, { enqueue })).resolves.toBe(false);
  });
});
