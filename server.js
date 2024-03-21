const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const dotenv = require('dotenv');
const { spawn } = require('child_process');

const Docker = require('dockerode');
const docker = new Docker({ host: 'http://localhost', port: 2375 });

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const servers = process.env.SERVERS.split(',');
const healthCheckInterval = process.env.HEALTH_CHECK_INTERVAL || 5000; 

const responseTimes = [];

const performHealthCheck = async () => {
    const healthStatus = [];

    for (const serverUrl of servers) {
        const formattedTime = new Date().toISOString();
        const options = { timeout: healthCheckInterval }; 

        try {
            const startTime = Date.now();

            const response = await axios.get(serverUrl + '/ping', options);
            const status = response.status === 200 ? 'Activo' : 'Inactivo';
            const responseTime = Date.now();
            const timeDifference = responseTime - startTime;
            console.log(`[${formattedTime}] Se realizó el ping para ${serverUrl} - ${status} - latencia : ${timeDifference}`);

            const pingAndRequestsResponse = await axios.get(`${serverUrl}/ping-and-requests`);
            const { totalRequests, errorRequests, postRequests, getRequests, patchRequests} = pingAndRequestsResponse.data;
            console.log(`[${formattedTime}] totalRequests : ${totalRequests} - errorRequests : ${errorRequests} - POST/GET/PATCH ${postRequests}  ${getRequests} ${patchRequests} `);

            responseTimes.push({ server: serverUrl, timeDifference });

            healthStatus.push(
                { server: 
                    serverUrl, 
                    status, 
                    totalRequests, 
                    errorRequests, 
                    postRequests, 
                    getRequests, 
                    patchRequests,
                    responseTimes
                });

        } catch (error) {
            console.error(`[${formattedTime}] Error en el ping para ${serverUrl}: ${error.message}`);
            healthStatus.push({ server: serverUrl, status: 'Inactivo' });
        }
    }

    // Emitir el estado de salud a todos los clientes WebSocket
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'healthCheck', data: healthStatus }));
        }
    });
};

const checkAndLaunchServers = async () => {
    // Función para obtener los contenedores y verificar si están activos
    const checkContainers = () => {
        return new Promise((resolve, reject) => {
            docker.listContainers({ all: true }, (err, containers) => {
                if (err) {
                    console.error('Error al listar contenedores:', err);
                    reject(err);
                } else {
                    // Filtrar los contenedores que contengan "server" en el nombre
                    const serverContainers = containers.filter(container => container.Names.some(name => name.includes('server')));
                    const activeServerContainers = serverContainers.filter(container => container.State === 'running');
                    
                    // Verificar si hay al menos 3 contenedores activos
                    if (activeServerContainers.length >= 3) {
                        resolve(activeServerContainers);
                    } else {
                        console.log('Hay menos de 3 Contenedores Servidores');
                        console.log('Se lanzaran nuevos Contenedores de Servidores');
                        const scriptPath = 'script2.bat';
                        const batProcess = spawn('cmd', ['/c', scriptPath]);

                        batProcess.stdout.on('data', (data) => {
                            console.log(`${data}`);
                        });

                        batProcess.stderr.on('data', (data) => {
                            console.error(`Error en el nuevo servidor: ${data}`);
                        });
                    }
                }
            });
        });
    };

    try {
        // Obtener los contenedores activos que contienen "server" en el nombre
        const activeServerContainers = await checkContainers();
        console.log('Contenedores de Servidores Activos: ', activeServerContainers.length);

        // Realizar el lanzamiento de servidores inactivos (si es necesario)
        if (activeServerContainers.length < 6) {
            console.log('No se lanzarán nuevos servidores.');

            const scriptPath = 'script.bat';
            const batProcess = spawn('cmd', ['/c', scriptPath]); // Ejecutar el script bat

            batProcess.stdout.on('data', (data) => {
                console.log(`${data}`);
            });

            batProcess.stderr.on('data', (data) => {
                console.error(`Error en el nuevo servidor: ${data}`);
            });
        } else {
            console.log('No hay al menos 3 servidores activos, se lanzarán nuevos servidores.');
        }
    } catch (error) {
        console.error('Error al verificar los contenedores:', error);
    }
};

// Llama a la función para verificar y lanzar servidores al inicio y luego en intervalos regulares
checkAndLaunchServers();
setInterval(checkAndLaunchServers, healthCheckInterval);


// Manejo de conexión de clientes WebSocket
wss.on('connection', (ws) => {
    console.log('Cliente WebSocket conectado');

    // Realizar el primer chequeo de salud al conectar un cliente
    performHealthCheck();

    // Realizar el chequeo de salud periódicamente
    const intervalId = setInterval(performHealthCheck, healthCheckInterval);

    // Manejo de desconexión de clientes WebSocket
    ws.on('close', () => {
        console.log('Cliente WebSocket desconectado');
        clearInterval(intervalId); // Detener la ejecución del intervalo al desconectar un cliente
    });
});

server.on('error', (err) => {
    console.error('Error en el servidor HTTP:', err);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Servidor de monitoreo escuchando en el puerto ${PORT}`);
});
