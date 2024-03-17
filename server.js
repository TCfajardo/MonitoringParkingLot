const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const servers = ['http://localhost:3001', 'http://localhost:3002'];

io.on('connection', (socket) => {
    console.log('Cliente WebSocket conectado');

    const performHealthCheck = () => {
        servers.forEach(serverUrl => {
            const formattedTime = new Date().toISOString();

            const options = {
                timeout: 5000, // Tiempo de espera para la respuesta del servidor (en milisegundos)
            };

            const request = http.get(serverUrl + '/ping', options, (res) => {
                if (res.statusCode === 200) {
                    console.log(`[${formattedTime}] Se realizó el ping para ${serverUrl} - Éxito`);
                    socket.emit('healthCheck', { server: serverUrl, status: 'OK' });
                } else {
                    console.log(`[${formattedTime}] Se realizó el ping para ${serverUrl} - Falló - Estado: ${res.statusCode}`);
                    socket.emit('healthCheck', { server: serverUrl, status: 'Error' });
                }
            });

            request.on('error', (error) => {
                console.error(`[${formattedTime}] Error en el ping para ${serverUrl}: ${error.message}`);
                socket.emit('healthCheck', { server: serverUrl, status: 'Error' });
            });

            request.on('timeout', () => {
                console.error(`[${formattedTime}] Tiempo de espera agotado para ${serverUrl}`);
                socket.emit('healthCheck', { server: serverUrl, status: 'Timeout' });
            });
        });
    };

    const healthCheckInterval = 10000; 

    performHealthCheck();
    const intervalId = setInterval(performHealthCheck, healthCheckInterval);

    socket.on('disconnect', () => {
        console.log('Cliente WebSocket desconectado');
        clearInterval(intervalId); 
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Servidor de monitoreo escuchando en el puerto ${PORT}`);
});
