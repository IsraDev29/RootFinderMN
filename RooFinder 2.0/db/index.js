const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL );

async function initDB() {
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username    VARCHAR(50)  UNIQUE NOT NULL,
        email       VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT       NOT NULL,
        password    TEXT,
        verified    BOOLEAN      DEFAULT FALSE,
        created_at  TIMESTAMPTZ  DEFAULT NOW(),
        updated_at  TIMESTAMPTZ  DEFAULT NOW()
      )
    `;

    await sql`ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid()`;
    await sql`UPDATE users SET id = gen_random_uuid() WHERE id IS NULL`;
    await sql`ALTER TABLE users ALTER COLUMN id SET NOT NULL`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;
    await sql`UPDATE users SET password_hash = COALESCE(password_hash, password) WHERE password_hash IS NULL AND password IS NOT NULL`;

    await sql`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL,
        token       VARCHAR(128) UNIQUE NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        used        BOOLEAN DEFAULT FALSE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS password_resets (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL,
        token       VARCHAR(128) UNIQUE NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        used        BOOLEAN DEFAULT FALSE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL,
        token       TEXT UNIQUE NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS history_entries (
        id          UUID PRIMARY KEY,
        user_id     UUID NOT NULL,
        section     VARCHAR(40) NOT NULL DEFAULT 'panel',
        method_id   VARCHAR(60),
        title       VARCHAR(160) NOT NULL,
        summary     TEXT DEFAULT '',
        result      TEXT DEFAULT '',
        note        TEXT DEFAULT '',
        status      VARCHAR(20) DEFAULT 'info',
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`ALTER TABLE history_entries ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT gen_random_uuid()`;
    await sql`ALTER TABLE history_entries ALTER COLUMN id SET NOT NULL`;
    await sql`ALTER TABLE history_entries ALTER COLUMN title SET NOT NULL`;
    await sql`ALTER TABLE history_entries ALTER COLUMN section SET DEFAULT 'panel'`;
    await sql`ALTER TABLE history_entries ALTER COLUMN status SET DEFAULT 'info'`;
    await sql`ALTER TABLE history_entries ALTER COLUMN created_at SET DEFAULT NOW()`;
    await sql`ALTER TABLE history_entries ALTER COLUMN updated_at SET DEFAULT NOW()`;
    await sql`CREATE INDEX IF NOT EXISTS idx_history_entries_user_updated ON history_entries (user_id, updated_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_history_entries_user_section ON history_entries (user_id, section)`;

    console.log('[DB] Tables ready');
  } catch (err) {
    console.error('[DB] Failed to initialize database:', err.message);
    process.exit(1);
  }
}

module.exports = { sql, initDB };
