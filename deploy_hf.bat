@echo off
echo ===================================================
echo  K-AVM-Prototype Hugging Face Spaces Deploy Script
echo ===================================================
echo.

:: 1. Git staging and commit
echo [1/3] Staging changes and committing...
git add .
git commit -m "deploy: Hugging Face Space Docker 배포 통합"
echo.

:: 2. Register Hugging Face remote (Check if 'hf' remote already exists)
echo [2/3] Checking Hugging Face remote repository...
git remote | findstr /i "^hf$" > nul
if errorlevel 1 (
    echo Remote 'hf' not found. Registering: https://huggingface.co/spaces/donggyuuu/K-AVM-Prototype
    git remote add hf https://huggingface.co/spaces/donggyuuu/K-AVM-Prototype
) else (
    echo Remote 'hf' already registered.
)
echo.

:: 3. Push to Hugging Face (Prompting user for git credential details if required)
echo [3/3] Pushing code to Hugging Face Spaces (main branch)...
echo.
echo * Note: When prompted for a password, please use your Hugging Face Access Token with WRITE permission.
echo   You can generate one here: https://huggingface.co/settings/tokens
echo.
git push -f hf main

echo.
echo ===================================================
echo  Deploy request finished.
echo  Hugging Face Space will start building the Docker image shortly.
echo  Check logs at: https://huggingface.co/spaces/donggyuuu/K-AVM-Prototype
echo ===================================================
pause
