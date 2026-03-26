-- Migration: Add evaluator tables
-- Run this AFTER the main schema is already set up

-- 1. Evaluators table — people assigned to assess a tender
CREATE TABLE IF NOT EXISTS evaluators (
    id SERIAL PRIMARY KEY,
    tender_id INT REFERENCES tenders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tender_id, email)
);

-- 2. Evaluator section scores — one row per evaluator × bidder × section × criterion
CREATE TABLE IF NOT EXISTS evaluator_scores (
    id SERIAL PRIMARY KEY,
    evaluator_id INT REFERENCES evaluators(id) ON DELETE CASCADE,
    tender_id INT REFERENCES tenders(id) ON DELETE CASCADE,
    bidder_id INT REFERENCES bidders(id) ON DELETE CASCADE,
    section VARCHAR(50) NOT NULL,          -- 'guarding' | 'contract' | 'infra' | 'company'
    criteria_key VARCHAR(100) NOT NULL,    -- matches the key in the frontend criteria arrays
    level_key VARCHAR(20),                 -- 'na' | 'nc' | 'supposed' | 'compliant' | 'excellent'
    points_available DECIMAL(6,2),
    weighted_score DECIMAL(8,4),
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(evaluator_id, tender_id, bidder_id, section, criteria_key)
);
