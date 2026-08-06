// Access token lives in memory only (never localStorage) — see
// docs/ARCHITECTURE.md §11.1: an XSS payload reading localStorage needs no
// further exploit, while an in-memory value requires the script to run while
// it's still in scope. The refresh token is an httpOnly cookie the JS layer
// never touches at all.
let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}
