import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import nodemailer from 'nodemailer';

const require = createRequire(import.meta.url);
const env = require('../src/config/env');
const { sendEmail, maskEmail } = require('../src/lib/mailer');
const { orgInvite, escapeHtml } = require('../src/lib/emailTemplates');

afterEach(() => vi.restoreAllMocks());

const message = { to: 'jane.doe@example.com', subject: 'Hello', text: 'Body text' };

describe('mailer', () => {
  it('masks the recipient', () => {
    expect(maskEmail('jane.doe@example.com')).toBe('j***@example.com');
  });

  it('in log mode sends nothing and logs neither the address nor the body', async () => {
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const result = await sendEmail({ ...message, text: 'secret-link-123' }, { transport: null });
    const logged = out.mock.calls.map((c) => c[0]).join('');
    expect(result).toEqual({ delivered: false });
    expect(logged).toContain('j***@example.com');
    expect(logged).not.toContain('jane.doe');
    expect(logged).not.toContain('secret-link-123');
  });

  it('hands the message to the transport with the configured sender', async () => {
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const result = await sendEmail({ ...message, html: '<p>Hi</p>' }, { transport });
    expect(result.delivered).toBe(true);
    const sent = JSON.parse((await transport.sendMail({ from: env.email.from, ...message })).message);
    expect(sent.to).toEqual([{ address: 'jane.doe@example.com', name: '' }]);
    expect(sent.subject).toBe('Hello');
  });
});

describe('invite template', () => {
  const base = { inviterName: 'Asha', orgName: 'Acme Corp', role: 'recruiter', loginUrl: 'https://app.example.com/login' };

  it('writes a plain-text and an HTML version', () => {
    const mail = orgInvite(base);
    expect(mail.subject).toBe('Asha invited you to join Acme Corp');
    expect(mail.text).toContain('as a recruiter');
    expect(mail.text).toContain('https://app.example.com/login');
    expect(mail.html).toContain('<a href="https://app.example.com/login">');
  });

  it('escapes user-controlled names so they cannot inject markup into mail sent from our address', () => {
    const mail = orgInvite({ ...base, orgName: '<img src=x onerror=alert(1)>', inviterName: '"><script>x</script>' });
    expect(mail.html).not.toContain('<img');
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(escapeHtml(`a&b'"<>`)).toBe('a&amp;b&#39;&quot;&lt;&gt;');
  });

  it('keeps line breaks out of the subject (header injection)', () => {
    const mail = orgInvite({ ...base, orgName: 'Acme\r\nBcc: attacker@evil.test' });
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });

  it('labels every membership role sensibly', () => {
    for (const role of ['org_admin', 'recruiter', 'hiring_manager', 'interviewer', 'seeker']) {
      expect(orgInvite({ ...base, role }).text).not.toMatch(/as a (interviewer|org_admin)/);
    }
    expect(orgInvite({ ...base, role: 'interviewer' }).text).toContain('as an interviewer');
  });
});
