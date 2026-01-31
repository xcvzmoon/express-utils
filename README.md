# @xcvzmoon/express-utils

A collection of utilities for Express. More will be added over time.

## Current utilities

Right now the package focuses on **request validation with [Zod](https://zod.dev)**:

- **`readValidatedBody`** — validate and type `req.body` with a Zod schema
- **`readValidatedParams`** — validate and type `req.params` with a Zod schema
- **`readValidatedQuery`** — validate and type `req.query` with a Zod schema

## Install

```sh
bun add @xcvzmoon/express-utils express zod
# or
npm i @xcvzmoon/express-utils express zod
```

## Usage

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

## Peer dependencies

- **express** ^5.2.1
- **zod** ^4.3.6
