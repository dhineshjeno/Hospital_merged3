require('dotenv').config();
process.env.NODE_ENV = 'test';
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

const request = require('supertest');
const app = require('../src/server');
const { query, pool } = require('../src/config/database');

jest.setTimeout(30000);

const crypto = require('crypto');
const HOSPITAL_A = '11111111-1111-1111-1111-111111111111';
const HOSPITAL_B = '22222222-2222-2222-2222-222222222222';
const PASSWORD = 'CorrectHorse!42';

// Generate unique valid UUID per test run
const PATIENT_A = crypto.randomUUID();

let tokenA, tokenB;

beforeAll(async () => {
    const emailA = `wallet-test-a-${Date.now()}@test.local`;
    const emailB = `wallet-test-b-${Date.now()}@test.local`;
    
    await request(app).post('/api/v1/auth/register').send({ email: emailA, password: PASSWORD, firstName: 'A', lastName: 'Test', phone: '9876543210' });
    await request(app).post('/api/v1/auth/register').send({ email: emailB, password: PASSWORD, firstName: 'B', lastName: 'Test', phone: '9876543210' });

    await query(`UPDATE users SET role = 'admin', hospital_id = $1 WHERE email = $2`, [HOSPITAL_A, emailA]);
    const loginA = await request(app).post('/api/v1/auth/login').send({ email: emailA, password: PASSWORD });
    tokenA = loginA.body.data.token;

    await query(`UPDATE users SET role = 'admin', hospital_id = $1 WHERE email = $2`, [HOSPITAL_B, emailB]);
    const loginB = await request(app).post('/api/v1/auth/login').send({ email: emailB, password: PASSWORD });
    tokenB = loginB.body.data.token;

    // Provision wallet tables
    await query(`
        CREATE TABLE IF NOT EXISTS patient_wallets (
            wallet_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            hospital_id uuid NOT NULL,
            patient_id uuid NOT NULL,
            balance numeric(12,2) NOT NULL DEFAULT 0.00,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            UNIQUE (hospital_id, patient_id)
        );
        CREATE TABLE IF NOT EXISTS wallet_transactions (
            txn_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            hospital_id uuid NOT NULL,
            wallet_id uuid NOT NULL,
            patient_id uuid NOT NULL,
            txn_type varchar(20) NOT NULL,
            amount numeric(12,2) NOT NULL,
            balance_after numeric(12,2) NOT NULL,
            reference varchar(255),
            description text,
            created_by uuid,
            created_at timestamptz DEFAULT now()
        );
    `);
});

afterAll(async () => {
    await pool.end();
});

describe('Patient Wallet', () => {
    test('1. Credit adds to balance and writes to ledger', async () => {
        const r1 = await request(app)
            .post(`/api/v1/wallet/${PATIENT_A}/credit`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ amount: 500, description: 'Advance payment' });

        expect(r1.status).toBe(201);
        expect(parseFloat(r1.body.data.balance_after)).toBe(500);

        const r2 = await request(app)
            .post(`/api/v1/wallet/${PATIENT_A}/credit`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ amount: 250, description: 'Top-up' });

        expect(r2.status).toBe(201);
        expect(parseFloat(r2.body.data.balance_after)).toBe(750);
    });

    test('2. Debit reduces balance', async () => {
        const r = await request(app)
            .post(`/api/v1/wallet/${PATIENT_A}/debit`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ amount: 200, description: 'Bill settlement' });

        expect(r.status).toBe(201);
        expect(parseFloat(r.body.data.balance_after)).toBe(550);
    });

    test('3. Insufficient balance debit is blocked', async () => {
        const r = await request(app)
            .post(`/api/v1/wallet/${PATIENT_A}/debit`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ amount: 10000, description: 'Too much' });

        expect(r.status).toBe(409);
    });

    test('4. Ledger integrity: balance = sum(credits) - sum(debits)', async () => {
        // Credits: 500 + 250 = 750. Debits: 200. Balance: 550.
        const balanceRes = await request(app)
            .get(`/api/v1/wallet/${PATIENT_A}`)
            .set('Authorization', `Bearer ${tokenA}`);
        
        expect(balanceRes.status).toBe(200);
        const balance = parseFloat(balanceRes.body.data.balance);

        const historyRes = await request(app)
            .get(`/api/v1/wallet/${PATIENT_A}/history`)
            .set('Authorization', `Bearer ${tokenA}`);

        const history = historyRes.body.data;
        let totalCredits = 0, totalDebits = 0;
        for (const txn of history) {
            if (txn.txn_type === 'credit') totalCredits += parseFloat(txn.amount);
            else totalDebits += parseFloat(txn.amount);
        }

        expect(Math.abs((totalCredits - totalDebits) - balance)).toBeLessThan(0.01);
    });

    test('5. Tenant Isolation: Hospital B cannot read Hospital A wallet', async () => {
        const r = await request(app)
            .get(`/api/v1/wallet/${PATIENT_A}`)
            .set('Authorization', `Bearer ${tokenB}`);

        expect(r.status).toBe(200);
        // Hospital B's wallet for PATIENT_A should show 0 or a new empty wallet (not Hospital A's 550)
        const balance = r.body.data ? parseFloat(r.body.data.balance) : 0;
        expect(balance).toBe(0);
    });
});
