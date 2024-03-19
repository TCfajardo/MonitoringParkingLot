const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const dotenv = require('dotenv');
const { spawn } = require('child_process');

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const servers = ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'];
const healthCheckInterval = 5000; 

const performHealthCheck = async () => {
    const healthStatus = [];

    for (const serverUrl of servers) {
        const formattedTime = new Date().toISOString();
        const options = { timeout: healthCheckInterval }; 

        try {
            const response = await axios.get(serverUrl + '/ping', options);
            const status = response.status === 200 ? 'Activo' : 'Inactivo';
            healthStatus.push({ server: serverUrl, status });
            console.log(`[${formattedTime}] Se realizó el ping para ${serverUrl} - ${status}`);
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
    const inactiveServers = [];

    for (const serverUrl of servers) {
        const formattedTime = new Date().toISOString();
        const options = { timeout: healthCheckInterval }; 

        try {
            const response = await axios.get(serverUrl + '/ping', options);
            const status = response.status === 200 ? 'Activo' : 'Inactivo';
            inactiveServers.push({ server: serverUrl, status });
            console.log(`[${formattedTime}] Se realizó el ping para ${serverUrl} - ${status}`);
        } catch (error) {
            console.error(`[${formattedTime}] Error en el ping para ${serverUrl}: ${error.message}`);
            inactiveServers.push({ server: serverUrl, status: 'Inactivo' });
        }
    }

    // Realizar el lanzamiento de servidores inactivos
    if (inactiveServers.length > 0) {
        console.log(`Los siguientes servidores están inactivos o tienen tiempos de respuesta altos: ${inactiveServers}`);
        
        // Ejecutar el script para lanzar servidores
        const { spawn } = require('child_process');
        const newServerProcess = spawn('node', ['script.txt']);
        
        newServerProcess.stdout.on('data', (data) => {
            console.log(`Nuevo servidor: ${data}`);
        });
        
        newServerProcess.stderr.on('data', (data) => {
            console.error(`Error en el nuevo servidor: ${data}`);
        });
    } else {
        console.log('Todos los servidores están activos y respondiendo dentro del tiempo esperado.');
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

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Servidor de monitoreo escuchando en el puerto ${PORT}`);
});
