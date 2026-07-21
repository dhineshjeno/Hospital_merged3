require('dotenv').config();
process.env.NODE_ENV = 'test';
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

const request = require('supertest');
const app = require('../src/server');
const { query, pool } = require('../src/config/database');

jest.setTimeout(30000);

const HOSPITAL_A = '11111111-1111-1111-1111-111111111111';
const HOSPITAL_B = '22222222-2222-2222-2222-222222222222';
const PASSWORD = 'CorrectHorse!42';

let tokenA, tokenB, adminA;

beforeAll(async () => {
    // Register users
    const emailA = `dict-test-a-${Date.now()}@test.local`;
    const emailB = `dict-test-b-${Date.now()}@test.local`;
    
    await request(app).post('/api/v1/auth/register').send({ email: emailA, password: PASSWORD, firstName: 'A', lastName: 'Test', phone: '9876543210' });
    await request(app).post('/api/v1/auth/register').send({ email: emailB, password: PASSWORD, firstName: 'B', lastName: 'Test', phone: '9876543210' });

    const loginA = await request(app).post('/api/v1/auth/login').send({ email: emailA, password: PASSWORD });
    tokenA = loginA.body.data.token;
    adminA = loginA.body.data.user.id;

    // By default, registration gives receptionist. Let's make user A an admin for hospital A so they can approve.
    await query(`UPDATE users SET role = 'admin', hospital_id = $1 WHERE email = $2`, [HOSPITAL_A, emailA]);
    // Refresh token A for admin privileges
    const loginAAdmin = await request(app).post('/api/v1/auth/login').send({ email: emailA, password: PASSWORD });
    tokenA = loginAAdmin.body.data.token;

    // Make user B an admin for hospital B
    await query(`UPDATE users SET role = 'admin', hospital_id = $1 WHERE email = $2`, [HOSPITAL_B, emailB]);
    const loginB = await request(app).post('/api/v1/auth/login').send({ email: emailB, password: PASSWORD });
    tokenB = loginB.body.data.token;

    // Self-provision the medicines_dictionary table for tests
    await query(`
        CREATE TABLE IF NOT EXISTS medicines_dictionary (
            dictionary_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            hospital_id uuid NOT NULL,
            medicine_code varchar(50) NOT NULL,
            brand_name varchar(255) NOT NULL,
            generic_name varchar(255) NOT NULL,
            strength varchar(100),
            manufacturer varchar(255),
            hsn_code varchar(20),
            status varchar(20) DEFAULT 'pending',
            requested_by uuid,
            approved_by uuid,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            UNIQUE (hospital_id, medicine_code)
        )
    `);
});

afterAll(async () => {
    await pool.end();
});

describe('Dictionary Features', () => {
    test('1. Fuzzy Matching: Prevents inserting Paracetamol if Paracetmol exists', async () => {
        // Seed Paracetamol directly
        await query(
            `INSERT INTO medicines_dictionary (hospital_id, medicine_code, brand_name, generic_name, status) 
             VALUES ($1, 'MED-001', 'Paracetamol 500mg', 'Paracetamol', 'approved')`,
            [HOSPITAL_A]
        );

        // Attempt to request Paracetmol
        const reqData = {
            medicine_code: 'MED-002',
            brand_name: 'Paracetmol 500',
            generic_name: 'Paracetmol'
        };

        const res = await request(app)
            .post('/api/v1/dictionary/request')
            .set('Authorization', `Bearer ${tokenA}`)
            .send(reqData);

        expect(res.status).toBe(200); // 200 OK because we intercepted and returned duplicates
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe('POSSIBLE_DUPLICATE');
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].brand_name).toBe('Paracetamol 500mg');
    });

    test('2. Fuzzy Matching Override: Can bypass duplicate check with force=true', async () => {
        const reqData = {
            medicine_code: 'MED-002',
            brand_name: 'Paracetmol 500',
            generic_name: 'Paracetmol',
            force: true
        };

        const res = await request(app)
            .post('/api/v1/dictionary/request')
            .set('Authorization', `Bearer ${tokenA}`)
            .send(reqData);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.brand_name).toBe('Paracetmol 500');
    });

    test('3. Tenant Isolation: Hospital B does not see Hospital A dictionary items', async () => {
        // Hospital A has Paracetamol. Hospital B searches for it.
        const res = await request(app)
            .get('/api/v1/dictionary')
            .set('Authorization', `Bearer ${tokenB}`);

        expect(res.status).toBe(200);
        
        // Ensure Hospital B gets empty array or doesn't have MED-001
        const found = res.body.data.find(m => m.medicine_code === 'MED-001');
        expect(found).toBeUndefined();
    });
});
