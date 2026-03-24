-- ============================================================
-- ZEITERFASSUNG V6.5 – Team Join RPC Function
-- ============================================================
-- Allows a user to look up a team by invite_code and join it,
-- without needing SELECT access to all teams.
-- ============================================================

-- RPC: join_team_by_code(code TEXT, display_name TEXT)
-- Returns the team row if successful, raises exception otherwise.
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
  v_codename TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Look up team by invite code
  SELECT * INTO v_team
  FROM public.teams
  WHERE invite_code = UPPER(p_invite_code);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_INVITE_CODE';
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = v_team.id AND user_id = v_user_id
  ) THEN
    -- Already a member, just return the team
    RETURN jsonb_build_object(
      'id', v_team.id,
      'name', v_team.name,
      'creator_id', v_team.creator_id,
      'invite_code', v_team.invite_code,
      'created_at', v_team.created_at,
      'updated_at', v_team.updated_at,
      'already_member', true
    );
  END IF;

  -- Insert as team member
  INSERT INTO public.team_members (team_id, user_id)
  VALUES (v_team.id, v_user_id);

  RETURN jsonb_build_object(
    'id', v_team.id,
    'name', v_team.name,
    'creator_id', v_team.creator_id,
    'invite_code', v_team.invite_code,
    'created_at', v_team.created_at,
    'updated_at', v_team.updated_at,
    'already_member', false
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.join_team_by_code(TEXT) TO authenticated;

-- RPC: get_team_entries(p_team_id UUID)
-- Returns all time entries for all members of a team (for team dashboard).
CREATE OR REPLACE FUNCTION public.get_team_entries(p_team_id UUID)
RETURNS TABLE (
  entry_id UUID,
  user_id UUID,
  codename TEXT,
  date DATE,
  stakeholder VARCHAR,
  projekt VARCHAR,
  taetigkeit VARCHAR,
  start_time TIME,
  end_time TIME,
  duration_ms BIGINT,
  notiz TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is a member of the team
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND team_members.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;

  RETURN QUERY
  SELECT
    te.id AS entry_id,
    te.user_id,
    p.codename,
    te.date,
    te.stakeholder,
    te.projekt,
    te.taetigkeit,
    te.start_time,
    te.end_time,
    te.duration_ms,
    te.notiz
  FROM public.time_entries te
  JOIN public.team_members tm ON tm.user_id = te.user_id AND tm.team_id = p_team_id
  JOIN public.profiles p ON p.id = te.user_id
  ORDER BY te.date DESC, te.start_time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_entries(UUID) TO authenticated;
