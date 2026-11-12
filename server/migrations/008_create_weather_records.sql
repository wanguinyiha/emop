CREATE TABLE weather_records (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  town_id INTEGER NOT NULL REFERENCES towns(id),
  recorded_at TIMESTAMPTZ NOT NULL,
  rainfall_mm NUMERIC(6,1) NOT NULL,
  wind_speed_kmh NUMERIC(5,1) NOT NULL,
  is_simulated BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT weather_rainfall_not_negative CHECK (rainfall_mm >= 0),
  CONSTRAINT weather_wind_not_negative CHECK (wind_speed_kmh >= 0),
  CONSTRAINT weather_one_reading_per_source
    UNIQUE (town_id, recorded_at, is_simulated)
);
