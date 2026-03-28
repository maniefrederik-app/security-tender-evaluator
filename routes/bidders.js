const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Register a new bidder
router.post('/', async (req, res) => {
    const { company_name, registration_number, psira_number, bbbee_level } = req.body;

    if (!company_name || !registration_number || !psira_number) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const { data, error } = await supabase
            .from('bidders')
            .insert({
                company_name,
                registration_number,
                psira_number,
                bbbee_level: bbbee_level || null
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Bidder with this registration or PSIRA number already exists' });
            }
            throw error;
        }

        res.status(201).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to register bidder', details: err.message });
    }
});

// Get all bidders
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('bidders')
            .select('*')
            .order('company_name', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch bidders' });
    }
});

module.exports = router;
