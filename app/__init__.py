from pathlib import Path
import secrets
from flask import Flask, abort, redirect, request, session
from flask_cors import CORS
from flask_talisman import Talisman
from .config import config
from .extensions import socketio, limiter


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

    # Initialize extensions
    socketio.init_app(app)
    limiter.init_app(app)
    
    # Configure Talisman for basic security headers (relaxed for local dev)
    Talisman(app, content_security_policy=None, force_https=False)


    # Register routes
    from .routes import main_bp
    app.register_blueprint(main_bp)

    # Register events
    from . import events

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

    @app.before_request
    def redirect_local_requests_to_tunnel():
        if not app.config.get('TUNNEL_AUTO_REDIRECT'):
            return None
        if request.method not in ('GET', 'HEAD'):
            return None
        if request.path.startswith('/api/'):
            return None

        host = request.host.split(':', 1)[0].lower()
        if host not in {'localhost', '127.0.0.1'}:
            return None

        tunnel_url = (app.config.get('TUNNEL_PUBLIC_URL') or '').strip()
        if not tunnel_url:
            tunnel_file = Path(app.config.get('TUNNEL_URL_FILE', ''))
            if tunnel_file.is_file():
                tunnel_url = tunnel_file.read_text(encoding='utf-8').strip()

        if not tunnel_url or not tunnel_url.startswith(('http://', 'https://')):
            return None

        query = f"?{request.query_string.decode('utf-8')}" if request.query_string else ''
        target_url = f"{tunnel_url.rstrip('/')}{request.path}{query}"
        return redirect(target_url, code=302)

    return app
