const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { evaluateTenderBids } = require('../utils/evaluation-logic');
const { broadcastEvaluationUpdate, sendNotification } = require('../utils/realtime');

// Trigger evaluation for a tender
router.post('/:tenderId', async (req, res) => {
    const { tenderId } = req.params;

    try {
        // Run evaluation logic
        const results = await evaluateTenderBids(tenderId);

        // Get all bid IDs for this tender first
        const { data: bidsData } = await supabase
            .from('bids')
            .select('id')
            .eq('tender_id', tenderId);

        const bidIds = (bidsData || []).map(b => b.id);

        // Delete existing evaluations for this tender's bids
        if (bidIds.length > 0) {
            await supabase
                .from('evaluations')
                .delete()
                .in('bid_id', bidIds);
        }

        // Insert new evaluations
        const evaluationsToInsert = results.map(evalResult => ({
            bid_id: evalResult.bid_id,
            price_score: evalResult.price_score || null,
            bbbee_score: evalResult.bbbee_score || null,
            total_score: evalResult.total_score || null,
            rank: evalResult.rank || null,
            disqualified: evalResult.disqualified,
            disqualification_reason: evalResult.reason || null
        }));

        if (evaluationsToInsert.length > 0) {
            const { error } = await supabase
                .from('evaluations')
                .insert(evaluationsToInsert);

            if (error) throw error;
        }

        // Broadcast to Firestore for real-time updates
        try {
            await broadcastEvaluationUpdate(tenderId, {
                type: 'evaluation_complete',
                results: results
            });

            await sendNotification(tenderId, `Evaluation completed for tender. ${results.filter(r => !r.disqualified).length} bids evaluated.`);
        } catch (realtimeErr) {
            console.warn('Firestore broadcast failed:', realtimeErr.message);
        }

        res.json({ message: 'Evaluation completed successfully', results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Evaluation failed', details: err.message });
    }
});

// Get evaluation results for a tender
router.get('/:tenderId', async (req, res) => {
    const { tenderId } = req.params;

    try {
        const { data, error } = await supabase
            .from('evaluations')
            .select(`
                *,
                bid:bids(
                    id,
                    total_price,
                    bidder:bidders(*)
                )
            `)
            .in('bid_id', 
                supabase
                    .from('bids')
                    .select('id')
                    .eq('tender_id', tenderId)
            )
            .order('rank', { ascending: true, nullsFirst: false });

        if (error) throw error;

        // Flatten the nested data
        const results = (data || []).map(evaluation => ({
            ...evaluation,
            total_price: evaluation.bid?.total_price,
            company_name: evaluation.bid?.bidder?.company_name,
            bbbee_level: evaluation.bid?.bidder?.bbbee_level
        }));

        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch evaluation results' });
    }
});

module.exports = router;
