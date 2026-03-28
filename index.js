const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({ 
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Serve static files from public folder
app.use(express.static(path.join(process.cwd(), 'public')));

// API Routes
app.use('/api/tenders', require('./routes/tenders'));
app.use('/api/bidders', require('./routes/bidders'));
app.use('/api/evaluations', require('./routes/evaluations'));
app.use('/api/evaluators', require('./routes/evaluators'));

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
