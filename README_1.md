<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Rana School Management System

The app now runs on the Node/Express backend in [server.ts](server.ts) with a real SQLite persistence layer in [src/dbStore.ts](src/dbStore.ts). The production SQL schema is available at [sql/schema.postgres.sql](sql/schema.postgres.sql).

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Backend Notes

- The current runtime uses SQLite, not the old JSON-file store.
- The SQL schema is production-ready for PostgreSQL/Supabase migration.
- Demo data is seeded automatically on first run.
