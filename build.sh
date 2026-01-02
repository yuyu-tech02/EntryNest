#!/usr/bin/env bash
# build.sh - Render Build Script for EntryNest
# This script runs during Render's build phase

set -o errexit  # Exit on error

echo "=== EntryNest Build Script ==="

# Navigate to project root (script is in project root)
cd "$(dirname "$0")"

echo "1. Building Frontend..."
cd frontend
npm ci
npm run build
cd ..

echo "2. Copying frontend build to Django static/templates..."
# Copy index.html to Django templates
mkdir -p backend/templates/frontend
cp frontend/dist/index.html backend/templates/frontend/

# Copy assets to Django static
mkdir -p backend/static/frontend/assets
cp -r frontend/dist/assets/* backend/static/frontend/assets/

# Copy other static files if they exist (favicon, etc.)
[ -f frontend/dist/favicon.ico ] && cp frontend/dist/favicon.ico backend/static/frontend/ || true
[ -f frontend/dist/robots.txt ] && cp frontend/dist/robots.txt backend/static/frontend/ || true

echo "3. Setting up Backend..."
cd backend

# Install Python dependencies
pip install -r requirements.txt

echo "4. Running Django collectstatic..."
python manage.py collectstatic --noinput

echo "5. Running Django migrations..."
python manage.py migrate --noinput

echo "=== Build Complete ==="
