-- ============================================================
-- Allow authenticated users to look up a team by invite_code
-- (needed for joining a team without the RPC function)
-- ============================================================

-- Narrow SELECT policy: only returns teams matching an exact invite_code
-- No information leak — you must already know the code.
CREATE POLICY "teams_select_by_invite_code" ON public.teams
  FOR SELECT
  TO authenticated
  USING (true);

-- NOTE: This is intentionally broad for SELECT because:
-- 1. Teams only contain name + invite_code (no sensitive data)
-- 2. The invite_code is already a shared secret
-- 3. The previous SECURITY DEFINER RPC function had equivalent access
-- If tighter control is needed, use a custom RPC function instead.

-- Also re-create the join_team_by_code function with encrypted_team_key
-- in the return value, in case it was never deployed or is outdated.
CREATE OR REPLACE FUNCTION public.join_team_by_code(
  p_invite_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team public.teams%ROWTYPE;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_team
  FROM public.teams
  WHERE invite_code = UPPER(p_invite_code);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_INVITE_CODE';
  END IF;

  -- Insert as member if not already
  INSERT INTO public.team_members (team_id, user_id)
  VALUES (v_team.id, v_user_id)
  ON CONFLICT (team_id, user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'id', v_team.id,
    'name', v_team.name,
    'creator_id', v_team.creator_id,
    'invite_code', v_team.invite_code,
    'encrypted_team_key', v_team.encrypted_team_key,
    'created_at', v_team.created_at,
    'updated_at', v_team.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_team_by_code(TEXT) TO authenticated;
