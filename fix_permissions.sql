-- FIX: Run this to update permissions without erroring on existing tables

-- 1. Ensure RLS is enabled
ALTER TABLE contestants ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- 2. Contestants Policies
DROP POLICY IF EXISTS "Public read access for contestants" ON contestants;
CREATE POLICY "Public read access for contestants" ON contestants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert access for contestants" ON contestants;
CREATE POLICY "Public insert access for contestants" ON contestants FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update access for contestants" ON contestants;
CREATE POLICY "Public update access for contestants" ON contestants FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete access for contestants" ON contestants;
CREATE POLICY "Public delete access for contestants" ON contestants FOR DELETE USING (true);

-- 3. App Control Policies
DROP POLICY IF EXISTS "Public read access for app_control" ON app_control;
CREATE POLICY "Public read access for app_control" ON app_control FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public update access for app_control" ON app_control;
CREATE POLICY "Public update access for app_control" ON app_control FOR UPDATE USING (true);

-- 4. Votes Policies
DROP POLICY IF EXISTS "Public insert access for votes" ON votes;
CREATE POLICY "Public insert access for votes" ON votes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete access for votes" ON votes;
CREATE POLICY "Public delete access for votes" ON votes FOR DELETE USING (true);

-- 5. Enable Realtime (Ignore errors if already enabled)
-- Note: You might need to run these one by one if they fail
-- ALTER PUBLICATION supabase_realtime ADD TABLE app_control;
-- ALTER PUBLICATION supabase_realtime ADD TABLE votes;
-- ALTER PUBLICATION supabase_realtime ADD TABLE contestants;
