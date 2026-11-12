CREATE TABLE outage_incidents (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  neighbourhood_id INTEGER NOT NULL REFERENCES neighbourhoods(id),
  cause_id INTEGER NOT NULL REFERENCES causes(id),
  cause_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  is_planned BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'reported',
  started_at TIMESTAMPTZ NOT NULL,
  estimated_restoration_at TIMESTAMPTZ,
  restored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT incidents_status_valid
    CHECK (status IN ('reported', 'under_investigation', 'restored')),
  CONSTRAINT incidents_restored_matches_status
    CHECK ((status = 'restored') = (restored_at IS NOT NULL)),
  CONSTRAINT incidents_restored_after_start
    CHECK (restored_at IS NULL OR restored_at >= started_at),
  CONSTRAINT incidents_estimate_after_start
    CHECK (estimated_restoration_at IS NULL OR estimated_restoration_at >= started_at)
);

CREATE INDEX outage_incidents_open_idx
  ON outage_incidents (neighbourhood_id, started_at)
  WHERE status <> 'restored' AND is_planned = FALSE;
