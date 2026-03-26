const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Create a new tender
router.post('/', async (req, res) => {
    const { title, reference_number, closing_date, system_type, min_functionality_score } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO tenders (title, reference_number, closing_date, system_type, min_functionality_score) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, reference_number, closing_date, system_type, min_functionality_score || 70]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create tender', details: err.message });
    }
});

// Get all tenders
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM tenders ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tenders' });
    }
});

// Get single tender
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM tenders WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Tender not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tender' });
    }
});

// Submit a bid to a tender
router.post('/:id/bids', async (req, res) => {
    const tenderId = req.params.id;
    const { bidder_id, total_price, functionality_score, psira_compliant } = req.body;
    
    try {
        const result = await db.query(
            'INSERT INTO bids (tender_id, bidder_id, total_price, functionality_score, psira_compliant) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [tenderId, bidder_id, total_price, functionality_score, psira_compliant !== undefined ? psira_compliant : true]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique constraint violation
            return res.status(400).json({ error: 'Bidder has already submitted a bid for this tender.' });
        }
        res.status(500).json({ error: 'Failed to submit bid', details: err.message });
    }
});

// Get all bids for a tender
router.get('/:id/bids', async (req, res) => {
    const tenderId = req.params.id;
    try {
        const result = await db.query(`
            SELECT b.*, br.company_name, br.bbbee_level 
            FROM bids b
            JOIN bidders br ON b.bidder_id = br.id
            WHERE b.tender_id = $1
            ORDER BY b.submitted_at DESC
        `, [tenderId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch bids' });
    }
});

module.exports = router;
