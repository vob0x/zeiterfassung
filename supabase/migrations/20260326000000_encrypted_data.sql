-- ============================================================
-- Support encrypted data: drop UNIQUE constraints on name fields
-- (encrypted values use random IVs, so same plaintext → different ciphertext)
-- ============================================================

-- Drop unique constraints on name fields
ALTER TABLE public.stakeholders DROP CONSTRAINT IF EXISTS stakeholders_user_id_name_key;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_user_id_name_key;
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_user_id_name_key;
