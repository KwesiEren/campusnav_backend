const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/pois', require('./routes/poiRoutes'));
app.use('/api/events', require('./routes/eoiRoutes'));

module.exports = app;
