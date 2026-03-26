const db = require('../config/database');

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
    // Formula: Ps = 80 * (1 - (Pt - Pmin) / Pmin)
    const factor = system_type === '80/20' ? 80 : 90;
    // Pt = comparative price of bid under consideration
    // Pmin = comparative price of lowest acceptable bid
    if (minPrice === 0) return 0;
    
    const score = factor * (1 - ((bidPrice - minPrice) / minPrice));
    return Math.max(0, score); // Price score shouldn't be negative in this context, although technically possible if price is > 2*Pmin
};

const evaluateTenderBids = async (tenderId) => {
    // 1. Get Tender setup
    const tenderQuery = await db.query('SELECT * FROM tenders WHERE id = $1', [tenderId]);
    if (tenderQuery.rows.length === 0) {
        throw new Error('Tender not found');
    }
    const tender = tenderQuery.rows[0];

    // 2. Get all bids for tender
    const bidsQuery = await db.query(`
        SELECT b.id AS bid_id, b.total_price, b.functionality_score, b.psira_compliant,
               br.bbbee_level, br.company_name
        FROM bids b
        JOIN bidders br ON b.bidder_id = br.id
        WHERE b.tender_id = $1
    `, [tenderId]);
    
    const bids = bidsQuery.rows;

    let evaluations = [];

    // 3. Filter out non-compliant (PSIRA or Functionality)
    const validBids = bids.filter(bid => {
        if (!bid.psira_compliant) {
            evaluations.push({
                bid_id: bid.bid_id,
                disqualified: true,
                reason: 'Non-compliant with PSIRA sectoral determination'
            });
            return false;
        }
        if (bid.functionality_score < tender.min_functionality_score) {
            evaluations.push({
                bid_id: bid.bid_id,
                disqualified: true,
                reason: `Failed minimum functionality threshold of ${tender.min_functionality_score}`
            });
            return false;
        }
        return true;
    });

    // 4. Find lowest acceptable price
    if (validBids.length > 0) {
        let minPrice = Math.min(...validBids.map(b => parseFloat(b.total_price)));
        
        // 5. Calculate scores
        for (const bid of validBids) {
            const priceScore = calculatePriceScore(tender.system_type, parseFloat(bid.total_price), minPrice);
            const bbbeeScore = getBbbeePoints(tender.system_type, bid.bbbee_level);
            const totalScore = priceScore + bbbeeScore;

            evaluations.push({
                bid_id: bid.bid_id,
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
