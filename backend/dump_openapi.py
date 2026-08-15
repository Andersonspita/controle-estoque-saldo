import sys
import json
import traceback

sys.path.insert(0, ".")

try:
    from src.main import app
    schema = app.openapi()
    with open("openapi_dump.json", "w") as f:
        json.dump(schema, f)
    print("SUCCESS")
except Exception as e:
    traceback.print_exc()
