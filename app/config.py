import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


def env_bool(name, default=False):
    """Read a boolean environment variable."""
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}

class Config:
    """Base configuration class."""
    
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-me'
    APP_ENV = os.environ.get('APP_ENV', 'development')
    
    # MongoDB Configuration
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/')
    MONGO_DB_NAME = os.environ.get('MONGO_DB_NAME', 'nutriai_db')
    MONGO_TIMEOUT_MS = int(os.environ.get('MONGO_TIMEOUT_MS', 3000))
    
    # Groq Configuration
    GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
    GROQ_MODEL = os.environ.get('GROQ_MODEL', 'llama-3.1-8b-instant')

    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '')
    
    # App Settings
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16777216))
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(days=int(os.environ.get('SESSION_LIFETIME_DAYS', 30)))


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SESSION_COOKIE_SECURE = env_bool('SESSION_COOKIE_SECURE', False)


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SESSION_COOKIE_SECURE = env_bool('SESSION_COOKIE_SECURE', True)


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
