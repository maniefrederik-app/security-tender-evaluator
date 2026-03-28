const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

app.use(cors({ 
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

const MIME_TYPES = {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Serve static files explicitly
const staticPath = process.cwd();
app.get('/assets/*', (req, res) => {
    const filePath = path.join(staticPath, req.path);
    const ext = path.extname(filePath);
    const mimeType = MIME_TYPES[ext] || 'text/plain';
    
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', mimeType);
        res.sendFile(filePath);
    } else {
        res.status(404).send('Not found');
    }
});

app.get('/favicon.svg', (req, res) => {
    const filePath = path.join(staticPath, 'favicon.svg');
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.sendFile(filePath);
    } else {
        res.status(404).send('Not found');
    }
});

app.get('/logo111.png', (req, res) => {
    const filePath = path.join(staticPath, 'logo111.png');
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'image/png');
        res.sendFile(filePath);
    } else {
        res.status(404).send('Not found');
    }
});

// API Routes
app.use('/api/tenders', require('./routes/tenders'));
app.use('/api/bidders', require('./routes/bidders'));
app.use('/api/evaluations', require('./routes/evaluations'));
app.use('/api/evaluators', require('./routes/evaluators'));

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
