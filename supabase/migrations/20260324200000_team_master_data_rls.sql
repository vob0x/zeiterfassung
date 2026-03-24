-- ============================================================
-- Add teammate-visible RLS for stakeholders, projects, activities
-- ============================================================
-- Allows team members to SEE each other's master data
-- (uses get_my_team_ids() from fix_rls_recursion migration)
-- ============================================================

-- Stakeholders: teammates can SELECT
CREATE POLICY "sh_select_teammates" ON public.stakeholders
  FOR SELECT USING (
    user_id IN (
      SELECT tm.user_id
      FROM public.team_members tm
      WHERE tm.team_id IN (SELECT public.get_my_team_ids())
    )
  );

-- Projects: teammates can SELECT
CREATE POLICY "pr_select_teammates" ON public.projects
  FOR SELECT USING (
    user_id IN (
      SELECT tm.user_id
      FROM public.team_members tm
      WHERE tm.team_id IN (SELECT public.get_my_team_ids())
    )
  );

-- Activities: teammates can SELECT
CREATE POLICY "act_select_teammates" ON public.activities
  FOR SELECT USING (
    user_id IN (
      SELECT tm.user_id
      FROM public.team_members tm
      WHERE tm.team_id IN (SELECT public.get_my_team_ids())
    )
  );
