from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000"
    secret_key: str
    # Этап 0, коммит 7: короткий access (15 мин) + отдельный refresh (30 дней)
    # вместо единственного 7-дневного токена. Старое имя переменной сохранено
    # (это концептуально та же настройка — время жизни access-токена), но
    # старое значение 10080 полностью выведено из употребления — см. решение
    # по вопросу 6 в docs/PHASE0_ANALYSIS.md.
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    # Этап 2, коммит 3 (docs/PHASE2_ANALYSIS.md, решение 7) — скидка на счёте
    # выше этого порога требует подтверждения head_doctor. Таблицы Settings
    # ещё нет (появится в Этапе 6 разом для всех настроек) — пока просто
    # env-переменная, правка требует передеплоя.
    default_discount_threshold_percent: int = 10

    class Config:
        env_file = ".env"

settings = Settings()