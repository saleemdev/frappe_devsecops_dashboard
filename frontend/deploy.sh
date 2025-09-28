#!/bin/bash

# Build and deploy React frontend to Frappe
echo "Building React frontend..."
npm run build

echo "Clearing Frappe website cache..."
cd ../../..
bench clear-website-cache

echo "Frontend deployed successfully!"
echo "Visit: http://localhost:8000/frontend"
