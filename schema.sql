-- Drop tables if they exist
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS bids;
DROP TABLE IF EXISTS bidders;
DROP TABLE IF EXISTS tenders;

-- 1. Create tenders table
CREATE TABLE tenders (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    closing_date TIMESTAMP NOT NULL,
    system_type VARCHAR(10) NOT NULL CHECK (system_type IN ('80/20', '90/10')),
    min_functionality_score INT DEFAULT 70,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create bidders table
CREATE TABLE bidders (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    psira_number VARCHAR(50) UNIQUE NOT NULL,
    bbbee_level INT CHECK (bbbee_level BETWEEN 1 AND 8 OR bbbee_level IS NULL),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create bids table
-- This stores the tender bid details for a specific bidder and tender
CREATE TABLE bids (
    id SERIAL PRIMARY KEY,
    tender_id INT REFERENCES tenders(id) ON DELETE CASCADE,
    bidder_id INT REFERENCES bidders(id) ON DELETE CASCADE,
    total_price DECIMAL(15, 2) NOT NULL,
    functionality_score INT NOT NULL,
    psira_compliant BOOLEAN DEFAULT true, -- If pricing meets sectoral determination
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tender_id, bidder_id)
);

-- 4. Create evaluations table
-- This stores the calculated scores
CREATE TABLE evaluations (
    id SERIAL PRIMARY KEY,
    bid_id INT REFERENCES bids(id) ON DELETE CASCADE UNIQUE,
    price_score DECIMAL(5, 2),
    bbbee_score DECIMAL(5, 2),
    total_score DECIMAL(5, 2),
    rank INT,
    disqualified BOOLEAN DEFAULT false,
    disqualification_reason TEXT,
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
