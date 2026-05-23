-- ============================================================
-- NutriVigilancia — Seed (usuarios demo)
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

-- Crear usuarios en Supabase Auth via Dashboard o CLI:
--
--   supabase auth signup --email anl@demo.pe --password demo1234
--   supabase auth signup --email cli@demo.pe --password demo1234
--
-- Luego insertar sus perfiles manualmente con los UUIDs generados:

-- EJEMPLO (reemplazar UUIDs por los reales de auth.users):
-- INSERT INTO profiles (id, nombre, email, rol, establecimiento, habilitado)
-- VALUES
--   ('UUID-ANL-AQUI', 'Lic. Carlos Ramos', 'anl@demo.pe', 'ANL', NULL, true),
--   ('UUID-CLI-AQUI', 'Dra. Ana Torres',   'cli@demo.pe', 'CLI', 'C.S. Ventanilla', true);

-- ── Alternativa: crear ambos usuarios con Supabase Admin API ─
-- POST https://<project>.supabase.co/auth/v1/admin/users
-- Authorization: Bearer <service_key>
-- {
--   "email": "anl@demo.pe",
--   "password": "demo1234",
--   "email_confirm": true,
--   "user_metadata": { "nombre": "Lic. Carlos Ramos", "rol": "ANL" }
-- }
