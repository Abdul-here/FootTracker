"""Flask application factory."""
from flask import Flask

from app.config import Config


def create_app(config_class=Config):
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Blueprints will be registered here in later steps
    # from app.routes import register_blueprints
    # register_blueprints(app)

    return app
