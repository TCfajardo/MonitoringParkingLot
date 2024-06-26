const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const dotenv = require('dotenv');

const Docker = require('dockerode');
const docker = new Docker({ host: 'http://localhost', port: 2375 });
const { spawn } = require('child_process');
const { exec } = require('child_process');

const fs = require('fs');

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let SERVERS = [];

const healthCheckInterval = process.env.HEALTH_CHECK_INTERVAL || 4000;

const responseTimes = [];

const INITIAL_CHECK_DELAY = 60000;
app.use(express.json());

const performHealthCheck = async () => {
    const healthStatus = [];

    for (const serverUrl of SERVERS) {
        const formattedTime = new Date().toISOString();
        const options = { timeout: 6000 };

        try {
            const startTime = Date.now();

            const response = await axios.get(serverUrl + '/ping', options);
            const status = response.status === 200 ? 'Activo' : 'Inactivo';
            const responseTime = Date.now();
            const timeDifference = responseTime - startTime;
            console.log(`[${formattedTime}] Se realizó el ping para ${serverUrl} - ${status} - latencia : ${timeDifference}`);

            const pingAndRequestsResponse = await axios.get(`${serverUrl}/ping-and-requests`);
            const { totalRequests, errorRequests, postRequests, getRequests, patchRequests } = pingAndRequestsResponse.data;
            console.log(`[${formattedTime}] totalRequests : ${totalRequests} - errorRequests : ${errorRequests} - POST/GET/PATCH ${postRequests}  ${getRequests} ${patchRequests} `);

            responseTimes.push({ server: serverUrl, timeDifference });

            healthStatus.push(
                {
                    server: serverUrl,
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


function updateServers(ip, port) {
    try {
        const formattedTime = new Date().toISOString();
        const newServer = `http://${ip}:${port}`;
        if (!SERVERS.includes(newServer)) {
            SERVERS.push(newServer);
            console.log(`[${formattedTime}], Lista de IP y Puertos actualizada:`);
            console.log(SERVERS);
        }
    } catch (error) {
        console.error('Error al actualizar SERVERS:', error);
    }
}

app.post('/register-node', (req, res) => {
    const { ip, port } = req.body;
    const formattedTime = new Date().toISOString();
    console.log(`[${formattedTime}] Nodo registrado: IP ${ip}, Puerto ${port}`);
    
    updateServers(ip, port);
    
    res.status(200).send('Nodo registrado exitosamente');
});

// Función para verificar y lanzar servidores al inicio y luego en intervalos regulares
const checkAndLaunchServers = async () => {
    const formattedTime = new Date().toISOString();
    try {
        if (SERVERS.length < 3) {///// pingg  y al if 
            console.log(`[${formattedTime}] Se lanzarán nuevos servidores.`);
            runScript2(); // Llama al método para ejecutar el script2.bat y lanzar nuevos servidores
        } else {
            console.log(`[${formattedTime}] Hay al menos 3 servidores activos, no se lanzarán nuevos servidores.`);
        }
    } catch (error) {
        console.error('Error al verificar y lanzar servidores:', error);
    }
};

// Función para ejecutar el script2.bat y lanzar nuevos servidores
//sacar random y cambiar nombres
function runScript2() {
    const formattedTime = new Date().toISOString();
    console.log(`[${formattedTime}] Hay menos de 3 Contenedores Servidores. Se lanzarán nuevos Contenedores de Servidores`);

    const scriptPath = 'createserver.bat';

    // Ejecuta el script2.bat utilizando spawn
    const batProcess = spawn('cmd', ['/c', scriptPath]);

    // Captura y muestra la salida estándar del proceso
    batProcess.stdout.on('data', (data) => {
        console.log(`Salida estándar: ${data}`);
    });

    // Captura y muestra la salida de error del proceso
    batProcess.stderr.on('data', (data) => {
        console.error(`[${formattedTime}] Error al lanzar nuevo servidor nuevo servidor: ${data}`);
    });

    // Maneja los eventos de cierre del proceso
    batProcess.on('close', (code) => {
        console.log(`[${formattedTime}] Proceso de script2.bat finalizado con código de salida ${code}`);
    });
}

// Llama a la función para verificar y lanzar servidores al inicio y luego en intervalos regulares
setTimeout(() => {
    checkAndLaunchServers();
    setInterval(checkAndLaunchServers, healthCheckInterval);
}, INITIAL_CHECK_DELAY);


// Manejo de conexión de clientes WebSocket
wss.on('connection', (ws) => {
    const formattedTime = new Date().toISOString();
    console.log(`[${formattedTime}] Cliente WebSocket conectado`);
    // Realizar el primer chequeo de salud al conectar un cliente
    performHealthCheck();

    // Realizar el chequeo de salud periódicamente
    const intervalId = setInterval(performHealthCheck, healthCheckInterval);

    ws.on('close', () => {
        console.log(`[${formattedTime}] Cliente WebSocket desconectado`);
        clearInterval(intervalId);
    });
});

server.on('error', (err) => {
    console.error('Error en el servidor HTTP:', err);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Servidor de monitoreo escuchando en el puerto ${PORT}`);
});

