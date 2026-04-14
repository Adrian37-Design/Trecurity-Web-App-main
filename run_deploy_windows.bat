@echo off
set SERVER_IP=173.212.196.228
set SERVER_USER=root
set REMOTE_DIR=/var/www/trecurity

echo ========================================================
echo  Trecurity Auto-Deployment Script for Windows
echo  Server: %SERVER_IP%
echo ========================================================
echo.
echo  This script will:
echo  1. Compress your project (excluding node_modules, .git, etc.)
echo  2. Upload the compressed package to Contabo
echo  3. Connect you to the server to finish deployment
echo.
echo  ⚠️  You will be prompted for the server password: iVeGjPz!d7ip8xQ
echo.
pause

echo.
echo [1/4] creating deployment package...
if exist deploy_package.tar del deploy_package.tar
tar --exclude="node_modules" --exclude=".git" --exclude=".nuxt" --exclude=".output" --exclude="deploy_package.tar" --exclude=".env" -cvf deploy_package.tar .

echo.
echo [2/4] Uploading package...
scp deploy_package.tar %SERVER_USER%@%SERVER_IP%:/root/

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Upload failed! Please check your connection and password.
    if exist deploy_package.tar del deploy_package.tar
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/4] Preparing server...
ssh %SERVER_USER%@%SERVER_IP% "mkdir -p %REMOTE_DIR% && tar -xvf /root/deploy_package.tar -C %REMOTE_DIR% && rm /root/deploy_package.tar && chmod +x %REMOTE_DIR%/server-setup.sh %REMOTE_DIR%/deploy.sh %REMOTE_DIR%/pre-deploy-checklist.sh"

echo.
echo [4/4] Connecting to server...
echo.
echo  ✅ Files uploaded and extracted to %REMOTE_DIR%
echo.
echo  ⚠️  SERVER INSTRUCTIONS:
echo     1. cd %REMOTE_DIR%
echo     2. ./server-setup.sh  (Run this FIRST if new server)
echo     3. ./deploy.sh
echo.
echo  Connecting now...
ssh -t %SERVER_USER%@%SERVER_IP% "cd %REMOTE_DIR% && bash"

echo.
echo Cleaning up...
if exist deploy_package.tar del deploy_package.tar
pause
