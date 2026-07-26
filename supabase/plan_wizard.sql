-- ═══════════════════════════════════════════════════════════
-- GOOALS — wizard de configuración de plan (fecha + visibilidad)
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════

-- Plazo elegido en el wizard: 'corto' (este mes), 'medio' (este año),
-- 'largo' (algún día) o NULL (sin fecha).
alter table planes add column if not exists fecha_plazo text;
