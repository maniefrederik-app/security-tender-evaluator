const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Register a new bidder
router.post('/', async (req, res) => {
    const { company_name, registration_number, psira_number, bbbee_level } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO bidders (company_name, registration_number, psira_number, bbbee_level) VALUES ($1, $2, $3, $4) RETURNING *',
            [company_name, registration_number, psira_number, bbbee_level]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Bidder with this registration or PSIRA number already exists.' });
        }
        res.status(500).json({ error: 'Failed to register bidder', details: err.message });
    }
});

// Get all bidders
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM bidders ORDER BY company_name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch bidders' });
    }
});

module.exports = router;
