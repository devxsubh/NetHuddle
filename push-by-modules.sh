#!/bin/bash

# Script to push code module by module
# This script creates separate commits for each module and allows pushing them incrementally

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if git is initialized
if [ ! -d .git ]; then
    echo -e "${YELLOW}Initializing git repository...${NC}"
    git init
    echo -e "${GREEN}Git repository initialized!${NC}"
fi

# Function to commit and optionally push a module
commit_module() {
    local module_name=$1
    local module_path=$2
    local description=$3
    
    echo -e "\n${BLUE}=== Processing $module_name ===${NC}"
    
    # Check if files exist (for untracked files)
    local files_exist=false
    for path in $module_path; do
        if [ -e "$path" ] 2>/dev/null; then
            files_exist=true
            break
        fi
    done
    
    if [ "$files_exist" = false ]; then
        echo -e "${YELLOW}No files found for $module_name. Skipping...${NC}"
        return 0
    fi
    
    # Check if there are any changes (tracked or untracked)
    local has_changes=false
    
    # Check untracked files
    for path in $module_path; do
        if git ls-files --others --exclude-standard -- "$path" 2>/dev/null | grep -q .; then
            has_changes=true
            break
        fi
    done
    
    # Check tracked file changes
    if ! $has_changes; then
        if ! git diff --quiet --exit-code -- "$module_path" 2>/dev/null || \
           ! git diff --quiet --cached --exit-code -- "$module_path" 2>/dev/null; then
            has_changes=true
        fi
    fi
    
    if [ "$has_changes" = false ]; then
        echo -e "${YELLOW}No changes detected in $module_name. Skipping...${NC}"
        return 0
    fi
    
    # Stage the module files
    git add "$module_path" 2>/dev/null
    
    # Check if anything was staged
    if git diff --quiet --cached --exit-code 2>/dev/null; then
        echo -e "${YELLOW}No changes to commit for $module_name.${NC}"
        return 0
    fi
    
    # Commit
    echo -e "${BLUE}Committing $module_name...${NC}"
    if git commit -m "feat: add $module_name module

$description" 2>&1; then
        echo -e "${GREEN}✓ $module_name committed${NC}"
    else
        echo -e "${YELLOW}Commit failed or no changes to commit for $module_name${NC}"
        return 1
    fi
}

# Function to push a specific commit
push_module() {
    local module_name=$1
    local remote=${2:-origin}
    local branch=${3:-main}
    
    echo -e "\n${BLUE}=== Pushing $module_name ===${NC}"
    
    # Check if remote exists
    if ! git remote | grep -q "^$remote$"; then
        echo -e "${YELLOW}Remote '$remote' does not exist.${NC}"
        echo -e "${YELLOW}Please add remote first: git remote add origin <url>${NC}"
        return 1
    fi
    
    # Check if there are any commits
    if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
        echo -e "${YELLOW}No commits found. Please commit files first before pushing.${NC}"
        echo -e "${YELLOW}Run option 1 to commit all modules first.${NC}"
        return 1
    fi
    
    # Check if branch exists locally
    if ! git branch --list | grep -q "^\s*$branch$"; then
        echo -e "${BLUE}Branch '$branch' does not exist locally. Will create on first push.${NC}"
    fi
    
    # Push the current branch (use -u for first push to set upstream)
    echo -e "${BLUE}Pushing to $remote/$branch...${NC}"
    if git push -u "$remote" "$branch" 2>&1; then
        echo -e "${GREEN}✓ $module_name pushed successfully${NC}"
    else
        echo -e "${YELLOW}Push may have failed. Check your remote configuration and credentials.${NC}"
        return 1
    fi
}

# Main menu
show_menu() {
    echo -e "\n${BLUE}=== Module-Based Git Push Script ===${NC}"
    echo "1. Commit all modules (without pushing)"
    echo "2. Commit and push all modules"
    echo "3. Commit specific module"
    echo "4. Push specific module (must be committed first)"
    echo "5. Show status"
    echo "6. Show log (last 10 commits)"
    echo "7. Exit"
    echo -n "Choose an option: "
}

# Commit all modules in order
commit_all_modules() {
    echo -e "\n${BLUE}=== Committing all modules ===${NC}\n"
    
    # 1. Root Configuration Files
    commit_module "Root Configuration" "package.json package-lock.json jsconfig.json ecosystem.config.js .babelrc Procfile LICENSE README.md" \
        "Add root configuration files including package.json, build configs, and documentation"
    
    # 2. Git Configuration
    commit_module "Git Configuration" ".gitignore" \
        "Add gitignore configuration"
    
    # 3. Config Module
    commit_module "Config Module" "src/config/" \
        "Add configuration module including environment config, logger, mongoose setup, and passport configuration"
    
    # 4. Utils Module
    commit_module "Utils Module" "src/utils/" \
        "Add utility functions including API error handling, async wrapper, and image resizing"
    
    # 5. Models Module
    commit_module "Models Module" "src/models/" \
        "Add database models including user, role, token, permission models and plugins"
    
    # 6. Validations Module
    commit_module "Validations Module" "src/validations/" \
        "Add request validation schemas for auth, user, role, and custom validations"
    
    # 7. Services Module
    commit_module "Services Module" "src/services/" \
        "Add business logic services including JWT service, token service, and email service"
    
    # 8. Middlewares Module
    commit_module "Middlewares Module" "src/middlewares/" \
        "Add express middlewares including authentication, error handling, rate limiting, validation, and image upload"
    
    # 9. Controllers Module
    commit_module "Controllers Module" "src/controllers/" \
        "Add route controllers for authentication, users, roles, and image handling"
    
    # 10. Routes Module
    commit_module "Routes Module" "src/routes/" \
        "Add API routes including auth, user, role, and image routes"
    
    # 11. Core Application
    commit_module "Core Application" "src/app.js src/index.js" \
        "Add core application files including Express app setup and server initialization"
    
    # 12. Public Assets
    commit_module "Public Assets" "public/" \
        "Add public assets including static HTML and images"
    
    echo -e "\n${GREEN}=== All modules committed! ===${NC}"
}

# Push all modules
push_all_modules() {
    echo -e "\n${BLUE}=== Committing and pushing all modules ===${NC}\n"
    
    commit_all_modules
    
    echo -e "\n${BLUE}=== Pushing all commits ===${NC}\n"
    
    read -p "Enter remote name (default: origin): " remote
    remote=${remote:-origin}
    
    read -p "Enter branch name (default: main): " branch
    branch=${branch:-main}
    
    push_module "All modules" "$remote" "$branch"
}

# Commit specific module
commit_specific_module() {
    echo -e "\n${BLUE}Available modules:${NC}"
    echo "1. Root Configuration"
    echo "2. Git Configuration"
    echo "3. Config Module"
    echo "4. Utils Module"
    echo "5. Models Module"
    echo "6. Validations Module"
    echo "7. Services Module"
    echo "8. Middlewares Module"
    echo "9. Controllers Module"
    echo "10. Routes Module"
    echo "11. Core Application"
    echo "12. Public Assets"
    
    read -p "Select module number: " module_num
    
    case $module_num in
        1) commit_module "Root Configuration" "package.json package-lock.json jsconfig.json ecosystem.config.js .babelrc Procfile LICENSE README.md" \
           "Add root configuration files" ;;
        2) commit_module "Git Configuration" ".gitignore" \
           "Add gitignore configuration" ;;
        3) commit_module "Config Module" "src/config/" \
           "Add configuration module" ;;
        4) commit_module "Utils Module" "src/utils/" \
           "Add utility functions" ;;
        5) commit_module "Models Module" "src/models/" \
           "Add database models" ;;
        6) commit_module "Validations Module" "src/validations/" \
           "Add request validation schemas" ;;
        7) commit_module "Services Module" "src/services/" \
           "Add business logic services" ;;
        8) commit_module "Middlewares Module" "src/middlewares/" \
           "Add express middlewares" ;;
        9) commit_module "Controllers Module" "src/controllers/" \
           "Add route controllers" ;;
        10) commit_module "Routes Module" "src/routes/" \
            "Add API routes" ;;
        11) commit_module "Core Application" "src/app.js src/index.js" \
            "Add core application files" ;;
        12) commit_module "Public Assets" "public/" \
            "Add public assets" ;;
        *) echo -e "${YELLOW}Invalid option${NC}" ;;
    esac
}

# Push specific module
push_specific_module() {
    read -p "Enter remote name (default: origin): " remote
    remote=${remote:-origin}
    
    read -p "Enter branch name (default: main): " branch
    branch=${branch:-main}
    
    push_module "Code" "$remote" "$branch"
}

# Main loop
main() {
    if [ "$1" = "auto-commit-all" ]; then
        commit_all_modules
        exit 0
    fi
    
    if [ "$1" = "auto-push-all" ]; then
        push_all_modules
        exit 0
    fi
    
    while true; do
        show_menu
        read choice
        
        case $choice in
            1) commit_all_modules ;;
            2) push_all_modules ;;
            3) commit_specific_module ;;
            4) push_specific_module ;;
            5) git status ;;
            6) if git rev-parse --verify HEAD >/dev/null 2>&1; then git log --oneline -10; else echo -e "${YELLOW}No commits yet${NC}"; fi ;;
            7) echo -e "${GREEN}Exiting...${NC}"; exit 0 ;;
            *) echo -e "${YELLOW}Invalid option${NC}" ;;
        esac
    done
}

main "$@"

