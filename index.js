const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({ origin: (origin, cb) => cb(null, true) }));
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/tenders', require('./routes/tenders'));
app.use('/api/bidders', require('./routes/bidders'));
app.use('/api/evaluations', require('./routes/evaluations'));
app.use('/api/evaluators', require('./routes/evaluators'));

// Serve static files - check multiple possible locations
const possiblePaths = [
    path.join(__dirname, 'frontend', 'dist'),
    path.join(__dirname, 'dist'),
    path.join(process.cwd(), 'frontend', 'dist')
];

let staticPath = null;
for (const p of possiblePaths) {
    try {
        require('fs').accessSync(p);
        staticPath = p;
        console.log('Using static path:', staticPath);
        break;
    } catch (e) {
        // Path doesn't exist
    }
}

if (staticPath) {
    app.use(express.static(staticPath));
    app.get('*', (req, res) => {
        const indexPath = path.join(staticPath, 'index.html');
        res.sendFile(indexPath);
    });
} else {
    console.error('Could not find static files in any of:', possiblePaths);
    app.get('*', (req, res) => {
        res.status(500).send('Static files not found');
    });
}

const PORT = process.env.PORT || 5000;

// For local development only
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
