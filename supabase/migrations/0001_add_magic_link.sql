-- Magic-link access for the account portal (/cuenta).
-- This project uses Supabase, not Prisma, so the columns live on `profiles`
-- (there is no Prisma `User` model). Run this in the Supabase SQL editor.

alter table public.profiles
  add column if not exists magic_link_token  text,
  add column if not exists magic_link_expiry timestamptz;
