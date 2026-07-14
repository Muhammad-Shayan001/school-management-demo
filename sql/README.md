# SQL Backend Foundation

The running app backend is currently implemented in [server.ts](../server.ts) and uses the JSON persistence layer in [src/dbStore.ts](../src/dbStore.ts).

This folder adds a PostgreSQL schema that matches the current app data model:

- [schema.postgres.sql](schema.postgres.sql)

Use this file if you want to migrate the app from the current JSON store to a real SQL backend for production deployment.

What already exists in the codebase:

- Express API routes in [server.ts](../server.ts)
- JSON database helpers in [src/dbStore.ts](../src/dbStore.ts)
- Auto-seeded demo data in [src/dbStore.ts](../src/dbStore.ts)

What is not yet implemented:

- A SQL repository layer in the runtime server
- Supabase/Postgres bindings wired into every endpoint
- Authentication hardening, password hashing, and session tables

If you want, the next step is to replace the JSON store with a real Postgres adapter and wire `server.ts` to this schema.