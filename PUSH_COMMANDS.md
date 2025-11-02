# Module-Based Git Push Commands

This guide helps you push your code module by module for better version control and easier code review.

## Quick Start

### Step 1: Make the script executable:
```bash
chmod +x push-by-modules.sh
```

### Step 2: Initialize Git (if not already done):
```bash
git init
git remote add origin <your-repo-url>
```

### Step 3: Use the script

#### Option A: Interactive Mode (Recommended for first time):
```bash
./push-by-modules.sh
```
Then choose option **1** to commit all modules first, then option **4** to push.

#### Option B: Automatic Commit All (without pushing):
```bash
./push-by-modules.sh auto-commit-all
```

#### Option C: Automatic Commit and Push All:
```bash
./push-by-modules.sh auto-push-all
```

**Important**: If you have no commits yet, you must commit modules first before pushing. Use option 1 or auto-commit-all first.

## Manual Commands (Module by Module)

If you prefer to run commands manually, here's a step-by-step guide:

### 1. Initialize Git (if not already done)
```bash
git init
git remote add origin <your-repo-url>
```

### 2. Commit Root Configuration Files
```bash
git add package.json package-lock.json jsconfig.json ecosystem.config.js .babelrc Procfile LICENSE README.md
git commit -m "feat: add root configuration module

Add root configuration files including package.json, build configs, and documentation"
git push origin main
```

### 3. Commit Git Configuration
```bash
git add .gitignore
git commit -m "feat: add git configuration

Add gitignore configuration"
git push origin main
```

### 4. Commit Config Module
```bash
git add src/config/
git commit -m "feat: add config module

Add configuration module including environment config, logger, mongoose setup, and passport configuration"
git push origin main
```

### 5. Commit Utils Module
```bash
git add src/utils/
git commit -m "feat: add utils module

Add utility functions including API error handling, async wrapper, and image resizing"
git push origin main
```

### 6. Commit Models Module
```bash
git add src/models/
git commit -m "feat: add models module

Add database models including user, role, token, permission models and plugins"
git push origin main
```

### 7. Commit Validations Module
```bash
git add src/validations/
git commit -m "feat: add validations module

Add request validation schemas for auth, user, role, and custom validations"
git push origin main
```

### 8. Commit Services Module
```bash
git add src/services/
git commit -m "feat: add services module

Add business logic services including JWT service, token service, and email service"
git push origin main
```

### 9. Commit Middlewares Module
```bash
git add src/middlewares/
git commit -m "feat: add middlewares module

Add express middlewares including authentication, error handling, rate limiting, validation, and image upload"
git push origin main
```

### 10. Commit Controllers Module
```bash
git add src/controllers/
git commit -m "feat: add controllers module

Add route controllers for authentication, users, roles, and image handling"
git push origin main
```

### 11. Commit Routes Module
```bash
git add src/routes/
git commit -m "feat: add routes module

Add API routes including auth, user, role, and image routes"
git push origin main
```

### 12. Commit Core Application
```bash
git add src/app.js src/index.js
git commit -m "feat: add core application

Add core application files including Express app setup and server initialization"
git push origin main
```

### 13. Commit Public Assets
```bash
git add public/
git commit -m "feat: add public assets

Add public assets including static HTML and images"
git push origin main
```

## Alternative: Commit All, Then Push Incrementally

If you want to commit everything first, then push module by module:

### Commit all modules without pushing:
```bash
# Run the script in auto-commit-all mode
./push-by-modules.sh auto-commit-all
```

### Then push commits one by one:
```bash
# Push the first commit
git push origin main

# Or push specific number of commits using rebase
# This approach requires more advanced git knowledge
```

## Module Structure

Your project is organized into the following modules:

1. **Root Configuration** - package.json, config files, docs
2. **Git Configuration** - .gitignore
3. **Config Module** - src/config/ (environment, logger, mongoose, passport)
4. **Utils Module** - src/utils/ (error handling, async, image utilities)
5. **Models Module** - src/models/ (database models and plugins)
6. **Validations Module** - src/validations/ (request validation schemas)
7. **Services Module** - src/services/ (business logic services)
8. **Middlewares Module** - src/middlewares/ (express middlewares)
9. **Controllers Module** - src/controllers/ (route controllers)
10. **Routes Module** - src/routes/ (API routes)
11. **Core Application** - src/app.js, src/index.js
12. **Public Assets** - public/ (static files)

## Tips

- Check status before pushing: `git status`
- View commit history: `git log --oneline`
- If a module has no changes, it will be skipped automatically
- The script checks for changes before committing to avoid empty commits
- You can customize commit messages in the script if needed

