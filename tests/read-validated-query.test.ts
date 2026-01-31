import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { readValidatedQuery } from '../src/read-validated-query';

function createMockRequest(query: Request['query']): Request {
  return { query } as Request;
}

describe('readValidatedQuery', () => {
  const objectSchema = z.object({
    page: z.coerce.number().int().positive(),
    limit: z.coerce.number().int().positive(),
  });

  describe('default (throws on invalid)', () => {
    it('returns parsed data when query is valid', () => {
      const req = createMockRequest({ page: '1', limit: '10' });
      const result = readValidatedQuery(req, objectSchema);
      expect(result).toEqual({ page: 1, limit: 10 });
    });

    it('throws Error when query is invalid', () => {
      const req = createMockRequest({ page: '-1', limit: '10' });
      expect(() => readValidatedQuery(req, objectSchema)).toThrow(Error);
    });

    it('throws with message from Zod error', () => {
      const req = createMockRequest({ page: 'abc', limit: '10' });
      expect(() => readValidatedQuery(req, objectSchema)).toThrow();
      try {
        readValidatedQuery(req, objectSchema);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeDefined();
      }
    });

    it('throws when required field is missing', () => {
      const req = createMockRequest({ page: '1' });
      expect(() => readValidatedQuery(req, objectSchema)).toThrow();
    });

    it('works with options { safe: false }', () => {
      const req = createMockRequest({ page: '2', limit: '20' });
      const result = readValidatedQuery(req, objectSchema, { safe: false });
      expect(result).toEqual({ page: 2, limit: 20 });
    });
  });

  describe('safe: true', () => {
    it('returns success result with data when query is valid', () => {
      const req = createMockRequest({ page: '1', limit: '10' });
      const result = readValidatedQuery(req, objectSchema, { safe: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 1, limit: 10 });
      }
    });

    it('returns failure result with error when query is invalid', () => {
      const req = createMockRequest({ page: 'x', limit: '10' });
      const result = readValidatedQuery(req, objectSchema, { safe: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.issues).toBeDefined();
      }
    });

    it('returns failure when required field is missing', () => {
      const req = createMockRequest({});
      const result = readValidatedQuery(req, objectSchema, { safe: true });
      expect(result.success).toBe(false);
    });
  });

  describe('different schema types', () => {
    it('works with single string param', () => {
      const schema = z.object({ q: z.string() });
      const req = createMockRequest({ q: 'search' });
      const result = readValidatedQuery(req, schema);
      expect(result).toEqual({ q: 'search' });
    });

    it('works with optional param', () => {
      const schema = z.object({ q: z.string().optional() });
      const req = createMockRequest({});
      const result = readValidatedQuery(req, schema);
      expect(result).toEqual({});
    });

    it('works with optional param when present', () => {
      const schema = z.object({ q: z.string().optional() });
      const req = createMockRequest({ q: 'hello' });
      const result = readValidatedQuery(req, schema);
      expect(result).toEqual({ q: 'hello' });
    });

    it('works with coerce number for page and limit', () => {
      const schema = z.object({
        page: z.coerce.number(),
        limit: z.coerce.number(),
      });
      const req = createMockRequest({ page: '1', limit: '25' });
      const result = readValidatedQuery(req, schema);
      expect(result).toEqual({ page: 1, limit: 25 });
    });

    it('works with coerce boolean', () => {
      const schema = z.object({ active: z.coerce.boolean() });
      const req = createMockRequest({ active: 'true' });
      const result = readValidatedQuery(req, schema);
      expect(result).toEqual({ active: true });
    });

    it('handles array query param (repeated key)', () => {
      const schema = z.object({
        tags: z
          .union([z.string(), z.array(z.string())])
          .transform((v) => (Array.isArray(v) ? v : [v])),
      });
      const req = createMockRequest({ tags: ['a', 'b'] });
      const result = readValidatedQuery(req, schema);
      expect(result.tags).toEqual(['a', 'b']);
    });

    it('handles single value for union string/array', () => {
      const schema = z.object({
        tag: z
          .union([z.string(), z.array(z.string())])
          .transform((v) => (Array.isArray(v) ? v[0] : v)),
      });
      const req = createMockRequest({ tag: 'only' });
      const result = readValidatedQuery(req, schema);
      expect(result.tag).toBe('only');
    });
  });

  describe('edge cases', () => {
    it('accepts empty query when schema allows optional fields', () => {
      const schema = z.object({ page: z.coerce.number().optional() });
      const req = createMockRequest({});
      const result = readValidatedQuery(req, schema);
      expect(result).toEqual({});
    });

    it('invalid coercion returns failure in safe mode', () => {
      const schema = z.object({ page: z.coerce.number() });
      const req = createMockRequest({ page: 'not-a-number' });
      const result = readValidatedQuery(req, schema, { safe: true });
      expect(result.success).toBe(false);
    });

    it('rejects invalid type when schema expects number', () => {
      const schema = z.object({ page: z.coerce.number() });
      const req = createMockRequest({ page: 'abc' });
      expect(() => readValidatedQuery(req, schema)).toThrow();
    });

    it('accepts default values', () => {
      const schema = z.object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(10),
      });
      const req = createMockRequest({});
      const result = readValidatedQuery(req, schema);
      expect(result).toEqual({ page: 1, limit: 10 });
    });
  });
});
