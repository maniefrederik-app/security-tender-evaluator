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

// API Routes FIRST
app.use('/api/tenders', require('./routes/tenders'));
app.use('/api/bidders', require('./routes/bidders'));
app.use('/api/evaluations', require('./routes/evaluations'));
app.use('/api/evaluators', require('./routes/evaluators'));

// Serve static files
const staticPath = process.cwd();
app.use(express.static(staticPath, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// SPA fallback for non-API, non-asset requests
app.use((req, res, next) => {
    const ext = path.extname(req.path);
    if (ext === '' || ext === '.html') {
        res.sendFile(path.join(staticPath, 'index.html'));
    } else {
        next();
    }
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
