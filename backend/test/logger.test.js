import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const logger = require('../src/config/logger');

describe('LOG_LEVEL', () => {
  let out;
  let err;
  const original = process.env.LOG_LEVEL;

  beforeEach(() => {
    out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    if (original === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = original;
  });

  const logAll = () => {
    logger.error('e');
    logger.warn('w');
    logger.info('i');
    logger.debug('d');
  };

  it('prints everything by default', () => {
    delete process.env.LOG_LEVEL;
    logAll();
    expect(err).toHaveBeenCalledTimes(1);
    expect(out).toHaveBeenCalledTimes(3);
  });

  it('hides less severe levels', () => {
    process.env.LOG_LEVEL = 'warn';
    logAll();
    expect(err).toHaveBeenCalledTimes(1); // error
    expect(out).toHaveBeenCalledTimes(1); // warn only
  });

  it('error level leaves only errors, and an unknown value falls back to everything', () => {
    process.env.LOG_LEVEL = 'error';
    logAll();
    expect(err).toHaveBeenCalledTimes(1);
    expect(out).not.toHaveBeenCalled();

    out.mockClear();
    err.mockClear();
    process.env.LOG_LEVEL = 'nonsense';
    logAll();
    expect(out).toHaveBeenCalledTimes(3);
  });
});
