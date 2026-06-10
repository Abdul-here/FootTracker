"""
Database utilities — re-exported from root app.py for package compatibility.
The primary API backend lives in /app.py at the project root.
"""
import importlib.util
import sys
from pathlib import Path

_root = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location("flask_backend", _root / "app.py")
_module = importlib.util.module_from_spec(_spec)
sys.modules.setdefault("flask_backend", _module)
_spec.loader.exec_module(_module)

get_db_connection = _module.get_db_connection
fetch_one = _module.fetch_one
fetch_all = _module.fetch_all
execute_write = _module.execute_write
