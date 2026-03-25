-- ============================================================
-- Allow team creator to remove members
-- ============================================================

-- Drop the existing delete policy (only allows self-removal)
DROP POLICY IF EXISTS "tm_delete_own" ON public.team_members;

-- New policy: user can delete own membership OR creator can delete any member
CREATE POLICY "tm_delete" ON public.team_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR team_id IN (
      SELECT id FROM public.teams WHERE creator_id = auth.uid()
    )
  );
