import os
import sys

# Ensure backend root is on sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from db import execute_query
from auth.routes import auth_bp
from crud.routes import crud_bp
from analytics.routes import analytics_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(auth_bp)
    app.register_blueprint(crud_bp)
    app.register_blueprint(analytics_bp)

    @app.route('/api/health', methods=['GET'])
    def health_check():
        try:
            ping_result = execute_query("SELECT 1 as ping", fetch_one=True)
            is_database_connected = bool(ping_result and ping_result.get('ping') == 1)
        except Exception as database_exception:
            return jsonify({
                'status': 'degraded',
                'database': 'disconnected',
                'error': str(database_exception)
            }), 503

        return jsonify({
            'status': 'healthy',
            'database': 'connected' if is_database_connected else 'unknown',
            'timestamp': os.environ.get('SERVER_START_TIME', '')
        }), 200

    @app.errorhandler(404)
    def handle_not_found(error_instance):
        return jsonify({
            'success': False,
            'error': {'code': 404, 'message': 'Resource or endpoint not found'}
        }), 404

    @app.errorhandler(500)
    def handle_server_error(error_instance):
        return jsonify({
            'success': False,
            'error': {'code': 500, 'message': 'Internal server error'}
        }), 500

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    print(f"Starting Netcom E-Commerce API Server on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
