const supabase = require('../config/supabase');

const getBbbeePoints = (system_type, level) => {
    if (!level) return 0;

    if (system_type === '80/20') {
        const points = { 1: 20, 2: 18, 3: 14, 4: 12, 5: 8, 6: 6, 7: 4, 8: 2 };
        return points[level] || 0;
    } else if (system_type === '90/10') {
        const points = { 1: 10, 2: 9, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1 };
        return points[level] || 0;
    }
    return 0;
};

const calculatePriceScore = (system_type, bidPrice, minPrice) => {
    const factor = system_type === '80/20' ? 80 : 90;
    if (minPrice === 0) return 0;

    const score = factor * (1 - ((bidPrice - minPrice) / minPrice));
    return Math.max(0, score);
};

const evaluateTenderBids = async (tenderId) => {
    // 1. Get Tender setup
    const { data: tender, error: tenderError } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', tenderId)
        .single();

    if (tenderError || !tender) {
        throw new Error('Tender not found');
    }

    // 2. Get all bids for tender with bidder data
    const { data: bids, error: bidsError } = await supabase
        .from('bids')
        .select(`
            id,
            total_price,
            functionality_score,
            psira_compliant,
            bidder:bidders(id, bbbee_level, company_name)
        `)
        .eq('tender_id', tenderId);

    if (bidsError) throw bidsError;

    let evaluations = [];

    // 3. Filter out non-compliant (PSIRA or Functionality)
    const validBids = (bids || []).filter(bid => {
        if (!bid.psira_compliant) {
            evaluations.push({
                bid_id: bid.id,
                disqualified: true,
                reason: 'Non-compliant with PSIRA sectoral determination'
            });
            return false;
        }
        if (bid.functionality_score < tender.min_functionality_score) {
            evaluations.push({
                bid_id: bid.id,
                disqualified: true,
                reason: `Failed minimum functionality threshold of ${tender.min_functionality_score}`
            });
            return false;
        }
        return true;
    });

    // 4. Find lowest acceptable price
    if (validBids.length > 0) {
        const minPrice = Math.min(...validBids.map(b => parseFloat(b.total_price)));

        // 5. Calculate scores
        for (const bid of validBids) {
            const priceScore = calculatePriceScore(tender.system_type, parseFloat(bid.total_price), minPrice);
            const bbbeeScore = getBbbeePoints(tender.system_type, bid.bidder?.bbbee_level);
            const totalScore = priceScore + bbbeeScore;

            evaluations.push({
                bid_id: bid.id,
                price_score: priceScore.toFixed(2),
                bbbee_score: bbbeeScore,
                total_score: totalScore.toFixed(2),
                disqualified: false
            });
        }
    }

    // Sort valid evaluations by total_score descending
    const validEvals = evaluations.filter(e => !e.disqualified).sort((a, b) => b.total_score - a.total_score);
    const disqualifiedEvals = evaluations.filter(e => e.disqualified);

    // Assign rank
    validEvals.forEach((e, index) => {
        e.rank = index + 1;
    });

    const finalEvaluations = [...validEvals, ...disqualifiedEvals];

    return finalEvaluations;
};

module.exports = { getBbbeePoints, calculatePriceScore, evaluateTenderBids };
