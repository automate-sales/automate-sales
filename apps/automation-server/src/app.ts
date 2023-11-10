const ENV = process.env.NODE_ENV || 'development';
import dotenv from 'dotenv';
dotenv.config({ path: `.env.${ENV}` });

import express from 'express';
import https from 'https'
import http from 'http'
import bodyParser from 'body-parser';
import { Server } from 'socket.io';
import { readFileSync } from 'fs';
import logger from '../logger';
import whatsappRoutes from './routes/whatsapp';
import cors from 'cors';

const PORT = process.env.PORT || 8000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const SSL_ENABLED = process.env.SSL_ENABLED ? true : false;

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({
    verify: (
        req: express.Request & { rawBody: Buffer }, 
        _res: express.Response,
        buf: Buffer
    ) => {
        req.rawBody = buf
    }
}))
if(!SSL_ENABLED) app.use(cors({
    origin: CLIENT_URL // Adjust this to the domain you want to allow
}));

const privateKey = SSL_ENABLED ? readFileSync('certs/privkey1.pem', 'utf8') : '';
const certificate = SSL_ENABLED ? readFileSync('certs/fullchain1.pem', 'utf8'): '';
const server = SSL_ENABLED ? https.createServer({
    key: privateKey,
    cert: certificate,
}, app) : http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: CLIENT_URL,
      methods: ["GET", "POST"]
    }
});

app.use('/whatsapp', whatsappRoutes);

io.on('connection', (socket) => {
    logger.debug('a user connected');
    socket.on('disconnect', () => {
      logger.debug('user disconnected');
    });
});

server.listen(process.env.PORT, () => {
    console.log(`${SSL_ENABLED ? 'HTTPS' : 'HTTP'} Server running on port ${PORT}`);
});


