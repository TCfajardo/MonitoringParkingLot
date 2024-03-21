@echo off

REM Verifica si existe el archivo que contiene el valor del contador
if not exist contador.txt (
    echo 3 > contador.txt
)

REM Lee el valor del contador desde el archivo
set /P CONTADOR=<contador.txt

REM Define el puerto como 4000 más el valor del contador
set /A PORT=4000+%CONTADOR%

REM Define el nombre de la imagen como "server" seguido del número del contador
set IMAGEN=server%CONTADOR%

REM Define el nombre del contenedor como "server" seguido del número del contador
set CONTENEDOR=server%CONTADOR%

REM Incrementa el contador para la próxima ejecución
set /A CONTADOR+=1

REM Guarda el nuevo valor del contador en el archivo
echo %CONTADOR% > contador.txt

REM Puerto de mapeo del contenedor (puerto del host:puerto del contenedor)
set PUERTO_MAPEADO=%PORT%:%PORT%

REM Ruta completa al directorio que contiene el Dockerfile
set DOCKERFILE_DIR=C:\Users\NikoK\Downloads\tarea5\WebServices\WebServices-ProjectBack

REM Construye y ejecuta el comando Docker
docker build -t %IMAGEN% --build-arg PORT=%PORT% -f %DOCKERFILE_DIR%\Dockerfile-Server-Auto %DOCKERFILE_DIR%
docker run -d -p %PUERTO_MAPEADO% --name %CONTENEDOR% -e DB_HOST=172.17.0.2 -e DB_NAME=parkinglot -e DB_PASSWORD=a123 -e DB_PORT=5432 -e DB_USER=postgres -e ID_SERVICE=server%CONTADOR% -e NODE_SERVICE_IP=172.17.0.%CONTADOR% -e NODE_SERVICE_PORT=%PORT% -e NODE_VERSION=18.19.1 -e PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin -e YARN_VERSION=1.22.19 %IMAGEN%

echo Contenedor creado exitosamente con nombre de imagen: %IMAGEN% y puerto mapeado: %PUERTO_MAPEADO%.
