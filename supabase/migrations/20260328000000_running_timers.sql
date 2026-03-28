-- ============================================================
-- Running Timers table — enables cross-device timer sync
-- Each user has one row per active timer slot
-- ============================================================

CREATE TABLE IF NOT EXISTS public.running_timers (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL DEFAULT '',
  stakeholder TEXT DEFAULT '[]',
  projekt TEXT DEFAULT '',
  taetigkeit TEXT DEFAULT '',
  format TEXT DEFAULT 'Einzelarbeit',
  start_time TEXT DEFAULT '',
  notiz TEXT DEFAULT '',
  color TEXT DEFAULT '',
  paused_ms BIGINT DEFAULT 0,
  is_paused BOOLEAN DEFAULT true,
  was_running BOOLEAN DEFAULT false,
  saved_at BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id, user_id)
);

ALTER TABLE public.running_timers ENABLE ROW LEVEL SECURITY;

-- RLS: users can only see/modify their own timers
CREATE POLICY "rt_select" ON public.running_timers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rt_insert" ON public.running_timers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rt_update" ON public.running_timers FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rt_delete" ON public.running_timers FOR DELETE USING (auth.uid() = user_id);

-- Team members can see each other's running timers (optional, for future team-timer feature)
CREATE POLICY "rt_select_teammates" ON public.running_timers
  FOR SELECT USING (
    user_id IN (
      SELECT tm.user_id
      FROM public.team_members tm
      WHERE tm.team_id IN (
        SELECT tm2.team_id FROM public.team_members tm2 WHERE tm2.user_id = auth.uid()
      )
    )
  );

-- Auto-update trigger
CREATE TRIGGER update_running_timers_updated_at
  BEFORE UPDATE ON public.running_timers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for running_timers
ALTER PUBLICATION supabase_realtime ADD TABLE public.running_timers;
