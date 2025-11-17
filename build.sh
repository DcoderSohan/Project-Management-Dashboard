#!/bin/bash
# Build script for production deployment
# This builds the frontend and ensures it's available for the backend to serve

echo "🔨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "✅ Frontend build complete!"
echo "📁 Frontend dist folder: frontend/dist"

