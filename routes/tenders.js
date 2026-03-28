const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Create a new tender
router.post('/', async (req, res) => {
    const { title, reference_number, closing_date, system_type, min_functionality_score } = req.body;
    
    if (!title || !reference_number || !closing_date || !system_type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const { data, error } = await supabase
            .from('tenders')
            .insert({
                title,
                reference_number,
                closing_date,
                system_type,
                min_functionality_score: min_functionality_score || 70
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Tender with this reference number already exists' });
            }
            throw error;
        }

        res.status(201).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create tender', details: err.message });
    }
});

// Get all tenders
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tenders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tenders' });
    }
});

// Get single tender
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tenders')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Tender not found' });
        }
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tender' });
    }
});

// Submit a bid to a tender
router.post('/:id/bids', async (req, res) => {
    const tenderId = req.params.id;
    const { bidder_id, total_price, functionality_score, psira_compliant } = req.body;

    if (!bidder_id || !total_price || functionality_score === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const { data, error } = await supabase
            .from('bids')
            .insert({
                tender_id: tenderId,
                bidder_id,
                total_price,
                functionality_score,
                psira_compliant: psira_compliant !== undefined ? psira_compliant : true
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Bidder has already submitted a bid for this tender' });
            }
            throw error;
        }

        res.status(201).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit bid', details: err.message });
    }
});

// Get all bids for a tender
router.get('/:id/bids', async (req, res) => {
    const tenderId = req.params.id;
    try {
        const { data, error } = await supabase
            .from('bids')
            .select(`
                *,
                bidder:bidders(*)
            `)
            .eq('tender_id', tenderId)
            .order('submitted_at', { ascending: false });

        if (error) throw error;
        
        // Flatten bidder data
        const bids = (data || []).map(bid => ({
            ...bid,
            company_name: bid.bidder?.company_name,
            bbbee_level: bid.bidder?.bbbee_level
        }));
        
        res.json(bids);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch bids' });
    }
});

module.exports = router;
