const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

// Sends one email. Two providers, chosen by EMAIL_PROVIDER:
//   log   (default) nothing leaves the process; the send is logged with the
//         recipient MASKED and without the body, so local development and tests
//         never email anyone and no link or token lands in a log
//   smtp  real delivery through any SMTP service (Resend, SES, Postmark,
//         Mailgun...) using SMTP_URL, e.g. smtps://user:pass@smtp.example.com:465
//
// Email bodies can carry sign-in or invite links, so they are never logged.
let cachedTransport = null;
function getTransport() {
  if (env.email.provider !== 'smtp') return null;
  if (!cachedTransport) {
    if (!env.email.smtpUrl) throw new Error('EMAIL_PROVIDER=smtp requires SMTP_URL');
    cachedTransport = nodemailer.createTransport(env.email.smtpUrl);
  }
  return cachedTransport;
}

// "jane.doe@example.com" -> "j***@example.com"
function maskEmail(address) {
  const [local = '', domain = ''] = String(address).split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

// `transport` is injectable so tests can capture the message instead of sending.
async function sendEmail({ to, subject, text, html }, { transport = getTransport() } = {}) {
  if (!transport) {
    logger.info('email (log mode, not sent)', { to: maskEmail(to), subject });
    return { delivered: false };
  }

  const info = await transport.sendMail({ from: env.email.from, to, subject, text, html });
  logger.info('email sent', { to: maskEmail(to), subject, messageId: info.messageId });
  return { delivered: true, messageId: info.messageId };
}

module.exports = { sendEmail, maskEmail };
