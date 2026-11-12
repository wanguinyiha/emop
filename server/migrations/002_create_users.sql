CREATE TABLE users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  neighbourhood_id INTEGER REFERENCES neighbourhoods(id),
  notify_sms BOOLEAN NOT NULL DEFAULT FALSE,
  notify_email BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_role_valid
    CHECK (role IN ('customer', 'admin')),
  CONSTRAINT users_contact_required
    CHECK (email IS NOT NULL OR phone IS NOT NULL),
  CONSTRAINT users_customer_needs_location
    CHECK (role = 'admin' OR neighbourhood_id IS NOT NULL)
);

CREATE UNIQUE INDEX users_email_lower_idx ON users (LOWER(email));
