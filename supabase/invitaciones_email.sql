-- ═══════════════════════════════════════════════════════════
-- GOOALS — Invitaciones por email
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════

create table if not exists invitaciones_email (
  id uuid default gen_random_uuid() primary key,
  email_destino text not null,
  invitado_por uuid references auth.users(id) on delete cascade,
  nombre_invitador text,
  -- Va en la URL pública /invite/<token>, así que sin guiones para que se lea
  -- y se comparta mejor. El default lo genera Postgres: la API nunca lo envía.
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  aceptada boolean default false,
  created_at timestamp default now()
);

create index if not exists invitaciones_email_token_idx on invitaciones_email (token);
create index if not exists invitaciones_email_invitador_idx on invitaciones_email (invitado_por, created_at desc);

alter table invitaciones_email enable row level security;

-- Sin policies: solo la service_role (que salta RLS) toca esta tabla desde
-- /api/invitar. El cliente nunca lee ni escribe aquí — el token es un secreto
-- que solo debe viajar por email.
