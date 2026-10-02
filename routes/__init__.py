"""
SmartBook Route Blueprints Package
"""

from .auth import auth_bp
from .main import main_bp
from .api import api_bp

__all__ = ['auth_bp', 'main_bp', 'api_bp']
