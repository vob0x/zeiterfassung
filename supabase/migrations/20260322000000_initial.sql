-- ============================================================
-- ZEITERFASSUNG V6.0 – Supabase Database Schema
-- ============================================================
-- WICHTIG: Dieses Script kann gefahrlos mehrfach ausgeführt werden.
-- Es räumt zuerst alles auf und erstellt dann alles neu.
-- ============================================================

-- Step 0: Clean up (sicher, auch wenn nichts existiert)
-- Zuerst Funktionen löschen – CASCADE entfernt automatisch alle Trigger
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Dann Tabellen löschen (Reihenfolge: abhängige zuerst)
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.time_entries CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.stakeholders CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Step 1: Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Step 2: TABELLEN ERSTELLEN
-- ============================================================

-- 2a: Profiles (pseudonym – nur Codename, keine echten Daten)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  codename VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2b: Teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code VARCHAR(6) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 2c: Team Members (Verknüpfung Team ↔ User)
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 2d: Stakeholder (pro User, sortierbar)
CREATE TABLE public.stakeholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;

-- 2e: Projekte (pro User, sortierbar)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 2f: Tätigkeiten (pro User, sortierbar)
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 2g: Zeiteinträge
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  stakeholder VARCHAR(255) NOT NULL,
  projekt VARCHAR(255) NOT NULL,
  taetigkeit VARCHAR(255) DEFAULT '',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_ms BIGINT NOT NULL,
  notiz TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- 2h: User-Einstellungen (Theme, Sprache, Shortcuts)
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'cyber',
  language VARCHAR(10) DEFAULT 'de',
  pinned_shortcuts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 3: INDEXES
-- ============================================================
CREATE INDEX idx_profiles_codename ON public.profiles(codename);
CREATE INDEX idx_teams_creator ON public.teams(creator_id);
CREATE INDEX idx_teams_invite ON public.teams(invite_code);
CREATE INDEX idx_tm_team ON public.team_members(team_id);
CREATE INDEX idx_tm_user ON public.team_members(user_id);
CREATE INDEX idx_sh_user ON public.stakeholders(user_id);
CREATE INDEX idx_pr_user ON public.projects(user_id);
CREATE INDEX idx_act_user ON public.activities(user_id);
CREATE INDEX idx_te_user ON public.time_entries(user_id);
CREATE INDEX idx_te_date ON public.time_entries(date);
CREATE INDEX idx_te_user_date ON public.time_entries(user_id, date);
CREATE INDEX idx_us_user ON public.user_settings(user_id);

-- ============================================================
-- Step 4: ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_teammates" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT tm.user_id
      FROM public.team_members tm
      WHERE tm.team_id IN (
        SELECT tm2.team_id FROM public.team_members tm2 WHERE tm2.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Teams
CREATE POLICY "teams_select" ON public.teams
  FOR SELECT USING (
    creator_id = auth.uid()
    OR id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "teams_update" ON public.teams
  FOR UPDATE USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "teams_delete" ON public.teams
  FOR DELETE USING (auth.uid() = creator_id);

-- Team Members
CREATE POLICY "tm_select" ON public.team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "tm_insert" ON public.team_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tm_delete_own" ON public.team_members
  FOR DELETE USING (auth.uid() = user_id);

-- Stakeholders (eigene Daten)
CREATE POLICY "sh_select" ON public.stakeholders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sh_insert" ON public.stakeholders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sh_update" ON public.stakeholders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sh_delete" ON public.stakeholders FOR DELETE USING (auth.uid() = user_id);

-- Projects (eigene Daten)
CREATE POLICY "pr_select" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pr_insert" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pr_update" ON public.projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pr_delete" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Activities (eigene Daten)
CREATE POLICY "act_select" ON public.activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "act_insert" ON public.activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "act_update" ON public.activities FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "act_delete" ON public.activities FOR DELETE USING (auth.uid() = user_id);

-- Time Entries (eigene + Teammitglieder lesen)
CREATE POLICY "te_select_own" ON public.time_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "te_select_teammates" ON public.time_entries
  FOR SELECT USING (
    user_id IN (
      SELECT tm.user_id
      FROM public.team_members tm
      WHERE tm.team_id IN (
        SELECT tm2.team_id FROM public.team_members tm2 WHERE tm2.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "te_insert" ON public.time_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "te_update" ON public.time_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "te_delete" ON public.time_entries FOR DELETE USING (auth.uid() = user_id);

-- User Settings (eigene Daten)
CREATE POLICY "us_select" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "us_insert" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "us_update" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Step 5: FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-Update für updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stakeholders_updated_at
  BEFORE UPDATE ON public.stakeholders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Step 6: AUTO-PROFIL bei Registrierung
-- ============================================================
-- Erstellt automatisch ein Profil, wenn sich ein neuer User registriert.
-- Der Codename wird aus den Metadaten übernommen.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, codename)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'codename', 'user_' || substr(NEW.id::text, 1, 8))
  );
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FERTIG! Alle Tabellen, Policies und Triggers sind erstellt.
-- ============================================================
