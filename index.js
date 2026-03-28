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

// Serve static files
const staticPath = path.join(process.cwd(), 'frontend', 'dist');
app.use(express.static(staticPath));

// SPA fallback
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
