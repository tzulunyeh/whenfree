-- WhenFree Schema
-- Run this in Supabase SQL editor

-- events table
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  dates date[] NOT NULL,
  earliest_time smallint NOT NULL, -- slot index 0-47 (30min per slot)
  latest_time smallint NOT NULL,   -- exclusive
  quick_segments jsonb DEFAULT '[]'::jsonb, -- [{name, start, end}]
  admin_only_creator boolean DEFAULT false,
  creator_token uuid DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

-- participants table
CREATE TABLE participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_seed text NOT NULL,
  user_id uuid,  -- anonymous auth uid, used for RLS
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, name)
);

-- selections table
CREATE TABLE selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date date NOT NULL,
  slot smallint NOT NULL, -- 0-47
  UNIQUE (participant_id, date, slot)
);

-- Indexes
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_participants_event_id ON participants(event_id);
CREATE INDEX idx_selections_event_id ON selections(event_id);
CREATE INDEX idx_selections_participant_id ON selections(participant_id);

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select" ON events FOR SELECT USING (true);
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (true);

CREATE POLICY "participants_select" ON participants FOR SELECT USING (true);
CREATE POLICY "participants_insert" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "participants_delete" ON participants FOR DELETE USING (true);

CREATE POLICY "selections_select" ON selections FOR SELECT USING (true);
CREATE POLICY "selections_insert" ON selections FOR INSERT WITH CHECK (true);
CREATE POLICY "selections_delete" ON selections FOR DELETE USING (true);

-- Enable Realtime for participants and selections
ALTER TABLE participants REPLICA IDENTITY FULL;
ALTER TABLE selections REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE selections;

-- Constraints
ALTER TABLE events ADD CONSTRAINT check_time_range CHECK (earliest_time < latest_time);
ALTER TABLE events ADD CONSTRAINT check_slot_bounds CHECK (earliest_time >= 0 AND latest_time <= 48);
ALTER TABLE events ADD CONSTRAINT check_dates_nonempty CHECK (array_length(dates, 1) > 0);
ALTER TABLE events ADD CONSTRAINT check_name_length CHECK (char_length(name) <= 80);
ALTER TABLE participants ADD CONSTRAINT check_name_length CHECK (char_length(name) <= 30);
