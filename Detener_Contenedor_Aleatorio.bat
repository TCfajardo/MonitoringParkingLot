@echo off
setlocal enabledelayedexpansion

REM Variable de estado para verificar si se ha detenido al menos un contenedor
set "CONTAINER_STOPPED=false"

REM Buscar los IDs de todos los contenedores que contengan la palabra "server" en su nombre
for /f "tokens=1,2" %%i in ('docker ps -a --format "{{.ID}} {{.Names}}" ^| findstr "server"') do (
    set "CONTAINER_ID=%%i"
    set "CONTAINER_NAME=%%j"
    echo Deteniendo contenedor: !CONTAINER_NAME!
    docker stop !CONTAINER_ID!
    set "CONTAINER_STOPPED=true"
)

REM Comprobar si no se encontraron contenedores que coincidan con el patrón
if "%CONTAINER_STOPPED%"=="false" (
    echo No se encontraron contenedores que coincidan con el patrón.
)

:end
