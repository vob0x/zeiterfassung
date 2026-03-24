-- ============================================================
-- FIX: Infinite recursion in team_members RLS policy
-- ============================================================
-- The original tm_select policy references team_members inside
-- a SELECT on team_members → infinite recursion.
-- Fix: Use a SECURITY DEFINER function to bypass RLS.
-- ============================================================

-- Step 1: Helper function (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_team_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_team_ids() TO authenticated;

-- Step 2: Drop the recursive policy
DROP POLICY IF EXISTS "tm_select" ON public.team_members;

-- Step 3: Recreate without recursion
CREATE POLICY "tm_select" ON public.team_members
  FOR SELECT USING (
    team_id IN (SELECT public.get_my_team_ids())
  );

-- Also fix the same pattern in profiles (could recurse too)
DROP POLICY IF EXISTS "profiles_select_teammates" ON public.profiles;

CREATE POLICY "profiles_select_teammates" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT tm.user_id
      FROM public.team_members tm
      WHERE tm.team_id IN (SELECT public.get_my_team_ids())
    )
  );

-- And in time_entries
DROP POLICY IF EXISTS "te_select_teammates" ON public.time_entries;

CREATE POLICY "te_select_teammates" ON public.time_entries
  FOR SELECT USING (
    user_id IN (
      SELECT tm.user_id
      FROM public.team_members tm
      WHERE tm.team_id IN (SELECT public.get_my_team_ids())
    )
  );
