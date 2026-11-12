CREATE TABLE notifications (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  incident_id INTEGER REFERENCES outage_incidents(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT notifications_type_valid
    CHECK (type IN ('outage_reported', 'outage_confirmed', 'estimate_changed',
                    'restored', 'planned_interruption', 'risk_warning')),
  CONSTRAINT notifications_incident_required
    CHECK (type IN ('planned_interruption', 'risk_warning') OR incident_id IS NOT NULL)
);

CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_incident_idx ON notifications (incident_id);
