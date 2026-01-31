# @xcvzmoon/express-utils

A collection of utilities for Express. More will be added over time.

## Current utilities

**Request validation with [Zod](https://zod.dev):**

- **`readValidatedBody`** — validate and type `req.body` with a Zod schema
- **`readValidatedParams`** — validate and type `req.params` with a Zod schema
- **`readValidatedQuery`** — validate and type `req.query` with a Zod schema

**Multipart form data:**

- **`readMultipartFormData`** — parse `multipart/form-data` and get uploaded files as `{ name, filename, mimeType, buffer }[]`, or `null` if the request is not multipart (uses [busboy](https://github.com/mscdex/busboy))

**Server-Sent Events (SSE):**

- **`createServerSentEvent`** — set up an Express response for SSE and get `{ push, pushComment, close, closed }` to send events, comments, and close the connection

## Install

```sh
bun add @xcvzmoon/express-utils express zod
# or
npm i @xcvzmoon/express-utils express zod
```

## Usage

**Zod validation:**

```ts
import {
  readValidatedBody,
  readValidatedParams,
  readValidatedQuery,
} from '@xcvzmoon/express-utils';
import { z } from 'zod';

const bodySchema = z.object({ name: z.string() });
const paramsSchema = z.object({ id: z.string() });
const querySchema = z.object({ page: z.coerce.number().optional() });

app.post('/users/:id', (req, res) => {
  const body = readValidatedBody(req, bodySchema);
  const params = readValidatedParams(req, paramsSchema);
  const query = readValidatedQuery(req, querySchema);
  // body, params, query are typed and validated
});
```

**Multipart form data:**

```ts
import { readMultipartFormData } from '@xcvzmoon/express-utils';

app.post('/upload', async (req, res) => {
  const files = await readMultipartFormData(req);
  if (files === null) return res.status(400).send('Expected multipart/form-data');
  for (const { name, filename, mimeType, buffer } of files) {
    // handle each uploaded file
  }
});
```

**Server-Sent Events:**

```ts
import { createServerSentEvent } from '@xcvzmoon/express-utils';

app.get('/events', (req, res) => {
  const sse = createServerSentEvent(res);

  sse.push('data: Connected\n\n');

  const heartbeat = setInterval(() => sse.pushComment('heartbeat'), 10000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sse.close();
  });
});
```

## Peer dependencies

- **express** ^5.2.1
- **zod** ^4.3.6
