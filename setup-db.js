const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const run = async () => {
    // Connect to 'postgres' database to create the new database
    const clientInput = new Client({
        connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
    });

    try {
        await clientInput.connect();
        // Drop DB if testing
        await clientInput.query('DROP DATABASE IF EXISTS security_tender_evaluator');
        await clientInput.query('CREATE DATABASE security_tender_evaluator');
        console.log('Database security_tender_evaluator created successfully.');
    } catch (e) {
        if (e.code === '42P04') {
            console.log('Database already exists.');
        } else {
            console.error('Error creating database:', e);
        }
    } finally {
        await clientInput.end();
    }

    // Connect to the newly created database and run the schema
    const newClientInput = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await newClientInput.connect();
        const schemaText = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
        await newClientInput.query(schemaText);
        console.log('Schema executed successfully.');
    } catch (e) {
        console.error('Error executing schema:', e);
    } finally {
        await newClientInput.end();
    }
};

run();
