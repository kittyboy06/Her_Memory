@echo off
setlocal enabledelayedexpansion

echo 🌸 Starting deployment process for Aashifa Diary...

:: Ensure we're in a git repository
if not exist .git (
    echo Initializing git repository...
    git init
)

:: Check if a remote named 'origin' exists
git remote | findstr /R "^origin$" >nul
if errorlevel 1 (
    echo ⚠️ No git remote found.
    set /p GH_USER="Enter your GitHub username: "
    set /p GH_REPO="Enter your GitHub repository name (e.g. aashifa-diary): "
    
    if "!GH_USER!"=="" (
        echo ❌ Username cannot be empty. Aborting.
        exit /b 1
    )
    if "!GH_REPO!"=="" (
        echo ❌ Repository cannot be empty. Aborting.
        exit /b 1
    )
    
    git remote add origin "https://github.com/!GH_USER!/!GH_REPO!.git"
    echo ✅ Remote added: https://github.com/!GH_USER!/!GH_REPO!.git
)

:: Get the commit message from the first argument, or use a default
set COMMIT_MSG=%~1
if "%COMMIT_MSG%"=="" (
    set COMMIT_MSG=Update Aashifa Diary app
)

echo 📦 Staging files...
git add .

echo 📝 Committing changes (Message: "%COMMIT_MSG%")...
git commit -m "%COMMIT_MSG%"

:: Get the current branch (usually master or main)
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%i

echo 🚀 Pushing code to GitHub (%BRANCH% branch)...
git push -u origin "%BRANCH%"

echo.
echo ✨ All done! If your GitHub Actions secrets are set, your app is now building and deploying to GitHub Pages.
