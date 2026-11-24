// Email content. Everything interpolated into HTML goes through escapeHtml:
// an organization name or a person's name is typed by a user, and without
// escaping it a name like `<img src=x onerror=...>` would be injected into an
// email sent from OUR address, which is a phishing vector.
const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Header values must never contain line breaks (header injection).
const oneLine = (value) => String(value).replace(/[\r\n]+/g, ' ').trim();

const ROLE_LABELS = {
  org_admin: 'an administrator',
  recruiter: 'a recruiter',
  hiring_manager: 'a hiring manager',
  interviewer: 'an interviewer',
  seeker: 'a candidate',
};
const roleLabel = (role) => ROLE_LABELS[role] || `a ${String(role).replace(/_/g, ' ')}`;

function orgInvite({ inviterName, orgName, role, loginUrl }) {
  const who = oneLine(inviterName || 'A colleague');
  const org = oneLine(orgName || 'an organization');
  const as = roleLabel(role);

  return {
    subject: oneLine(`${who} invited you to join ${org}`),
    text:
      `${who} invited you to join ${org} as ${as}.\n\n` +
      `Sign in to review and accept the invitation:\n${loginUrl}\n\n` +
      'If you were not expecting this, you can ignore this email.',
    html:
      `<p><strong>${escapeHtml(who)}</strong> invited you to join <strong>${escapeHtml(org)}</strong> as ${escapeHtml(as)}.</p>` +
      `<p><a href="${escapeHtml(loginUrl)}">Sign in to review and accept the invitation</a></p>` +
      '<p style="color:#666">If you were not expecting this, you can ignore this email.</p>',
  };
}

module.exports = { orgInvite, escapeHtml };
