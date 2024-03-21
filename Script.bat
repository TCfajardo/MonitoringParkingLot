@echo off
chcp 65001 > nul

echo Lista de contenedores de servidores Activos

(
echo [
set isFirst=1
setlocal enabledelayedexpansion
for /f "tokens=1,2,3,4,5 delims=," %%i in ('docker ps --format "{{.ID}},{{.Ports}},{{.Names}}"') do (
    if not "%%k"=="loadbalancer" (
        if not "%%k"=="postgres-database" (
            if !isFirst! == 0 echo ,
            set isFirst=0
            set /a totalCount+=1
            echo {
            echo "CONTAINER ID": "%%i",
            echo "PORTS": "%%j",
            echo "NAME": "%%k",
            for /f "tokens=*" %%l in ('docker inspect --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" %%i') do (
                echo "IP": "%%l"
            )
            echo }
        )
    )
)
echo ]
endlocal
)> containers.json

type containers.json