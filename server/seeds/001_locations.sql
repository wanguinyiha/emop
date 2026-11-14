INSERT INTO counties (name) VALUES ('Nairobi')
ON CONFLICT (name) DO NOTHING;

INSERT INTO towns (county_id, name)
SELECT c.id, v.name
FROM counties c,
     (VALUES ('Roysambu'), ('Kasarani'), ('Westlands'), ('Kilimani')) AS v(name)
WHERE c.name = 'Nairobi'
ON CONFLICT (county_id, name) DO NOTHING;

INSERT INTO neighbourhoods (town_id, name)
SELECT t.id, v.hood
FROM (VALUES
  ('Roysambu',  'Roysambu'),
  ('Roysambu',  'Zimmerman'),
  ('Kasarani',  'Mwiki'),
  ('Kasarani',  'Githurai 45'),
  ('Westlands', 'Parklands'),
  ('Westlands', 'Kangemi'),
  ('Kilimani',  'Kilimani'),
  ('Kilimani',  'Hurlingham')
) AS v(town, hood)
JOIN towns t ON t.name = v.town
JOIN counties c ON c.id = t.county_id AND c.name = 'Nairobi'
ON CONFLICT (town_id, name) DO NOTHING;
