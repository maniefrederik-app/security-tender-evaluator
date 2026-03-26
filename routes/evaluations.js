const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { evaluateTenderBids } = require('../utils/evaluation-logic');

// Trigger evaluation for a tender
router.post('/:tenderId', async (req, res) => {
    const { tenderId } = req.params;
    
    try {
        const results = await evaluateTenderBids(tenderId);
        
        // Save results to the database inside a transaction
        await db.query('BEGIN');
        
        // Remove existing evaluations for this tender to allow re-evaluation
        await db.query(`
            DELETE FROM evaluations 
            WHERE bid_id IN (SELECT id FROM bids WHERE tender_id = $1)
        `, [tenderId]);
        
        for (const evalResult of results) {
            await db.query(`
                INSERT INTO evaluations (bid_id, price_score, bbbee_score, total_score, rank, disqualified, disqualification_reason)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                evalResult.bid_id, 
                evalResult.price_score || null, 
                evalResult.bbbee_score || null, 
                evalResult.total_score || null, 
                evalResult.rank || null, 
                evalResult.disqualified, 
                evalResult.reason || null
            ]);
        }
        
        await db.query('COMMIT');
        
        res.json({ message: 'Evaluation completed successfully', results });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Evaluation failed', details: err.message });
    }
});

// Get evaluation results for a tender
router.get('/:tenderId', async (req, res) => {
    const { tenderId } = req.params;
    
    try {
        const result = await db.query(`
            SELECT e.*, b.total_price, br.company_name, br.bbbee_level
            FROM evaluations e
            JOIN bids b ON e.bid_id = b.id
            JOIN bidders br ON b.bidder_id = br.id
            WHERE b.tender_id = $1
            ORDER BY e.rank ASC NULLS LAST
        `, [tenderId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch evaluation results' });
    }
});

module.exports = router;
