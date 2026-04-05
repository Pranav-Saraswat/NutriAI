import os
from app import create_app
from app.extensions import socketio

config_name = os.environ.get('APP_ENV', 'development')
app = create_app(config_name)

if __name__ == '__main__':
    socketio.run(
        app,
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5000)),
        debug=config_name == 'development',
        allow_unsafe_werkzeug=True
    )
