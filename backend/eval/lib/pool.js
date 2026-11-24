// Runs fn over items with at most `concurrency` in flight; results keep order.
// Free-tier APIs rate-limit, so the default everywhere is 1.
async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return results;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retries only rate limiting (HTTP 429), with exponential backoff. Every other
// error is a real result (a failed parse is data the evaluation must count),
// so it is thrown straight back.
async function withRetry(fn, { tries = 5, baseMs = 2000 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.code !== 'rate_limited' || attempt >= tries) throw err;
      await sleep(baseMs * 2 ** (attempt - 1));
    }
  }
}

module.exports = { mapPool, withRetry };
