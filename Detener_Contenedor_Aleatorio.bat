@echo off
setlocal

REM Buscar el ID de un contenedor que contenga la palabra "server" en su nombre
for /f "tokens=*" %%i in ('docker ps -q --filter "name=server"') do (
    set CONTAINER_ID=%%i
    goto :stop_container
)

echo No se encontraron contenedores que coincidan con el patrón.
goto :end

:stop_container
REM Detener el contenedor encontrado
docker stop %CONTAINER_ID%
echo Contenedor detenido: docker ps --format "{{.Names}}"

:end
