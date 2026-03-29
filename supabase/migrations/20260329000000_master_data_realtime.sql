-- Enable Realtime for master data tables (cross-device category sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.stakeholders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.formats;
