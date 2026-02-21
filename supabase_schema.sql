-- 0. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Contestants Table
CREATE TABLE IF NOT EXISTS contestants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    participation_id TEXT UNIQUE NOT NULL,
    photo_url TEXT,
    performance_order INTEGER DEFAULT 0,
    category TEXT DEFAULT 'Performer' CHECK (category IN ('Creator', 'Performer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create App Control Table (Singleton)
CREATE TABLE IF NOT EXISTS app_control (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Ensures only one row
    current_stage TEXT DEFAULT 'Waiting', -- 'Waiting', 'Voting', 'Break', 'Reveal'
    active_contestant_id UUID REFERENCES contestants(id) ON DELETE SET NULL,
    reveal_step INTEGER DEFAULT 0, -- 0: None, 1: 3rd, 2: 2nd, 3: 1st
    reveal_category TEXT DEFAULT 'Performer', -- 'Performer' or 'Creator'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialize app_control
INSERT INTO app_control (id, current_stage) 
VALUES (1, 'Waiting')
ON CONFLICT (id) DO NOTHING;

-- 3. Create Votes Table
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contestant_id UUID REFERENCES contestants(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    score NUMERIC(3,1) CHECK (score >= 1 AND score <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (contestant_id, device_id) -- Ensures one vote per device per contestant
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE contestants ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies with existence checks
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for contestants') THEN
        CREATE POLICY "Public read access for contestants" ON contestants FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for app_control') THEN
        CREATE POLICY "Public read access for app_control" ON app_control FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public insert access for votes') THEN
        CREATE POLICY "Public insert access for votes" ON votes FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for votes') THEN
        CREATE POLICY "Public read access for votes" ON votes FOR SELECT USING (true);
    END IF;

    -- Admin-like permissions for anonymous users (for development/prototype)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public insert access for contestants') THEN
        CREATE POLICY "Public insert access for contestants" ON contestants FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public update access for contestants') THEN
        CREATE POLICY "Public update access for contestants" ON contestants FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public delete access for contestants') THEN
        CREATE POLICY "Public delete access for contestants" ON contestants FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public update access for app_control') THEN
        CREATE POLICY "Public update access for app_control" ON app_control FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public delete access for votes') THEN
        CREATE POLICY "Public delete access for votes" ON votes FOR DELETE USING (true);
    END IF;
END $$;

-- Enable Realtime
-- Realtime alterations are idempotent if the publication already includes the table
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE app_control;
    EXCEPTION WHEN others THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE votes;
    EXCEPTION WHEN others THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE contestants;
    EXCEPTION WHEN others THEN NULL;
    END;
END $$;
