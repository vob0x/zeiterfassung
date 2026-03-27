-- ============================================================
-- Add format column to time_entries + create formats table
-- Required for V6.0 Format dimension
-- ============================================================

-- 1. Add format column to time_entries (nullable, default empty)
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS format TEXT DEFAULT '';

-- 2. Create formats table (same pattern as stakeholders/projects/activities)
CREATE TABLE IF NOT EXISTS public.formats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.formats ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for formats (same pattern as activities)
CREATE POLICY "fmt_select" ON public.formats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fmt_insert" ON public.formats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fmt_update" ON public.formats FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fmt_delete" ON public.formats FOR DELETE USING (auth.uid() = user_id);

-- 4. Team visibility for formats (teammates can read)
CREATE POLICY "fmt_select_teammates" ON public.formats
  FOR SELECT USING (
    user_id IN (
      SELECT tm.user_id
      FROM public.team_members tm
      WHERE tm.team_id IN (
        SELECT tm2.team_id FROM public.team_members tm2 WHERE tm2.user_id = auth.uid()
      )
    )
  );

-- 5. Auto-update trigger for formats
CREATE TRIGGER update_formats_updated_at
  BEFORE UPDATE ON public.formats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Team E2E Encryption Support
-- ============================================================

-- 6. Add encrypted_team_key to teams (transport-encrypted via invite code)
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS encrypted_team_key TEXT;

-- 7. Add encrypted_team_key to team_members (personal-key-encrypted per member)
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS encrypted_team_key TEXT;
