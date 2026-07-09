-- Documents can now be uploaded via API key (SDK), which has no backing
-- users row (req.user.id === 'api_key' is a sentinel, not a UUID). The
-- controller passes NULL for uploaded_by in that case — same precedent as
-- query_logs.user_id, which is already nullable for API-key-attributed rows.
ALTER TABLE documents ALTER COLUMN uploaded_by DROP NOT NULL;
