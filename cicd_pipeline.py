"""
CI/CD Pipeline Configuration for all_trails App

This document outlines the CI/CD pipeline setup for the all_trails application.
"""

# GitHub Actions Workflow Configuration
GITHUB_ACTIONS_WORKFLOW = '''
name: CI/CD Pipeline for all_trails App

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: test_db
        ports:
          - 3306:3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=3

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'

    - name: Install dependencies
      run: |
        pip install frappe-bench
        bench init --skip-redis-config-generation ~/frappe-bench
        cd ~/frappe-bench
        bench set-mariadb-host 127.0.0.1
        bench set_redis_cache_host localhost:6379
        bench set_redis_queue_host localhost:6379
        bench set_redis_socketio_host localhost:6379

    - name: Create sites directory
      run: |
        cd ~/frappe-bench
        mkdir -p sites
        
    - name: Create site
      run: |
        cd ~/frappe-bench
        bench new-site test_site --mariadb-root-password root --admin-password admin
        
    - name: Install all_trails app
      run: |
        cd ~/frappe-bench
        bench get-app all_trails https://github.com/your-org/all_trails.git
        bench --site test_site install-app all_trails
        
    - name: Run unit tests
      run: |
        cd ~/frappe-bench
        bench --site test_site run-tests --app all_trails

    - name: Run linting
      run: |
        cd ~/frappe-bench/apps/all_trails
        pip install flake8
        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
        flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics

  security_scan:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      
    - name: Run security scan
      uses: github/super-linter@v4
      env:
        DEFAULT_BRANCH: main
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        VALIDATE_PYTHON_BLACK: true
        VALIDATE_PYTHON_PYLINT: true
        VALIDATE_JSON: true
        VALIDATE_YAML: true

  build_frontend:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: '**/package-lock.json'

    - name: Install frontend dependencies
      run: |
        cd apps/all_trails/frontend
        npm ci

    - name: Build frontend
      run: |
        cd apps/all_trails/frontend
        npm run build

    - name: Upload frontend build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: frontend-build
        path: apps/all_trails/frontend/dist/

  deploy:
    runs-on: ubuntu-latest
    needs: [test, security_scan, build_frontend]
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to production
      run: echo "Deployment steps would go here"
      # Actual deployment steps would depend on your hosting solution
'''

# Docker Configuration
DOCKER_CONFIG = '''
# Dockerfile for all_trails app
FROM frappe/bench:latest

WORKDIR /home/frappe/frappe-bench

# Copy the app source
COPY . /home/frappe/frappe-bench/apps/all_trails

# Install the app
RUN /usr/local/bin/bench --site site1.local install-app all_trails

# Run the app
CMD ["bash", "-c", "bench start"]
'''

# Pre-commit Hooks Configuration
PRE_COMMIT_CONFIG = '''
# .pre-commit-config.yaml
repos:
- repo: https://github.com/psf/black
  rev: 22.3.0
  hooks:
    - id: black
      language_version: python3.10

- repo: https://github.com/pycqa/flake8
  rev: 4.0.1
  hooks:
    - id: flake8

- repo: https://github.com/pre-commit/mirrors-prettier
  rev: v2.6.2
  hooks:
    - id: prettier
      types_or: [javascript, jsx, ts, tsx, vue, html, css, scss, json, yaml, markdown]

- repo: https://github.com/commitizen-tools/commitizen
  rev: v2.20.0
  hooks:
    - id: commitizen
      stages: [commit-msg]
'''

# Environment Configuration
ENVIRONMENT_CONFIG = '''
# Production environment settings
production:
  bench-name: all_trails-production
  apps:
    - frappe
    - erpnext
    - all_trails
  sites:
    - all-trails.yourdomain.com:
        db_name: all_trails_prod
        admin_password: secure_password
  workers:
    - web: 4
    - socketio: 1
    - schedule: 1
    - default: 2
    - long: 1
  redis:
    cache: redis://localhost:13000
    queue: redis://localhost:11000
    socketio: redis://localhost:12000
  nginx:
    proxy: nginx
    ssl_certificate: /path/to/certificate.crt
    ssl_certificate_key: /path/to/private.key
'''

# Testing Configuration
TESTING_CONFIG = '''
# pytest.ini
[tool:pytest]
testpaths = apps/all_trails/all_trails/tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    -ra
    --strict-markers
    --disable-warnings
markers =
    slow: marks tests as slow
    integration: marks tests as integration tests
    unit: marks tests as unit tests

# .coveragerc
[run]
source = apps/all_trails/
omit = 
    */tests/*
    */node_modules/*
    */venv/*
    */__pycache__/*
    */migrations/*

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:

[html]
directory = coverage_html_report
'''

# Monitoring and Alerting Configuration
MONITORING_CONFIG = '''
# healthchecks.io setup for cron jobs
HEALTH_CHECK_URLS:
  daily_backup: "https://hc-ping.com/YOUR-UUID-HERE/daily"
  hourly_site_health: "https://hc-ping.com/YOUR-UUID-HERE/hourly"
  weekly_maintenance: "https://hc-ping.com/YOUR-UUID-HERE/weekly"

# Log rotation configuration
LOG_ROTATION:
  apps/all_trails/logs/all_trails.log:
    rotate: 12
    monthly: true
    compress: true
    delaycompress: true
    missingok: true
    notifempty: true
'''

PIPELINE_BEST_PRACTICES = [
    "1. Always run tests before merging to main branch",
    "2. Implement security scanning in CI pipeline",
    "3. Use environment-specific configurations",
    "4. Implement proper logging and monitoring",
    "5. Use infrastructure as code (Terraform, Ansible, etc.)",
    "6. Implement blue-green deployments for zero-downtime releases",
    "7. Use feature flags for safer deployments",
    "8. Monitor application performance and errors in real-time"
]

DEPLOYMENT_CHECKLIST = [
    "✓ Run full test suite",
    "✓ Security scan passed",
    "✓ Frontend build successful",
    "✓ Database migrations tested",
    "✓ Performance benchmarks met",
    "✓ Rollback plan prepared",
    "✓ Monitoring configured",
    "✓ Stakeholders notified"
]

print("CI/CD Pipeline Configuration for all_trails App")
print("=" * 50)
print("This configuration includes:")
print("- GitHub Actions workflow for CI/CD")
print("- Docker configuration for containerization")
print("- Pre-commit hooks for code quality")
print("- Environment configuration for different stages")
print("- Testing configuration with coverage")
print("- Monitoring and alerting setup")
print("- Best practices and deployment checklist")
print()
print("To implement this pipeline:")
print("1. Add the GitHub Actions workflow to .github/workflows/")
print("2. Set up the required secrets in GitHub repository settings")
print("3. Configure your hosting environment")
print("4. Set up monitoring and alerting services")
print("5. Train team members on the new processes")
'''

# Package the configuration
PIPELINE_CONFIGURATION = {
    "github_actions": GITHUB_ACTIONS_WORKFLOW,
    "docker_config": DOCKER_CONFIG,
    "pre_commit": PRE_COMMIT_CONFIG,
    "environment": ENVIRONMENT_CONFIG,
    "testing": TESTING_CONFIG,
    "monitoring": MONITORING_CONFIG,
    "best_practices": PIPELINE_BEST_PRACTICES,
    "deployment_checklist": DEPLOYMENT_CHECKLIST
}

def get_pipeline_config(component: str = None):
    """
    Get specific component of the pipeline configuration
    
    Args:
        component: Name of the component to retrieve (optional)
    
    Returns:
        Configuration component or all components if none specified
    """
    if component:
        return PIPELINE_CONFIGURATION.get(component, f"Component '{component}' not found")
    return PIPELINE_CONFIGURATION

if __name__ == "__main__":
    print("CI/CD Pipeline Configuration for all_trails App")
    print("=" * 50)
    for key, value in PIPELINE_CONFIGURATION.items():
        if isinstance(value, list):
            print(f"\n{key.upper()}:")
            for item in value:
                print(f"  - {item}")
        else:
            print(f"\n{key.upper()}:")
            print(value[:200] + "..." if len(str(value)) > 200 else value)