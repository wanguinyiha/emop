CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    area TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
