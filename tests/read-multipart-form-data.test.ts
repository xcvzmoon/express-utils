import type { Request } from 'express';
import { Readable } from 'stream';
import { describe, expect, it } from 'vitest';
import { readMultipartFormData } from '../src/read-multipart-form-data';

function createMultipartRequest(contentType: string, body: Buffer | string): Request {
  const stream = Readable.from([typeof body === 'string' ? Buffer.from(body, 'utf8') : body]);
  const req = Object.assign(stream, {
    headers: { 'content-type': contentType },
  }) as Request;
  return req;
}

function buildMultipartBody(
  boundary: string,
  file: { name: string; filename: string; mimeType: string; content: string },
): string {
  return [
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\n`,
    `Content-Type: ${file.mimeType}\r\n`,
    '\r\n',
    file.content,
    `\r\n--${boundary}--\r\n`,
  ].join('');
}

describe('readMultipartFormData', () => {
  describe('non-multipart requests', () => {
    it('returns null when content-type is missing', async () => {
      const req = Object.assign(Readable.from([]), { headers: {} }) as Request;
      const result = await readMultipartFormData(req);
      expect(result).toBeNull();
    });

    it('returns null when content-type is application/json', async () => {
      const req = Object.assign(Readable.from([]), {
        headers: { 'content-type': 'application/json' },
      }) as Request;
      const result = await readMultipartFormData(req);
      expect(result).toBeNull();
    });

    it('returns null when content-type does not start with multipart/form-data', async () => {
      const req = Object.assign(Readable.from([]), {
        headers: { 'content-type': 'text/plain' },
      }) as Request;
      const result = await readMultipartFormData(req);
      expect(result).toBeNull();
    });

    it('returns null when content-type first character is not "m" (charCode 109)', async () => {
      const req = Object.assign(Readable.from([]), {
        headers: { 'content-type': ' Multipart/form-data; boundary=----x' },
      }) as Request;
      const result = await readMultipartFormData(req);
      expect(result).toBeNull();
    });
  });

  describe('multipart/form-data with file', () => {
    const boundary = '----testboundary';

    it('parses a single file and returns name, filename, mimeType, buffer', async () => {
      const body = buildMultipartBody(boundary, {
        name: 'file',
        filename: 'hello.txt',
        mimeType: 'text/plain',
        content: 'Hello world',
      });
      const req = createMultipartRequest(`multipart/form-data; boundary=${boundary}`, body);
      const result = await readMultipartFormData(req);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        name: 'file',
        filename: 'hello.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Hello world', 'utf8'),
      });
    });

    it('parses multiple files', async () => {
      const b = boundary;
      const body = [
        `--${b}\r\n`,
        'Content-Disposition: form-data; name="a"; filename="a.txt"\r\n',
        'Content-Type: text/plain\r\n\r\n',
        'content-a',
        `\r\n--${b}\r\n`,
        'Content-Disposition: form-data; name="b"; filename="b.json"\r\n',
        'Content-Type: application/json\r\n\r\n',
        '{"x":1}',
        `\r\n--${b}--\r\n`,
      ].join('');
      const req = createMultipartRequest(`multipart/form-data; boundary=${b}`, body);
      const result = await readMultipartFormData(req);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result![0]).toMatchObject({
        name: 'a',
        filename: 'a.txt',
        mimeType: 'text/plain',
      });
      expect(result?.[0]?.buffer.toString()).toBe('content-a');
      expect(result?.[1]).toMatchObject({
        name: 'b',
        filename: 'b.json',
        mimeType: 'application/json',
      });
      expect(result?.[1]?.buffer.toString()).toBe('{"x":1}');
    });

    it('returns empty array when multipart has no file field', async () => {
      const b = boundary;
      const body = [
        `--${b}\r\n`,
        'Content-Disposition: form-data; name="text"\r\n\r\n',
        'some value',
        `\r\n--${b}--\r\n`,
      ].join('');
      const req = createMultipartRequest(`multipart/form-data; boundary=${b}`, body);
      const result = await readMultipartFormData(req);
      expect(result).not.toBeNull();
      expect(result).toEqual([]);
    });

    it('preserves binary file content', async () => {
      const binary = Buffer.from([0x00, 0xff, 0x0a, 0x0d]);
      const b = boundary;
      const parts = [
        Buffer.from(`--${b}\r\n`, 'utf8'),
        Buffer.from(
          'Content-Disposition: form-data; name="bin"; filename="data.bin"\r\nContent-Type: application/octet-stream\r\n\r\n',
          'utf8',
        ),
        binary,
        Buffer.from(`\r\n--${b}--\r\n`, 'utf8'),
      ];
      const bodyBuffer = Buffer.concat(parts);
      const req = createMultipartRequest(`multipart/form-data; boundary=${b}`, bodyBuffer);
      const result = await readMultipartFormData(req);
      expect(result).not.toBeNull();
      expect(result?.[0]?.buffer).toEqual(binary);
    });
  });
});
