@echo off

rem Generar un número aleatorio entre 1 y 3 para seleccionar el PC
set /a PC=%RANDOM% %% 3 + 1

rem Determinar la ruta del script en el PC correspondiente al número generado
if %PC% equ 1 (
    set "SCRIPT_PATH=Downloads\tarea5\WebServices\MonitoringParkingLot"
) else if %PC% equ 2 (
    set "SCRIPT_PATH=Downloads\tarea5\WebServices\MonitoringParkingLot"
) else if %PC% equ 3 (
    set "SCRIPT_PATH=Downloads\tarea5\WebServices\MonitoringParkingLot"
) else (
    echo Número de PC inválido
    exit /b 1
)

rem Determinar el host correspondiente al número generado
if %PC% equ 1 (
    set "HOST=NikoK@192.168.1.10"
) else if %PC% equ 2 (
    set "HOST=NikoK@192.168.1.10"
) else if %PC% equ 3 (
    set "HOST=NikoK@192.168.1.10"
) else (
    echo Número de PC inválido
    exit /b 1
)

rem Comando SSH para ejecutar el script en el PC seleccionado
ssh %HOST% "cd \"%SCRIPT_PATH%\" && Detener_Contenedor_Aleatorio.bat"

