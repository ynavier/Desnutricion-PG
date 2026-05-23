from supabase import create_client, Client
from app.config import settings

# Cliente con service key — bypasa RLS para operaciones del servidor
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_key)

# Cliente con anon key — respeta RLS (usado solo para auth)
supabase_anon: Client = create_client(settings.supabase_url, settings.supabase_anon_key)
