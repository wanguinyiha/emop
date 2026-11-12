CREATE TABLE restoration_predictions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES outage_incidents(id),
  predicted_restoration_at TIMESTAMPTZ NOT NULL,
  confidence TEXT NOT NULL,
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT restoration_confidence_valid
    CHECK (confidence IN ('low', 'moderate', 'high'))
);

CREATE INDEX restoration_predictions_incident_idx
  ON restoration_predictions (incident_id, created_at DESC);

CREATE TABLE risk_predictions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  neighbourhood_id INTEGER NOT NULL REFERENCES neighbourhoods(id),
  risk_level TEXT NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT risk_level_valid
    CHECK (risk_level IN ('low', 'medium', 'high')),
  CONSTRAINT risk_window_valid
    CHECK (valid_until > valid_from)
);

CREATE INDEX risk_predictions_area_idx
  ON risk_predictions (neighbourhood_id, valid_until DESC);
