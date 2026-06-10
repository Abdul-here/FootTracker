"""Application entry point — loads Flask app from app.py (JSON API backend)."""
import importlib.util
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("flask_backend", _root / "app.py")
_module = importlib.util.module_from_spec(_spec)
sys.modules["flask_backend"] = _module
_spec.loader.exec_module(_module)

app = _module.app

if __name__ == "__main__":
    app.run(debug=True)
