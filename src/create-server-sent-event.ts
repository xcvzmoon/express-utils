import type { Response } from 'express';

type ExtendedResponse = Response & {
  flushHeaders?: () => void;
  flush?: () => void;
};

/**
 * Creates an object to facilitate sending Server-Sent Events (SSE) to the client using the given response object.
 *
 * Sets the appropriate headers on the response and provides utility methods for sending events, comments, and closing the connection.
 *
 * @param res - Express response object to be used for sending SSE events.
 * @returns An object with methods to push events, push comments, close the connection, and check if the connection is closed.
 *
 * @example
 * app.get('/events', (req, res) => {
 *   const sse = createServerSentEvent(res);
 *
 *   // Send a connection event
 *   sse.push('data: Connected\n\n');
 *
 *   // Send a comment as heartbeat every 10 seconds
 *   const heartbeat = setInterval(() => {
 *     sse.pushComment('heartbeat');
 *   }, 10000);
 *
 *   // Clean up on client disconnect
 *   req.on('close', () => {
 *     clearInterval(heartbeat);
 *     sse.close();
 *   });
 * });
 */
export function createServerSentEvent(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  (res as ExtendedResponse).flushHeaders?.();

  /**
   * Sends a chunk of data to the client as an SSE event.
   *
   * @param chunk - The string data to be sent to the client, formatted according to SSE protocol (e.g., "data: ...\n\n").
   */
  function push(chunk: string) {
    res.write.call(res, chunk, 'utf8');
    (res as ExtendedResponse).flush?.();
  }

  /**
   * Sends a comment to the client using the SSE protocol.
   *
   * Comments are lines starting with ':' as specified by the SSE standard (RFC 6202).
   * If the provided chunk contains newlines, each line will be sent as a separate comment line.
   *
   * @param chunk - The string to be sent as a comment. If empty, sends a bare ':' comment.
   */
  function pushComment(chunk: string) {
    const comment =
      (chunk
        ? chunk
            .split('\n')
            .map((line) => ': ' + line)
            .join('\n')
        : ':') + '\n\n';
    res.write.call(res, comment, 'utf8');
    (res as ExtendedResponse).flush?.();
  }

  return {
    push,
    pushComment,
    close: res.end.bind(res),
    closed: res.closed,
  };
}
