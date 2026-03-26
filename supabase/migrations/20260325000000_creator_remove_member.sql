-- ============================================================
-- Allow team creator to remove members
-- ============================================================

-- Helper: check if current user is creator of a team (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_team_creator(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams WHERE id = p_team_id AND creator_id = auth.uid()
  );
$$;

-- Drop the existing delete policy (only allows self-removal)
DROP POLICY IF EXISTS "tm_delete_own" ON public.team_members;
DROP POLICY IF EXISTS "tm_delete" ON public.team_members;

-- New policy: user can delete own membership OR creator can delete any member
CREATE POLICY "tm_delete" ON public.team_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR public.is_team_creator(team_id)
  );
