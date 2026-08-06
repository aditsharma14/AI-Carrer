// Mirrors the active org id outside React so axiosClient's request
// interceptor can attach X-Org-Id without importing OrgContext (which would
// pull React into a plain HTTP module). OrgContext is the source of truth and
// keeps this in sync; nothing else should call setActiveOrgId directly.
let activeOrgId = null;

export function getActiveOrgId() {
  return activeOrgId;
}

export function setActiveOrgId(orgId) {
  activeOrgId = orgId;
}
