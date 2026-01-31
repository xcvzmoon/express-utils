import type { Request } from 'express';
import { z } from 'zod';

/**
 * Parses and validates the request route params against the specified Zod schema.
 *
 * @template T - The Zod schema type.
 * @param req - Express Request object containing the params to be validated.
 * @param schema - The Zod schema for validating the params. Route params are always strings; use z.coerce.number() etc. as needed.
 * @param options - Optional parameter. If omitted or { safe: false }, throws on validation failure.
 * @returns The validated params of type inferred from the schema.
 * @throws {Error} Throws if validation fails and options.safe is not true. Error message and cause reflect Zod error.
 *
 * @example
 * ```ts
 * const schema = z.object({ id: z.string() });
 * // In express handler (e.g. GET /users/:id):
 * const parsed = readValidatedParams(req, schema);
 * // Throws error if invalid
 * ```
 */
export function readValidatedParams<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
  options?: { safe?: false },
): z.infer<T>;

/**
 * Parses and safely validates the request route params against the specified Zod schema.
 *
 * @template T - The Zod schema type.
 * @param req - Express Request object containing the params to be validated.
 * @param schema - The Zod schema for validating the params.
 * @param options - Must be { safe: true }. Returns the ZodSafeParseResult.
 * @returns ZodSafeParseResult (Zod parse status with either the data or ZodError).
 *
 * @example
 * ```ts
 * const schema = z.object({ id: z.coerce.number() });
 * // In express handler:
 * const safeParsed = readValidatedParams(req, schema, { safe: true });
 * if (safeParsed.success) {
 *   // valid data in safeParsed.data
 * } else {
 *   // handle validation error via safeParsed.error
 * }
 * ```
 */
export function readValidatedParams<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
  options: { safe: true },
): z.ZodSafeParseResult<z.infer<T>>;

/**
 * Parses and validates the request route params against the specified Zod schema, returning either result or throwing error.
 *
 * @template T - The Zod schema type.
 * @param req - Express Request object containing the params to be validated.
 * @param schema - The Zod schema for validating the params.
 * @param options - If options.safe is true, returns the ZodSafeParseResult; otherwise, returns valid data or throws error.
 * @returns The validated data, or a ZodSafeParseResult if safe option is used.
 * @throws {Error} Throws if validation fails and options.safe is not true. Error message and cause reflect Zod error.
 *
 * @example
 * ```ts
 * const schema = z.object({ id: z.string() });
 *
 * // Safe style
 * const safeParsed = readValidatedParams(req, schema, { safe: true });
 *
 * // Unsafe style (throws)
 * const parsed = readValidatedParams(req, schema);
 * ```
 */
export function readValidatedParams<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
  options?: { safe?: boolean },
): z.infer<T> | z.ZodSafeParseResult<z.infer<T>> {
  const result = schema.safeParse(req.params);

  if (options?.safe) {
    return result as z.ZodSafeParseResult<z.infer<T>>;
  }

  if (!result.success) {
    const message = result.error.message;
    const cause = result.error.cause;
    throw new Error(message, { cause });
  }

  return result.data;
}
