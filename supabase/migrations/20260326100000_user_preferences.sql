-- User preferences table for syncing shortcuts etc. across devices
-- Values are stored encrypted (enc:... format) so no plaintext leaks

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pinned_shortcuts TEXT DEFAULT '',   -- encrypted JSON
  hidden_shortcuts TEXT DEFAULT '',   -- encrypted JSON
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_prefs_select"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_own_prefs_insert"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_prefs_update"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);
