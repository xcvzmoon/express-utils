import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { readValidatedBody } from '../src/read-validated-body';

function createMockRequest(body: unknown): Request {
  return { body } as Request;
}

describe('readValidatedBody', () => {
  const objectSchema = z.object({
    name: z.string(),
    age: z.number().int().positive(),
  });

  describe('default (throws on invalid)', () => {
    it('returns parsed data when body is valid', () => {
      const req = createMockRequest({ name: 'Alice', age: 30 });
      const result = readValidatedBody(req, objectSchema);
      expect(result).toEqual({ name: 'Alice', age: 30 });
    });

    it('throws Error when body is invalid', () => {
      const req = createMockRequest({ name: 'Bob', age: -1 });
      expect(() => readValidatedBody(req, objectSchema)).toThrow(Error);
    });

    it('throws with message from Zod error', () => {
      const req = createMockRequest({ name: 123, age: 25 });
      expect(() => readValidatedBody(req, objectSchema)).toThrow();
      try {
        readValidatedBody(req, objectSchema);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeDefined();
      }
    });

    it('throws when body is undefined', () => {
      const req = createMockRequest(undefined);
      expect(() => readValidatedBody(req, objectSchema)).toThrow();
    });

    it('throws when required fields are missing', () => {
      const req = createMockRequest({});
      expect(() => readValidatedBody(req, objectSchema)).toThrow();
    });

    it('works with options { safe: false }', () => {
      const req = createMockRequest({ name: 'Carol', age: 42 });
      const result = readValidatedBody(req, objectSchema, { safe: false });
      expect(result).toEqual({ name: 'Carol', age: 42 });
    });
  });

  describe('safe: true', () => {
    it('returns success result with data when body is valid', () => {
      const req = createMockRequest({ name: 'Dave', age: 28 });
      const result = readValidatedBody(req, objectSchema, { safe: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'Dave', age: 28 });
      }
    });

    it('returns failure result with error when body is invalid', () => {
      const req = createMockRequest({ name: 'Eve', age: 'thirty' });
      const result = readValidatedBody(req, objectSchema, { safe: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.issues).toBeDefined();
      }
    });

    it('returns failure when body is undefined', () => {
      const req = createMockRequest(undefined);
      const result = readValidatedBody(req, objectSchema, { safe: true });
      expect(result.success).toBe(false);
    });
  });

  describe('different schema types', () => {
    it('works with z.string() schema', () => {
      const req = createMockRequest('hello');
      const result = readValidatedBody(req, z.string());
      expect(result).toBe('hello');
    });

    it('works with z.array() schema', () => {
      const req = createMockRequest([1, 2, 3]);
      const result = readValidatedBody(req, z.array(z.number()));
      expect(result).toEqual([1, 2, 3]);
    });

    it('works with nested object schema', () => {
      const nestedSchema = z.object({
        user: z.object({ id: z.number(), email: z.string().email() }),
      });
      const req = createMockRequest({
        user: { id: 1, email: 'a@b.com' },
      });
      const result = readValidatedBody(req, nestedSchema);
      expect(result).toEqual({ user: { id: 1, email: 'a@b.com' } });
    });
  });

  describe('body shapes (non-multipart)', () => {
    it('accepts JSON object shape (e.g. express.json())', () => {
      const schema = z.object({ a: z.number(), b: z.string() });
      const req = createMockRequest({ a: 1, b: 'two' });
      const result = readValidatedBody(req, schema);
      expect(result).toEqual({ a: 1, b: 'two' });
    });

    it('accepts URL-encoded shape: flat object with string values', () => {
      const schema = z.object({
        name: z.string(),
        age: z.coerce.number(),
        active: z.coerce.boolean(),
      });
      const req = createMockRequest({
        name: 'Jane',
        age: '42',
        active: 'true',
      });
      const result = readValidatedBody(req, schema);
      expect(result).toEqual({ name: 'Jane', age: 42, active: true });
    });

    it('accepts raw string body (e.g. express.text())', () => {
      const req = createMockRequest('plain text payload');
      const result = readValidatedBody(req, z.string());
      expect(result).toBe('plain text payload');
    });

    it('accepts JSON array body', () => {
      const schema = z.array(z.object({ id: z.number(), label: z.string() }));
      const req = createMockRequest([
        { id: 1, label: 'one' },
        { id: 2, label: 'two' },
      ]);
      const result = readValidatedBody(req, schema);
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { id: 1, label: 'one' },
        { id: 2, label: 'two' },
      ]);
    });

    it('accepts empty object when schema allows optional fields', () => {
      const schema = z.object({ name: z.string().optional() });
      const req = createMockRequest({});
      const result = readValidatedBody(req, schema);
      expect(result).toEqual({});
    });

    it('rejects null body when schema expects object', () => {
      const schema = z.object({ x: z.number() });
      const req = createMockRequest(null);
      expect(() => readValidatedBody(req, schema)).toThrow();
    });

    it('accepts number body with z.number() schema', () => {
      const req = createMockRequest(100);
      const result = readValidatedBody(req, z.number());
      expect(result).toBe(100);
    });

    it('accepts boolean body with z.boolean() schema', () => {
      const req = createMockRequest(true);
      const result = readValidatedBody(req, z.boolean());
      expect(result).toBe(true);
    });

    it('accepts deeply nested object shape', () => {
      const schema = z.object({
        meta: z.object({
          pagination: z.object({
            page: z.number(),
            perPage: z.number(),
          }),
        }),
      });
      const req = createMockRequest({
        meta: { pagination: { page: 1, perPage: 10 } },
      });
      const result = readValidatedBody(req, schema);
      expect(result.meta.pagination).toEqual({ page: 1, perPage: 10 });
    });
  });
});
