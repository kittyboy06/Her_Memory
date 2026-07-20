@echo off
setlocal enabledelayedexpansion

echo Starting deployment process for Aashifa Diary...

REM Ensure we are in a git repository
if not exist .git (
    echo Initializing git repository...
    git init
)

REM Check if origin remote exists
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo No git remote found.
    set /p GH_USER="Enter your GitHub username: "
    set /p GH_REPO="Enter your GitHub repository name (e.g. Her_Memory): "
    
    if "!GH_USER!"=="" (
        echo Username cannot be empty. Aborting.
        exit /b 1
    )
    if "!GH_REPO!"=="" (
        echo Repository cannot be empty. Aborting.
        exit /b 1
    )
    
    git remote add origin "https://github.com/!GH_USER!/!GH_REPO!.git"
    echo Remote added: https://github.com/!GH_USER!/!GH_REPO!.git
)

REM Build React App if react-app directory exists
if exist "react-app\package.json" (
    echo Building React App...
    pushd react-app
    call npm run build
    popd
)

REM Get the commit message from argument 1, or use default
set COMMIT_MSG=%~1
if "%COMMIT_MSG%"=="" (
    set COMMIT_MSG=Update Aashifa Diary app
)

echo Staging files...
git add .

REM Check if there are changes to commit
git status --porcelain | findstr /R "." >nul 2>&1
if errorlevel 1 (
    echo Working tree is clean. Nothing new to commit.
) else (
    echo Committing changes with message: "%COMMIT_MSG%"...
    git commit -m "%COMMIT_MSG%"
)

REM Get the current branch
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%i

echo Pushing code to GitHub origin (%BRANCH% branch)...
git push -u origin "%BRANCH%"

echo.
echo Deployment finished! If your GitHub Actions / GitHub Pages are configured, your app will update automatically.
