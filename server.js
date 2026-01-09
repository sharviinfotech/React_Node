const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const connectDB = require('./config/db');

// Initialize App
const app = express();

// CORS
app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));

// ---- BODY PARSER (ONLY ONCE) ----
app.use(express.json({ limit: "50mb", strict: false }));
app.use(express.urlencoded({ extended: true }));

// ---- ROUTES MUST COME AFTER BODY PARSER ----
app.use('/api', routes);

// Database Connection
connectDB();

// Server Initialization
const BASE_SERVER_URL = 'http://localhost'
const BASE_PORT = 3002
app.listen(BASE_PORT, () =>
    console.log(`🚀 Server running on ${BASE_SERVER_URL}:${BASE_PORT}`)
);
