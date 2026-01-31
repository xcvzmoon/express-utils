import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { readValidatedParams } from '../src/read-validated-params';

function createMockRequest(params: Record<string, string>): Request {
  return { params } as Request;
}

describe('readValidatedParams', () => {
  const objectSchema = z.object({
    id: z.string(),
    slug: z.string(),
  });

  describe('default (throws on invalid)', () => {
    it('returns parsed data when params are valid', () => {
      const req = createMockRequest({ id: '123', slug: 'hello-world' });
      const result = readValidatedParams(req, objectSchema);
      expect(result).toEqual({ id: '123', slug: 'hello-world' });
    });

    it('throws Error when required param is missing', () => {
      const req = createMockRequest({ id: '1' });
      expect(() => readValidatedParams(req, objectSchema)).toThrow(Error);
    });

    it('throws with message from Zod error', () => {
      const req = createMockRequest({});
      expect(() => readValidatedParams(req, objectSchema)).toThrow();
      try {
        readValidatedParams(req, objectSchema);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeDefined();
      }
    });

    it('throws when params is empty and schema requires fields', () => {
      const req = createMockRequest({});
      expect(() => readValidatedParams(req, objectSchema)).toThrow();
    });

    it('works with options { safe: false }', () => {
      const req = createMockRequest({ id: '42', slug: 'foo' });
      const result = readValidatedParams(req, objectSchema, { safe: false });
      expect(result).toEqual({ id: '42', slug: 'foo' });
    });
  });

  describe('safe: true', () => {
    it('returns success result with data when params are valid', () => {
      const req = createMockRequest({ id: '28', slug: 'bar' });
      const result = readValidatedParams(req, objectSchema, { safe: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ id: '28', slug: 'bar' });
      }
    });

    it('returns failure result with error when params are invalid', () => {
      const req = createMockRequest({ id: '1' });
      const result = readValidatedParams(req, objectSchema, { safe: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.issues).toBeDefined();
      }
    });

    it('returns failure when required param is missing', () => {
      const req = createMockRequest({});
      const result = readValidatedParams(req, objectSchema, { safe: true });
      expect(result.success).toBe(false);
    });
  });

  describe('different schema types', () => {
    it('works with z.object({ id: z.string() }) schema', () => {
      const req = createMockRequest({ id: 'abc' });
      const result = readValidatedParams(req, z.object({ id: z.string() }));
      expect(result).toEqual({ id: 'abc' });
    });

    it('works with z.coerce.number() for numeric id', () => {
      const schema = z.object({ id: z.coerce.number() });
      const req = createMockRequest({ id: '42' });
      const result = readValidatedParams(req, schema);
      expect(result).toEqual({ id: 42 });
    });

    it('throws when coerce fails (non-numeric string)', () => {
      const schema = z.object({ id: z.coerce.number() });
      const req = createMockRequest({ id: 'abc' });
      expect(() => readValidatedParams(req, schema)).toThrow();
    });

    it('works with nested object schema', () => {
      const nestedSchema = z.object({
        userId: z.string(),
        postId: z.string(),
      });
      const req = createMockRequest({ userId: '1', postId: '2' });
      const result = readValidatedParams(req, nestedSchema);
      expect(result).toEqual({ userId: '1', postId: '2' });
    });

    it('accepts empty params when schema allows optional fields', () => {
      const schema = z.object({ id: z.string().optional() });
      const req = createMockRequest({});
      const result = readValidatedParams(req, schema);
      expect(result).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('accepts extra keys when schema does not strip', () => {
      const schema = z.object({ id: z.string() });
      const req = createMockRequest({ id: '1', extra: 'ignored' });
      const result = readValidatedParams(req, schema);
      expect(result).toEqual({ id: '1' });
    });

    it('invalid coerce with z.coerce.number() returns failure in safe mode', () => {
      const schema = z.object({ id: z.coerce.number() });
      const req = createMockRequest({ id: 'not-a-number' });
      const result = readValidatedParams(req, schema, { safe: true });
      expect(result.success).toBe(false);
    });
  });
});
