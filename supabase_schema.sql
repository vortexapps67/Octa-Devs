-- Octa Devs Supabase Schema Migration
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/bofgjrslnvtlvikdopxi/sql

-- 1. Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    socials JSONB DEFAULT '{}'::jsonb,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Mobile App',
    description TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    project_url TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Coming Soon', -- 'Published', 'Coming Soon', 'Draft'
    featured BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create launch_settings table (single-row configuration)
CREATE TABLE IF NOT EXISTS public.launch_settings (
    id TEXT PRIMARY KEY DEFAULT 'launch_config',
    title TEXT NOT NULL DEFAULT 'Octa Devs Platform Launch',
    subtitle TEXT DEFAULT 'We are launching ambitious mobile and web applications soon.',
    target_date TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all users
DROP POLICY IF EXISTS "Public read access for team_members" ON public.team_members;
CREATE POLICY "Public read access for team_members" ON public.team_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for projects" ON public.projects;
CREATE POLICY "Public read access for projects" ON public.projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for launch_settings" ON public.launch_settings;
CREATE POLICY "Public read access for launch_settings" ON public.launch_settings FOR SELECT USING (true);

-- Allow service role full access (bypass RLS for server secret key)
-- Note: Supabase service_role keys automatically bypass RLS.

-- Seed default initial records if empty
INSERT INTO public.launch_settings (id, title, subtitle, target_date, is_active)
VALUES (
    'launch_config',
    'Octa Devs Platform Launch',
    'We are currently designing and building new mobile and web applications. Check back soon for what’s next from Octa Devs.',
    timezone('utc'::text, now() + interval '24 days'),
    true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_members (name, role, bio, avatar_url, sort_order)
VALUES
    ('Aarav Sharma', 'Co-Founder & Lead Engineer', 'Full-stack & mobile systems engineer focused on scalable application architecture and high-performance products.', '', 1),
    ('Akshansh Sinha', 'Co-Founder & Product Designer', 'Product strategist and designer crafting intuitive, high-craft digital interfaces and mobile experiences.', '', 2)
ON CONFLICT DO NOTHING;
