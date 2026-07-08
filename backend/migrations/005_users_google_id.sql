-- Migration 005: users.google_id
--
-- auth.service.ts googleAuth() and user.repository.ts have looked up/updated
-- users.google_id since Google Sign-In shipped, but no prior migration ever
-- added the column — production has been throwing "column \"google_id\" does
-- not exist" on every Google OAuth attempt.

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
