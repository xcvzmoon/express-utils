import type { Request } from 'express';
import { Busboy } from '@fastify/busboy';

export type MultipartFormData = {
  name: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

/**
 * Parses a multipart/form-data request and extracts file uploads.
 *
 * @param req - The Express request object containing the multipart form data.
 * @returns A promise that resolves to an array of MultipartFormData objects representing uploaded files,
 *          or null if the request is not multipart/form-data.
 */
export async function getMultipartFormData(req: Request): Promise<MultipartFormData[] | null> {
  const contentType = getContentType(req);
  if (!contentType) return null;

  const busboy = new Busboy({ headers: { ...req.headers, 'content-type': contentType } });
  const promises: Promise<MultipartFormData>[] = [];

  busboy.on('file', (fieldname, stream, filename, _transferEncoding, mimeType) => {
    const chunks: Buffer[] = [];

    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    promises.push(
      new Promise((resolve, reject) => {
        stream.on('end', () => {
          const name = fieldname;
          const buffer = Buffer.concat(chunks);
          resolve({ name, filename, mimeType, buffer });
        });

        stream.on('error', reject);
      }),
    );
  });

  return new Promise((resolve, reject) => {
    busboy.on('finish', () => {
      Promise.all(promises)
        .then((files) => {
          resolve(files);
        })
        .catch((error: unknown) => {
          reject(
            error instanceof Error
              ? error
              : new Error('An error occurred while parsing multipart form data'),
          );
        });
    });

    busboy.on('error', reject);
    req.pipe(busboy);
  });
}

function getContentType(req: Request) {
  const contentType = req.headers['content-type'];
  return !contentType ||
    contentType.charCodeAt(0) !== 109 ||
    !contentType.startsWith('multipart/form-data')
    ? null
    : contentType;
}
