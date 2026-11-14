-- 1. Remove old simulated data (children first, then parents).
--    Real data is never touched, because every simulated row is marked.
DELETE FROM notifications
 WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@simulated.emop.test')
    OR incident_id IN (SELECT id FROM outage_incidents WHERE is_simulated);
DELETE FROM restoration_predictions
 WHERE incident_id IN (SELECT id FROM outage_incidents WHERE is_simulated);
DELETE FROM outage_reports
 WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@simulated.emop.test')
    OR incident_id IN (SELECT id FROM outage_incidents WHERE is_simulated);
DELETE FROM outage_incidents WHERE is_simulated;
DELETE FROM planned_interruptions
 WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%@simulated.emop.test');
DELETE FROM risk_predictions WHERE model_version LIKE 'simulated%';
DELETE FROM weather_records WHERE is_simulated;
DELETE FROM users WHERE email LIKE '%@simulated.emop.test';

-- 2. Simulated users (the hash is deliberately not a real one, so nobody can log in as them)
INSERT INTO users (first_name, last_name, email, password_hash, role, neighbourhood_id)
SELECT v.first_name, 'Sim', v.email, 'SIMULATED-NOT-A-REAL-HASH', v.role, n.id
FROM (VALUES
  ('Amina',  'amina@simulated.emop.test',  'customer', 'Zimmerman'),
  ('Esther', 'esther@simulated.emop.test', 'customer', 'Zimmerman'),
  ('Felix',  'felix@simulated.emop.test',  'customer', 'Zimmerman'),
  ('Brian',  'brian@simulated.emop.test',  'customer', 'Parklands'),
  ('Cheri',  'cheri@simulated.emop.test',  'customer', 'Mwiki'),
  ('Dennis', 'dennis@simulated.emop.test', 'customer', 'Kilimani'),
  ('Admin',  'admin@simulated.emop.test',  'admin',    NULL)
) AS v(first_name, email, role, hood)
LEFT JOIN neighbourhoods n ON n.name = v.hood;

-- 3. Simulated incidents: four finished ones and two still open
INSERT INTO outage_incidents
  (neighbourhood_id, cause_id, cause_confirmed, is_planned, status,
   started_at, estimated_restoration_at, restored_at, is_simulated)
SELECT n.id, c.id, v.confirmed, FALSE, v.status,
       NOW() - v.started_ago,
       NOW() - v.started_ago + v.estimate,
       CASE WHEN v.status = 'restored' THEN NOW() - v.started_ago + v.actual END,
       TRUE
FROM (VALUES
  ('Zimmerman', 'Transformer failure',         TRUE,  'restored',            INTERVAL '10 days',   INTERVAL '4 hours', INTERVAL '5 hours'),
  ('Parklands', 'Damaged electricity cables',  TRUE,  'restored',            INTERVAL '6 days',    INTERVAL '6 hours', INTERVAL '9 hours'),
  ('Mwiki',     'Weather-related interruption', FALSE, 'restored',           INTERVAL '3 days',    INTERVAL '3 hours', INTERVAL '2 hours'),
  ('Kilimani',  'Unknown',                     FALSE, 'restored',            INTERVAL '1 day',     INTERVAL '2 hours', INTERVAL '3 hours'),
  ('Zimmerman', 'Transformer failure',         FALSE, 'under_investigation', INTERVAL '2 hours',   INTERVAL '4 hours', INTERVAL '0 hours'),
  ('Parklands', 'Unknown',                     FALSE, 'reported',            INTERVAL '30 minutes', INTERVAL '3 hours', INTERVAL '0 hours')
) AS v(hood, cause, confirmed, status, started_ago, estimate, actual)
JOIN neighbourhoods n ON n.name = v.hood
JOIN causes c ON c.name = v.cause;

-- 4. Simulated reports: three Zimmerman neighbours report ONE incident, one Parklands user reports another
INSERT INTO outage_reports (user_id, incident_id, neighbourhood_id, started_at, description, neighbours_affected)
SELECT u.id, i.id, i.neighbourhood_id, i.started_at, v.description, TRUE
FROM (VALUES
  ('amina@simulated.emop.test',  'Zimmerman', 'No power since early afternoon'),
  ('esther@simulated.emop.test', 'Zimmerman', 'Whole street is dark'),
  ('felix@simulated.emop.test',  'Zimmerman', 'Neighbours have no power either'),
  ('brian@simulated.emop.test',  'Parklands', 'Power went off a few minutes ago')
) AS v(email, hood, description)
JOIN users u ON u.email = v.email
JOIN outage_incidents i
  ON i.neighbourhood_id = (SELECT id FROM neighbourhoods WHERE name = v.hood)
 AND i.is_simulated
 AND i.status <> 'restored';

-- 5. Simulated weather
INSERT INTO weather_records (town_id, recorded_at, rainfall_mm, wind_speed_kmh, is_simulated)
SELECT t.id, NOW() - INTERVAL '3 hours', v.rain, v.wind, TRUE
FROM (VALUES
  ('Roysambu',  12.5, 18.0),
  ('Kasarani',  20.0, 25.0),
  ('Westlands',  0.0, 10.0)
) AS v(town, rain, wind)
JOIN towns t ON t.name = v.town;

-- 6. One simulated estimate per open incident
INSERT INTO restoration_predictions (incident_id, predicted_restoration_at, confidence, model_version)
SELECT id, estimated_restoration_at, 'low', 'simulated-v0'
FROM outage_incidents
WHERE is_simulated AND status <> 'restored';

-- 7. Simulated notifications for users in areas with an open incident
INSERT INTO notifications (user_id, incident_id, type, message)
SELECT u.id, i.id, 'outage_reported', 'SIMULATED: an outage was reported in your area.'
FROM users u
JOIN outage_incidents i
  ON i.neighbourhood_id = u.neighbourhood_id AND i.is_simulated AND i.status <> 'restored'
WHERE u.email LIKE '%@simulated.emop.test';

-- 8. One simulated planned interruption and one simulated risk warning
INSERT INTO planned_interruptions (neighbourhood_id, reason, scheduled_start, scheduled_end, created_by)
SELECT n.id, 'SIMULATED: line maintenance',
       NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 4 hours', u.id
FROM neighbourhoods n, users u
WHERE n.name = 'Kilimani' AND u.email = 'admin@simulated.emop.test';

INSERT INTO risk_predictions (neighbourhood_id, risk_level, valid_from, valid_until, model_version)
SELECT id, 'medium', NOW(), NOW() + INTERVAL '1 day', 'simulated-v0'
FROM neighbourhoods WHERE name = 'Mwiki';
