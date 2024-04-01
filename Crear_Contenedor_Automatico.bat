@echo off
setlocal

rem Función para verificar si un puerto está en uso
:CheckPort
set /a "NODE_SERVICE_PORT=%RANDOM% %% 101 + 4000"  & rem El rango es 4000-5000
netstat -an | find ":%NODE_SERVICE_PORT%" >nul
if %errorlevel% equ 1 goto PortAvailable
goto CheckPort

:PortAvailable

set PUERTO_MAPEADO=%NODE_SERVICE_PORT%:%NODE_SERVICE_PORT%

rem Variables de entorno
set NODE_SERVICE_PORT=%NODE_SERVICE_PORT%
set NODE_SERVICE_IP=localhost
set DB_HOST=172.17.0.2
set DB_NAME=parkinglot
set DB_PASSWORD=a123
set DB_PORT=5432
set DB_USER=postgres
set ID_SERVICE=server%NODE_SERVICE_PORT%
set NODE_VERSION=18.19.1
set YARN_VERSION=1.22.197

rem Resto del script
set IMAGEN=server_auto
set DOCKER_RUN_COMMAND=docker run -d -p %PUERTO_MAPEADO% --name %ID_SERVICE% -e NODE_SERVICE_IP=%NODE_SERVICE_IP% ^
                    -e DB_HOST=%DB_HOST% -e DB_NAME=%DB_NAME% -e DB_PASSWORD=%DB_PASSWORD% ^
                    -e DB_PORT=%DB_PORT% -e DB_USER=%DB_USER% -e NODE_SERVICE_PORT=%NODE_SERVICE_PORT% ^
                    -e NODE_VERSION=%NODE_VERSION% -e PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin -e YARN_VERSION=%YARN_VERSION% %IMAGEN%

rem Crear el contenedor en Docker
%DOCKER_RUN_COMMAND%

echo Contenedor creado exitosamente con nombre de imagen: %IMAGEN% y puerto mapeado: %PUERTO_MAPEADO%.

endlocal