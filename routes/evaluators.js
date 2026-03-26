const db = require('../config/database');
const express = require('express');
const router = express.Router();

// ─── Evaluators ───────────────────────────────────────────────

// GET /api/evaluators?tender_id=X  — list evaluators for a tender
router.get('/', async (req, res) => {
    const { tender_id } = req.query;
    if (!tender_id) return res.status(400).json({ error: 'tender_id is required' });
    try {
        const result = await db.query(
            'SELECT * FROM evaluators WHERE tender_id = $1 ORDER BY created_at ASC',
            [tender_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch evaluators' });
    }
});

// POST /api/evaluators — register an evaluator for a tender
router.post('/', async (req, res) => {
    const { tender_id, name, designation, email } = req.body;
    if (!tender_id || !name || !email) {
        return res.status(400).json({ error: 'tender_id, name and email are required' });
    }
    try {
        const result = await db.query(
            `INSERT INTO evaluators (tender_id, name, designation, email)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [tender_id, name, designation || null, email]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Evaluator with this email already registered for this tender' });
        console.error(err);
        res.status(500).json({ error: 'Failed to register evaluator' });
    }
});

// DELETE /api/evaluators/:id — remove an evaluator
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM evaluators WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete evaluator' });
    }
});

// ─── Evaluator Scores ──────────────────────────────────────────

// GET /api/evaluators/:id/scores?tender_id=X&bidder_id=Y&section=guarding
// Returns one evaluator's scores for a specific bidder × section
router.get('/:id/scores', async (req, res) => {
    const { tender_id, bidder_id, section } = req.query;
    if (!tender_id || !bidder_id || !section) {
        return res.status(400).json({ error: 'tender_id, bidder_id and section are required' });
    }
    try {
        const result = await db.query(
            `SELECT criteria_key, level_key, points_available, weighted_score
             FROM evaluator_scores
             WHERE evaluator_id = $1 AND tender_id = $2 AND bidder_id = $3 AND section = $4`,
            [req.params.id, tender_id, bidder_id, section]
        );
        // Return as { criteria_key: level_key, ... }
        const scores = {};
        result.rows.forEach(row => { scores[row.criteria_key] = row.level_key || ''; });
        res.json(scores);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
});

// POST /api/evaluators/:id/scores — upsert bulk scores
// Body: { tender_id, bidder_id, section, scores: [{ criteria_key, level_key, points_available, weighted_score }] }
router.post('/:id/scores', async (req, res) => {
    const { tender_id, bidder_id, section, scores } = req.body;
    if (!tender_id || !bidder_id || !section || !Array.isArray(scores)) {
        return res.status(400).json({ error: 'tender_id, bidder_id, section, scores[] required' });
    }
    const evaluatorId = req.params.id;
    try {
        await db.query('BEGIN');
        for (const sc of scores) {
            await db.query(
                `INSERT INTO evaluator_scores
                    (evaluator_id, tender_id, bidder_id, section, criteria_key, level_key, points_available, weighted_score)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                 ON CONFLICT (evaluator_id, tender_id, bidder_id, section, criteria_key)
                 DO UPDATE SET level_key=$6, points_available=$7, weighted_score=$8, saved_at=NOW()`,
                [evaluatorId, tender_id, bidder_id, section,
                 sc.criteria_key, sc.level_key || null, sc.points_available, sc.weighted_score]
            );
        }
        await db.query('COMMIT');
        res.json({ success: true, saved: scores.length });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to save scores' });
    }
});

// GET /api/evaluators/average-scores?tender_id=X&bidder_id=Y&section=guarding
// Returns AVERAGE scores across all evaluators per criterion
router.get('/average-scores', async (req, res) => {
    const { tender_id, bidder_id, section } = req.query;
    if (!tender_id || !bidder_id || !section) {
        return res.status(400).json({ error: 'tender_id, bidder_id and section are required' });
    }
    try {
        const result = await db.query(
            `SELECT
                es.criteria_key,
                MAX(es.points_available) AS points_available,
                ROUND(AVG(es.weighted_score)::numeric, 4) AS avg_weighted_score,
                COUNT(DISTINCT es.evaluator_id) AS evaluator_count,
                json_agg(json_build_object(
                    'evaluator_id', e.id,
                    'evaluator_name', e.name,
                    'level_key', es.level_key,
                    'weighted_score', es.weighted_score
                ) ORDER BY e.name) AS individual_scores
             FROM evaluator_scores es
             JOIN evaluators e ON e.id = es.evaluator_id
             WHERE es.tender_id = $1 AND es.bidder_id = $2 AND es.section = $3
             GROUP BY es.criteria_key
             ORDER BY es.criteria_key`,
            [tender_id, bidder_id, section]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to calculate average scores' });
    }
});

module.exports = router;
