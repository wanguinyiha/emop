CREATE TABLE outage_reports (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  incident_id INTEGER REFERENCES outage_incidents(id),
  neighbourhood_id INTEGER NOT NULL REFERENCES neighbourhoods(id),
  started_at TIMESTAMPTZ NOT NULL,
  description TEXT,
  neighbours_affected BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT reports_description_length
    CHECK (description IS NULL OR char_length(description) <= 1000),
  CONSTRAINT reports_one_per_user_per_incident
    UNIQUE (user_id, incident_id)
);

CREATE INDEX outage_reports_incident_idx ON outage_reports (incident_id);
CREATE INDEX outage_reports_user_idx ON outage_reports (user_id);
CREATE INDEX outage_reports_neighbourhood_idx ON outage_reports (neighbourhood_id, started_at);
