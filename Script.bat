@echo off
chcp 65001 > nul

echo Lista de contenedores de servidores Activos

(
echo [
for /f "tokens=1,2,3,4,5 delims=," %%i in ('docker ps --format "{{.ID}},{{.Ports}},{{.Names}}"') do (
    if not "%%k"=="loadbalancer" (
        if not "%%k"=="postgres-database" (
            echo {
            echo "CONTAINER ID": "%%i",
            echo "PORTS": "%%j",
            echo "NAME": "%%k",
            for /f "tokens=*" %%l in ('docker inspect --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" %%i') do (
                echo "IP": "%%l"
            )
            echo },
        )
    )
)
echo ]
)> containers.json

type containers.json
