from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')

    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    supabase_jwt_secret: str

    google_api_key: str = ''
    groq_api_key: str = ''

    models_dir:     Path = Path('../models')
    data_uploads_dir: Path = Path('../data/uploads')   # archivos subidos por usuarios
    data_proc_dir:  Path = Path('../data/processed')   # CSVs procesados por ETL
    app_env: str = 'development'
    cors_origins: str = 'http://localhost:5173'

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(',')]


settings = Settings()
