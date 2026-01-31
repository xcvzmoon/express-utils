import type { Request } from 'express';
import busboy from 'busboy';

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
export async function readMultipartFormData(req: Request): Promise<MultipartFormData[] | null> {
  const contentType = getContentType(req);
  if (!contentType) return null;

  const bb = busboy({ headers: req.headers });
  const promises: Promise<MultipartFormData>[] = [];

  bb.on('file', function (name, file, info) {
    const chunks: Buffer[] = [];

    file.on('data', function (chunk: Buffer) {
      chunks.push(chunk);
    });

    promises.push(
      new Promise(function (resolve, reject) {
        file.on('end', function () {
          const filename = info.filename;
          const mimeType = info.mimeType;
          const buffer = Buffer.concat(chunks);
          resolve({ name, filename, mimeType, buffer });
        });

        file.on('error', reject);
      }),
    );
  });

  return new Promise((resolve, reject) => {
    bb.on('finish', () => {
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

    bb.on('error', reject);
    req.pipe(bb);
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
