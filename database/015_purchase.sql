BEGIN;

CREATE TABLE suppliers (
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
CREATE INDEX idx_suppliers_hospital ON suppliers(hospital_id);

CREATE TABLE purchases (
    purchase_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id uuid NOT NULL,
    supplier_id uuid NOT NULL REFERENCES suppliers(supplier_id),
    invoice_no varchar(100) NOT NULL,
    saw_ref_no varchar(50) NOT NULL,
    purchase_date date NOT NULL,
    entry_datetime timestamptz DEFAULT now(),
    total_amount numeric(12,2) DEFAULT 0,
    status varchar(20) DEFAULT 'pending', -- pending approval if profit drops, else approved
    created_at timestamptz DEFAULT now(),
    created_by uuid,
    UNIQUE (hospital_id, supplier_id, invoice_no), -- L1: Supplier-invoice duplicate check
    UNIQUE (hospital_id, saw_ref_no) -- L2: Internal reference
);
CREATE INDEX idx_purchases_hospital ON purchases(hospital_id);

CREATE TABLE purchase_items (
    purchase_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id uuid NOT NULL,
    purchase_id uuid NOT NULL REFERENCES purchases(purchase_id),
    medicine_code varchar(50) NOT NULL,
    batch_no varchar(100) NOT NULL,
    expiry_date date NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    cost_price numeric(12,2) NOT NULL,
    sale_price numeric(12,2) NOT NULL,
    profit_percentage numeric(5,2) NOT NULL,
    previous_profit_percentage numeric(5,2),
    UNIQUE (hospital_id, medicine_code, batch_no, expiry_date) -- L3: Batch uniqueness
);
CREATE INDEX idx_purchase_items_hospital ON purchase_items(hospital_id);

CREATE TABLE purchase_approvals (
    approval_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id uuid NOT NULL,
    purchase_id uuid NOT NULL REFERENCES purchases(purchase_id),
    medicine_code varchar(50) NOT NULL,
    previous_profit numeric(5,2) NOT NULL,
    new_profit numeric(5,2) NOT NULL,
    profit_diff numeric(5,2) NOT NULL,
    status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reason text,
    reviewed_by uuid,
    reviewed_at timestamptz,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_purchase_approvals_hospital ON purchase_approvals(hospital_id);

-- Sequence for SAW internal reference (PH-YYYY-XXXXXX)
CREATE SEQUENCE saw_purchase_seq START 1;

COMMIT;
