import type { Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServerSentEvent } from '../src/create-server-sent-event';

type MockResponse = Response & {
  setHeaderCalls: [string, string][];
  writeCalls: [string, string][];
  endCalls: unknown[][];
  flushHeaders: ReturnType<typeof vi.fn>;
  flush: ReturnType<typeof vi.fn>;
  closed: boolean;
};

function createMockResponse(): MockResponse {
  const setHeaderCalls: [string, string][] = [];
  const writeCalls: [string, string][] = [];
  const endCalls: unknown[][] = [];

  const res: MockResponse = {
    setHeader(name: string, value: string) {
      setHeaderCalls.push([name, value]);
    },
    write(chunk: string, encoding: string) {
      writeCalls.push([chunk, encoding]);
      return true;
    },
    end(...args: unknown[]) {
      endCalls.push(args);
    },
    flushHeaders: vi.fn(),
    flush: vi.fn(),
    closed: false,
  } as unknown as MockResponse;

  res.setHeaderCalls = setHeaderCalls;
  res.writeCalls = writeCalls;
  res.endCalls = endCalls;

  return res;
}

describe('createServerSentEvent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sets SSE headers on the response', () => {
    const res = createMockResponse();
    createServerSentEvent(res);

    expect(res.setHeaderCalls).toEqual([
      ['Content-Type', 'text/event-stream'],
      ['Cache-Control', 'no-cache'],
      ['Connection', 'keep-alive'],
      ['X-Accel-Buffering', 'no'],
    ]);
  });

  it('calls flushHeaders when present', () => {
    const res = createMockResponse();
    createServerSentEvent(res);

    expect(res.flushHeaders).toHaveBeenCalledTimes(1);
  });

  it('returns an object with push, pushComment, close, and closed', () => {
    const res = createMockResponse();
    const sse = createServerSentEvent(res);

    expect(sse).toHaveProperty('push', expect.any(Function));
    expect(sse).toHaveProperty('pushComment', expect.any(Function));
    expect(sse).toHaveProperty('close', expect.any(Function));
    expect(sse).toHaveProperty('closed');
  });

  describe('push', () => {
    it('writes the chunk with utf8 encoding', () => {
      const res = createMockResponse();
      const sse = createServerSentEvent(res);

      sse.push('data: hello\n\n');

      expect(res.writeCalls).toEqual([['data: hello\n\n', 'utf8']]);
    });

    it('calls flush when present', () => {
      const res = createMockResponse();
      const sse = createServerSentEvent(res);

      sse.push('data: x\n\n');

      expect(res.flush).toHaveBeenCalledTimes(1);
    });
  });

  describe('pushComment', () => {
    it('formats a single-line comment with ": " prefix and \\n\\n suffix', () => {
      const res = createMockResponse();
      const sse = createServerSentEvent(res);

      sse.pushComment('heartbeat');

      expect(res.writeCalls).toEqual([[': heartbeat\n\n', 'utf8']]);
    });

    it('formats empty string as bare ":\\n\\n"', () => {
      const res = createMockResponse();
      const sse = createServerSentEvent(res);

      sse.pushComment('');

      expect(res.writeCalls).toEqual([[':\n\n', 'utf8']]);
    });

    it('prefixes each line with ": " when chunk contains newlines', () => {
      const res = createMockResponse();
      const sse = createServerSentEvent(res);

      sse.pushComment('line1\nline2');

      expect(res.writeCalls).toEqual([[': line1\n: line2\n\n', 'utf8']]);
    });
  });

  describe('close', () => {
    it('calls res.end', () => {
      const res = createMockResponse();
      const sse = createServerSentEvent(res);

      sse.close();

      expect(res.endCalls).toEqual([[]]);
    });
  });

  it('exposes res.closed as closed', () => {
    const res = createMockResponse();
    res.closed = true;

    const sse = createServerSentEvent(res);

    expect(sse.closed).toBe(true);
  });
});
