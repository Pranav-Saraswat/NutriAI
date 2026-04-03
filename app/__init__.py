import secrets
from flask import Flask, abort, request, session
from flask_cors import CORS
from .config import config


def create_app(config_name='development'):
    """Application factory for creating Flask app."""
    
    app = Flask(
        __name__,
        template_folder='../templates',
        static_folder='../static'
    )
    app.config.from_object(config[config_name])
    
    # Enable CORS for API endpoints
    cors_origins = app.config.get('CORS_ORIGINS')
    if cors_origins:
        allowed_origins = [origin.strip() for origin in cors_origins.split(',') if origin.strip()]
    else:
        allowed_origins = ['http://127.0.0.1:5000', 'http://localhost:5000']
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)
    
    # Initialize database
    from .models import db
    db.init_app(app)

    # Register routes
    from .routes import main_bp
    app.register_blueprint(main_bp)

    @app.context_processor
    def inject_csrf_token():
        if '_csrf_token' not in session:
            session['_csrf_token'] = secrets.token_hex(16)
        return {'csrf_token': session['_csrf_token']}

    @app.before_request
    def protect_against_csrf():
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return None

        session_token = session.get('_csrf_token')
        request_token = request.headers.get('X-CSRFToken') or request.form.get('csrf_token')
        if not session_token or not request_token or session_token != request_token:
            abort(400, description='CSRF validation failed.')

    @app.after_request
    def add_security_headers(response):
        response.headers.setdefault('X-Content-Type-Options', 'nosniff')
        response.headers.setdefault('X-Frame-Options', 'SAMEORIGIN')
        response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers.setdefault('Cache-Control', 'no-store')
        return response
    
    return app
