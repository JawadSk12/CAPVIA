#!/bin/bash
set -e

# Change to the directory of this script
cd "$(dirname "$0")"

echo "=== Capvia AI Simulation Backend Setup ==="

# 1. Recreate venv with Python 3.12 if not exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment using Python 3.12..."
    /opt/homebrew/bin/python3.12 -m venv venv
else
    echo "Virtual environment already exists."
fi

# 2. Create local temp and cache directories to bypass system drive space limit
echo "Creating temporary and cache directories on Kingston drive..."
mkdir -p pip_tmp
mkdir -p pip_cache

# 3. Upgrade pip and setuptools
echo "Upgrading pip, setuptools, and wheel..."
TMPDIR=pip_tmp PIP_CACHE_DIR=pip_cache ./venv/bin/pip install --upgrade pip setuptools wheel

# 4. Install requirements
echo "Installing dependencies from requirements.txt..."
TMPDIR=pip_tmp PIP_CACHE_DIR=pip_cache ./venv/bin/pip install -r requirements.txt

# 5. Clean up temporary directory
echo "Cleaning up temporary files..."
rm -rf pip_tmp

echo "=== Setup Completed Successfully! ==="
