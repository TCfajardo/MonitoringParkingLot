const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

io.on('connection', (socket) => {
    console.log('Cliente WebSocket conectado');

    const performHealthCheck = () => {
        const servers = ['http://localhost:3001', 'http://localhost:3002'];

        for (const server of servers) {
            const startTime = Date.now(); // Iniciar el cronómetro

            http.get(server, (res) => {
                const responseTime = Date.now() - startTime;
                console.log(`[${new Date().toISOString()}] Health check for ${server}: ${res.statusCode} - Response Time: ${responseTime}ms`);
                socket.emit('healthCheck', { server, status: 'OK', responseTime });
            }).on('error', (error) => {
                console.error(`[${new Date().toISOString()}] Error en el monitoreo del servidor backend ${server}: ${error.message}`);
                socket.emit('healthCheck', { server, status: 'Error' });
            });
        }
    };

    const healthCheckInterval = 30000; // Intervalo de 30 segundos
    setInterval(performHealthCheck, healthCheckInterval);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Servidor de monitoreo escuchando en el puerto ${PORT}`);
});
