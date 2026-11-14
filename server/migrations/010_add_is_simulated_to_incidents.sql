ALTER TABLE outage_incidents
  ADD COLUMN is_simulated BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE outage_incidents
  ALTER COLUMN is_simulated DROP DEFAULT;
