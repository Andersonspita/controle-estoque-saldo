#!/bin/sh
set -eu

mkdir -p /app/backend/uploads/notas_fiscais
cd /app/backend
alembic upgrade head
exec fastapi run src.main:app --host 0.0.0.0 --port 8000
