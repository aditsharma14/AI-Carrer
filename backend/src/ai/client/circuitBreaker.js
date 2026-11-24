// A circuit breaker for one AI provider.
//
// Without it, a provider that is down makes EVERY request wait out its full
// timeout (up to AI_TIMEOUT_MS) before failing or falling back, so a provider
// outage becomes a latency outage for the whole product. The breaker notices
// the pattern and fails fast instead:
//
//   closed     normal. `threshold` consecutive outage failures open it.
//   open       every call is refused immediately, for `cooldownMs`.
//   half_open  after the cooldown ONE trial request is let through. Success
//              closes the breaker; failure re-opens it for another cooldown.
//
// Only outage-type failures count (unreachable, timeout, rate limit, bad key).
// A provider that answers with malformed JSON is reachable, so that is a
// success as far as the breaker is concerned.
class CircuitBreaker {
  constructor({ threshold = 5, cooldownMs = 30000, now = () => Date.now() } = {}) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
    this.now = now;
    this.state = 'closed';
    this.failures = 0;
    this.openedAt = 0;
    this.trialInFlight = false;
  }

  // May a request go to this provider right now?
  canRequest() {
    if (this.state === 'open') {
      if (this.now() - this.openedAt < this.cooldownMs) return false;
      this.state = 'half_open';
      this.trialInFlight = false;
    }
    if (this.state === 'half_open') {
      if (this.trialInFlight) return false; // one trial at a time
      this.trialInFlight = true;
    }
    return true;
  }

  recordSuccess() {
    this.state = 'closed';
    this.failures = 0;
    this.trialInFlight = false;
  }

  recordFailure() {
    this.trialInFlight = false;
    if (this.state === 'half_open') return this.open();
    this.failures += 1;
    if (this.failures >= this.threshold) this.open();
  }

  open() {
    this.state = 'open';
    this.openedAt = this.now();
  }

  snapshot() {
    return { state: this.state, consecutiveFailures: this.failures };
  }
}

module.exports = { CircuitBreaker };
