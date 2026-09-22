-- 1. Telemetry summary cache
CREATE TABLE IF NOT EXISTS telemetry_summaries (
  project_id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

-- 2. Distributed lock & webhook deduplication
CREATE TABLE IF NOT EXISTS locks (
  key TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);

-- 3. Telemetry events log (capped at 50 per project)
CREATE TABLE IF NOT EXISTS telemetry_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  actor TEXT NOT NULL,
  url TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_project_created ON telemetry_events(project_id, created_at DESC);
