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

let tokenA, tokenB, adminA, supplierA;

beforeAll(async () => {
    // Register users
    const emailA = `purch-test-a-${Date.now()}@test.local`;
    const emailB = `purch-test-b-${Date.now()}@test.local`;
    
    await request(app).post('/api/v1/auth/register').send({ email: emailA, password: PASSWORD, firstName: 'A', lastName: 'Test', phone: '9876543210' });
    await request(app).post('/api/v1/auth/register').send({ email: emailB, password: PASSWORD, firstName: 'B', lastName: 'Test', phone: '9876543210' });

    // Make user A an admin
    await query(`UPDATE users SET role = 'admin', hospital_id = $1 WHERE email = $2`, [HOSPITAL_A, emailA]);
    const loginAAdmin = await request(app).post('/api/v1/auth/login').send({ email: emailA, password: PASSWORD });
    tokenA = loginAAdmin.body.data.token;
    adminA = loginAAdmin.body.data.user.id;

    // Make user B an admin
    await query(`UPDATE users SET role = 'admin', hospital_id = $1 WHERE email = $2`, [HOSPITAL_B, emailB]);
    const loginB = await request(app).post('/api/v1/auth/login').send({ email: emailB, password: PASSWORD });
    tokenB = loginB.body.data.token;

    // Self-provision the purchase schema for tests
    await query(`
        CREATE TABLE IF NOT EXISTS suppliers (
            supplier_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            hospital_id uuid NOT NULL,
            name varchar(255) NOT NULL,
            contact_person varchar(255),
            phone varchar(20),
            email varchar(255),
            address text,
            gst_number varchar(50),
            status varchar(20) DEFAULT 'active',
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS purchases (
            purchase_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            hospital_id uuid NOT NULL,
            supplier_id uuid NOT NULL,
            invoice_no varchar(100) NOT NULL,
            saw_ref_no varchar(50) NOT NULL,
            purchase_date date NOT NULL,
            entry_datetime timestamptz DEFAULT now(),
            total_amount numeric(12,2) DEFAULT 0,
            status varchar(20) DEFAULT 'pending',
            created_at timestamptz DEFAULT now(),
            created_by uuid,
            UNIQUE (hospital_id, supplier_id, invoice_no),
            UNIQUE (hospital_id, saw_ref_no)
        );
        CREATE TABLE IF NOT EXISTS purchase_items (
            purchase_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            hospital_id uuid NOT NULL,
            purchase_id uuid NOT NULL,
            medicine_code varchar(50) NOT NULL,
            batch_no varchar(100) NOT NULL,
            expiry_date date NOT NULL,
            quantity integer NOT NULL,
            cost_price numeric(12,2) NOT NULL,
            sale_price numeric(12,2) NOT NULL,
            profit_percentage numeric(5,2) NOT NULL,
            previous_profit_percentage numeric(5,2),
            UNIQUE (hospital_id, medicine_code, batch_no, expiry_date)
        );
        CREATE TABLE IF NOT EXISTS purchase_approvals (
            approval_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            hospital_id uuid NOT NULL,
            purchase_id uuid NOT NULL,
            medicine_code varchar(50) NOT NULL,
            previous_profit numeric(5,2) NOT NULL,
            new_profit numeric(5,2) NOT NULL,
            profit_diff numeric(5,2) NOT NULL,
            status varchar(20) DEFAULT 'pending',
            reason text,
            reviewed_by uuid,
            reviewed_at timestamptz,
            created_at timestamptz DEFAULT now()
        );
        CREATE SEQUENCE IF NOT EXISTS saw_purchase_seq START 1;
    `);

    // Create a supplier
    const supRes = await query(
        `INSERT INTO suppliers (hospital_id, name) VALUES ($1, 'Test Supplier') RETURNING supplier_id`,
        [HOSPITAL_A]
    );
    supplierA = supRes.rows[0].supplier_id;
});

afterAll(async () => {
    await pool.end();
});

describe('Purchase Validation Engine', () => {
    test('1. L4 Profit Protection: Purchase with profit drop is sent to approvals', async () => {
        const ts = Date.now();
        const medCode = `ZINC-${ts}`;

        // First purchase: high profit (cost 10, sale 20 -> 50% profit)
        const p1 = await request(app)
            .post('/api/v1/purchases')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                supplier_id: supplierA,
                invoice_no: `INV-${ts}-1`,
                purchase_date: '2026-01-01',
                items: [{
                    medicine_code: medCode,
                    batch_no: `B1-${ts}`,
                    expiry_date: '2027-01-01',
                    quantity: 10,
                    cost_price: 10,
                    sale_price: 20
                }]
            });
        
        if (p1.status !== 201) console.log('P1 Error:', p1.body);
        expect(p1.status).toBe(201);
        expect(p1.body.data.status).toBe('approved'); // No previous profit, so it approves automatically

        // Second purchase: lower profit (cost 15, sale 20 -> 25% profit)
        const p2 = await request(app)
            .post('/api/v1/purchases')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                supplier_id: supplierA,
                invoice_no: `INV-${ts}-2`,
                purchase_date: '2026-02-01',
                items: [{
                    medicine_code: medCode,
                    batch_no: `B2-${ts}`,
                    expiry_date: '2027-02-01',
                    quantity: 10,
                    cost_price: 15,
                    sale_price: 20
                }]
            });
        
        expect(p2.status).toBe(201);
        expect(p2.body.data.status).toBe('pending'); // Profit dropped from 50% to 25% -> block and pending approval
    });

    test('2. L1 & L3 Duplicate Prevention', async () => {
        const ts2 = Date.now();
        const invNo = `INV-${ts2}-3`;
        const medCode2 = `TEST-${ts2}`;
        const batchNo = `B3-${ts2}`;
        
        // Initial insert
        const initial = await request(app)
            .post('/api/v1/purchases')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                supplier_id: supplierA,
                invoice_no: invNo,
                purchase_date: '2026-03-01',
                items: [{
                    medicine_code: medCode2,
                    batch_no: batchNo,
                    expiry_date: '2027-03-01',
                    quantity: 10,
                    cost_price: 10,
                    sale_price: 20
                }]
            });
        if (initial.status !== 201) console.log('Initial insert Error:', initial.body);

        // L1: Supplier-invoice duplicate check (same supplier + same invoice)
        const dupL1 = await request(app)
            .post('/api/v1/purchases')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                supplier_id: supplierA,
                invoice_no: invNo,
                purchase_date: '2026-03-02',
                items: [{
                    medicine_code: `TEST-NEW-${ts2}`,
                    batch_no: `B4-${ts2}`,
                    expiry_date: '2027-04-01',
                    quantity: 10,
                    cost_price: 10,
                    sale_price: 20
                }]
            });
        if (dupL1.status !== 409) console.log('L1 dupCheck:', dupL1.body);
        expect(dupL1.status).toBe(409); // Conflict

        // L3: Batch uniqueness check (same medicine+batch+expiry)
        const dupL3 = await request(app)
            .post('/api/v1/purchases')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                supplier_id: supplierA,
                invoice_no: `INV-${ts2}-4`,
                purchase_date: '2026-03-02',
                items: [{
                    medicine_code: medCode2,
                    batch_no: batchNo,
                    expiry_date: '2027-03-01',
                    quantity: 10,
                    cost_price: 10,
                    sale_price: 20
                }]
            });
        if (dupL3.status !== 409) console.log('L3 dupCheck:', dupL3.body);
        expect(dupL3.status).toBe(409); // Conflict
    });

    test('3. Tenant Isolation: Hospital B cannot read Hospital A pending approvals', async () => {
        const res = await request(app)
            .get('/api/v1/purchases/approvals')
            .set('Authorization', `Bearer ${tokenB}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(0); // Hospital B sees no pending approvals
    });
});
