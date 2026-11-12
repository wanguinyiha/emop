CREATE TABLE causes (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

INSERT INTO causes (name) VALUES
  ('Transformer failure'),
  ('Damaged electricity cables'),
  ('Weather-related interruption'),
  ('Transmission problem'),
  ('Unknown');
