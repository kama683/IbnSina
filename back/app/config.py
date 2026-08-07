from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000"
    secret_key: str
    access_token_expire_minutes: int = 60 * 24 * 7

    class Config:
        env_file = ".env"

settings = Settings()