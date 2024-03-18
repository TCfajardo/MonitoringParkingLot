const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const sequelize = require('./src/database');
const VehicleHistory = require('./src/modelsDB/vehicleHistory');

const servers = ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'];
const healthCheckInterval = 10000; // Realizar el chequeo de salud cada 5 segundos

let responseTimes = [];

// Función para realizar el chequeo de salud
const performHealthCheck = async () => {
    const healthStatus = [];

    for (const serverUrl of servers) {
        const formattedTime = new Date().toISOString();
        const options = { timeout: 5000 }; // Tiempo de espera para la respuesta del servidor (en milisegundos)

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

// Función para filtrar las solicitudes de tipo 'Request' y 'Error'
const requestFilter = async (req, res) => {
    try {
        const registros = await VehicleHistory.findAll();
        
        // Mapear los registros para obtener solo los campos deseados
        const filteredRecords = registros.map(registro => ({
            event_time: registro.event_time,
            url: registro.url,
            method: registro.method,
            payload: registro.payload,
            container_id: registro.container_id
        }));
        
        res.json({ success: true, data: filteredRecords });
    } catch (error) {
        console.error('Error al filtrar datos:', error);
        res.status(500).json({ success: false, error: 'Error al filtrar datos' });
    }
};

app.get('/request-filter', requestFilter);

// Manejo de conexión de clientes WebSocket
wss.on('connection', (ws) => {
    console.log('Cliente WebSocket conectado');

    // Realizar el primer chequeo de salud al conectar un cliente
    performHealthCheck();

    // Realizar el chequeo de salud periódicamente
    const intervalId = setInterval(performHealthCheck, healthCheckInterval);

    // Manejo de mensajes WebSocket entrantes desde los servidores
    ws.on('message', (message) => {
        console.log('Mensaje recibido desde el servidor:', message);
        
        // Verificar si el mensaje es un Buffer
        if (Buffer.isBuffer(message)) {
            // Convertir el buffer a una cadena legible
            message = message.toString('utf-8');
        }
    
        // Verificar si el mensaje es una cadena JSON
        if (typeof message === 'string') {
            try {
                // Intentar analizar el mensaje JSON
                const parsedMessage = JSON.parse(message);
                console.log('Mensaje recibido desde el servidor:', parsedMessage);
    
                // Verificar si el tipo de mensaje es 'responseTime'
                if (parsedMessage.type === 'responseTime') {
                    // Agregar el tiempo de respuesta al arreglo
                    responseTimes.push(parsedMessage.data);
                }
            } catch (error) {
                console.error('Error al analizar el mensaje JSON:', error);
            }
        } else {
            console.warn('Mensaje recibido no es una cadena JSON:', message);
        }
    });

    // Manejo de desconexión de clientes WebSocket
    ws.on('close', () => {
        console.log('Cliente WebSocket desconectado');
        clearInterval(intervalId); // Detener la ejecución del intervalo al desconectar un cliente
    });
});

// Manejo de errores de servidor HTTP
server.on('error', (err) => {
    console.error('Error en el servidor HTTP:', err);
});

// Endpoint para mostrar los tiempos de respuesta
app.get('/response-times', (req, res) => {
    try {
        // Enviar los tiempos de respuesta como respuesta al cliente
        res.json(responseTimes);
    } catch (error) {
        console.error('Error al obtener los tiempos de respuesta:', error);
        res.status(500).json({ success: false, error: 'Error al obtener los tiempos de respuesta' });
    }
});

const PORT = process.env.NODE_SERVICE_PORT;
server.listen(PORT, () => {
    console.log(`Servidor de monitoreo escuchando en el puerto ${PORT}`);
});
