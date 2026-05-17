@echo off
setlocal

rem Versus MVP development startup script
rem - Starts Piston (if Docker is available)
rem - Opens Backend and Frontend in separate console windows using `npm run dev`

echo.
echo ==================================================
echo Starting Versus MVP Development Environment
echo ==================================================
echo.

rem Check for Docker before attempting to start Piston
where docker >nul 2>&1
if %errorlevel%==0 (
    echo Docker detected. Ensuring Piston container is started...
    docker rm -f piston >nul 2>&1
    docker volume create piston-data >nul 2>&1
    docker run --name piston --rm -d --privileged -v piston-data:/piston -p 2000:2000 ghcr.io/engineer-man/piston:latest >nul 2>&1
    if errorlevel 1 (
        echo  Failed to start Piston container. You can start it manually with:
        echo  docker run --rm -d -p 2000:2000 ghcr.io/engineer-man/piston:latest
    ) else (
        echo  Piston started on http://localhost:2000
    )
) else (
    echo Docker not found in PATH. Skipping automatic Piston start.
    echo If you need code execution, install Docker and run:
    echo   docker run --rm -d -p 2000:2000 ghcr.io/engineer-man/piston:latest
)

rem Start the backend in a new console window using nodemon (dev)
echo.
echo Starting backend (will open in a new window)...
if not exist "%~dp0backend\node_modules" (
    echo Installing backend dependencies...
    pushd "%~dp0backend"
    npm install
    popd
)
start "Versus Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

rem Start the frontend in a new console window
echo.
echo Starting frontend (will open in a new window)...
if not exist "%~dp0frontend\versus-frontend\node_modules" (
    echo Installing frontend dependencies...
    pushd "%~dp0frontend\versus-frontend"
    npm install
    popd
)
start "Versus Frontend" cmd /k "cd /d "%~dp0frontend\versus-frontend" && npm run dev"

echo.
echo Startup commands issued. Backend: http://localhost:4000  Frontend: http://localhost:5173
echo If a service fails to start, check the corresponding window for logs.
echo.
pause

endlocal