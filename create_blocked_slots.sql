-- Run this in Supabase Dashboard → SQL Editor → New Query
CREATE TABLE IF NOT EXISTS blocked_slots (
  id SERIAL PRIMARY KEY,
  slot_date TIMESTAMPTZ NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow the server (service role) to read/write it
GRANT ALL ON blocked_slots TO service_role;
GRANT USAGE, SELECT ON SEQUENCE blocked_slots_id_seq TO service_role;
