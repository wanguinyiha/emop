CREATE TABLE planned_interruptions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  neighbourhood_id INTEGER NOT NULL REFERENCES neighbourhoods(id),
  reason TEXT NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT planned_end_after_start
    CHECK (scheduled_end > scheduled_start)
);

CREATE INDEX planned_interruptions_area_idx
  ON planned_interruptions (neighbourhood_id, scheduled_start);
