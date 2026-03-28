const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { broadcastEvaluationUpdate } = require('../utils/realtime');

// GET /api/evaluators?tender_id=X — list evaluators for a tender
router.get('/', async (req, res) => {
    const { tender_id } = req.query;
    if (!tender_id) return res.status(400).json({ error: 'tender_id is required' });

    try {
        const { data, error } = await supabase
            .from('evaluators')
            .select('*')
            .eq('tender_id', tender_id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json(data || []);
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
        const { data, error } = await supabase
            .from('evaluators')
            .insert({
                tender_id,
                name,
                designation: designation || null,
                email
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Evaluator with this email already registered for this tender' });
            }
            throw error;
        }

        res.status(201).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to register evaluator' });
    }
});

// DELETE /api/evaluators/:id — remove an evaluator
router.delete('/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('evaluators')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete evaluator' });
    }
});

// GET /api/evaluators/:id/scores?tender_id=X&bidder_id=Y&section=guarding
// Returns one evaluator's scores for a specific bidder × section
router.get('/:id/scores', async (req, res) => {
    const { tender_id, bidder_id, section } = req.query;
    if (!tender_id || !bidder_id || !section) {
        return res.status(400).json({ error: 'tender_id, bidder_id and section are required' });
    }

    try {
        const { data, error } = await supabase
            .from('evaluator_scores')
            .select('criteria_key, level_key, points_available, weighted_score')
            .eq('evaluator_id', req.params.id)
            .eq('tender_id', tender_id)
            .eq('bidder_id', bidder_id)
            .eq('section', section);

        if (error) throw error;

        // Return as { criteria_key: level_key, ... }
        const scores = {};
        (data || []).forEach(row => {
            scores[row.criteria_key] = row.level_key || '';
        });
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
        // Upsert each score
        for (const sc of scores) {
            const { error } = await supabase
                .from('evaluator_scores')
                .upsert({
                    evaluator_id: evaluatorId,
                    tender_id,
                    bidder_id,
                    section,
                    criteria_key: sc.criteria_key,
                    level_key: sc.level_key || null,
                    points_available: sc.points_available,
                    weighted_score: sc.weighted_score,
                    saved_at: new Date().toISOString()
                }, {
                    onConflict: 'evaluator_id,tender_id,bidder_id,section,criteria_key'
                });

            if (error) throw error;
        }

        // Broadcast to Firestore for real-time updates
        try {
            await broadcastEvaluationUpdate(tenderId, {
                type: 'score_saved',
                evaluator_id: evaluatorId,
                bidder_id,
                section,
                scores_count: scores.length
            });
        } catch (realtimeErr) {
            console.warn('Firestore broadcast failed:', realtimeErr.message);
        }

        res.json({ success: true, saved: scores.length });
    } catch (err) {
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
        const { data, error } = await supabase
            .from('evaluator_scores')
            .select(`
                criteria_key,
                points_available,
                weighted_score,
                evaluator:evaluators(id, name)
            `)
            .eq('tender_id', tender_id)
            .eq('bidder_id', bidder_id)
            .eq('section', section);

        if (error) throw error;

        // Group by criteria_key and calculate averages
        const grouped = {};
        (data || []).forEach(row => {
            if (!grouped[row.criteria_key]) {
                grouped[row.criteria_key] = {
                    criteria_key: row.criteria_key,
                    points_available: row.points_available,
                    avg_weighted_score: 0,
                    evaluator_count: 0,
                    individual_scores: []
                };
            }
            if (row.weighted_score) {
                grouped[row.criteria_key].individual_scores.push({
                    evaluator_id: row.evaluator?.id,
                    evaluator_name: row.evaluator?.name,
                    level_key: row.level_key,
                    weighted_score: row.weighted_score
                });
            }
        });

        // Calculate averages
        const results = Object.values(grouped).map(item => ({
            ...item,
            evaluator_count: item.individual_scores.length,
            avg_weighted_score: item.individual_scores.length > 0
                ? item.individual_scores.reduce((sum, s) => sum + s.weighted_score, 0) / item.individual_scores.length
                : 0
        }));

        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to calculate average scores' });
    }
});

module.exports = router;
