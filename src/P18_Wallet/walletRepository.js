const { query, pool } = require('../config/database');

class WalletRepository {
    async getOrCreateWallet(client, hospitalId, patientId) {
        // Try to get existing wallet
        const existing = await client.query(
            'SELECT * FROM patient_wallets WHERE hospital_id = $1 AND patient_id = $2',
            [hospitalId, patientId]
        );
        if (existing.rows.length) return existing.rows[0];

        // Create new wallet
        const created = await client.query(
            `INSERT INTO patient_wallets (hospital_id, patient_id, balance)
             VALUES ($1, $2, 0)
             RETURNING *`,
            [hospitalId, patientId]
        );
        return created.rows[0];
    }

    async getWallet(hospitalId, patientId) {
        const result = await query(
            'SELECT * FROM patient_wallets WHERE hospital_id = $1 AND patient_id = $2',
            [hospitalId, patientId]
        );
        return result.rows[0] || null;
    }

    async credit(hospitalId, patientId, amount, { reference, description, createdBy } = {}) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const wallet = await this.getOrCreateWallet(client, hospitalId, patientId);
            const newBalance = parseFloat(wallet.balance) + parseFloat(amount);

            // Update wallet balance
            await client.query(
                `UPDATE patient_wallets SET balance = $1, updated_at = now()
                 WHERE hospital_id = $2 AND patient_id = $3`,
                [newBalance, hospitalId, patientId]
            );

            // Append to ledger (immutable)
            const txn = await client.query(
                `INSERT INTO wallet_transactions
                 (hospital_id, wallet_id, patient_id, txn_type, amount, balance_after, reference, description, created_by)
                 VALUES ($1, $2, $3, 'credit', $4, $5, $6, $7, $8)
                 RETURNING *`,
                [hospitalId, wallet.wallet_id, patientId, amount, newBalance, reference, description, createdBy]
            );

            await client.query('COMMIT');
            return txn.rows[0];
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async debit(hospitalId, patientId, amount, { reference, description, createdBy } = {}) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const wallet = await this.getOrCreateWallet(client, hospitalId, patientId);
            const currentBalance = parseFloat(wallet.balance);

            if (currentBalance < parseFloat(amount)) {
                throw Object.assign(new Error('Insufficient wallet balance'), { code: 'INSUFFICIENT_BALANCE' });
            }

            const newBalance = currentBalance - parseFloat(amount);

            // Update wallet balance
            await client.query(
                `UPDATE patient_wallets SET balance = $1, updated_at = now()
                 WHERE hospital_id = $2 AND patient_id = $3`,
                [newBalance, hospitalId, patientId]
            );

            // Append to ledger (immutable)
            const txn = await client.query(
                `INSERT INTO wallet_transactions
                 (hospital_id, wallet_id, patient_id, txn_type, amount, balance_after, reference, description, created_by)
                 VALUES ($1, $2, $3, 'debit', $4, $5, $6, $7, $8)
                 RETURNING *`,
                [hospitalId, wallet.wallet_id, patientId, amount, newBalance, reference, description, createdBy]
            );

            await client.query('COMMIT');
            return txn.rows[0];
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async getHistory(hospitalId, patientId, page = 1, pageSize = 20) {
        const offset = (page - 1) * pageSize;
        const result = await query(
            `SELECT wt.* FROM wallet_transactions wt
             JOIN patient_wallets pw ON wt.wallet_id = pw.wallet_id
             WHERE wt.hospital_id = $1 AND wt.patient_id = $2
             ORDER BY wt.created_at DESC
             LIMIT $3 OFFSET $4`,
            [hospitalId, patientId, pageSize, offset]
        );
        return result.rows;
    }

    async verifyLedgerIntegrity(hospitalId, patientId) {
        // Sum all credits minus all debits = current balance
        const sumResult = await query(
            `SELECT 
               SUM(CASE WHEN txn_type = 'credit' THEN amount ELSE 0 END) as total_credits,
               SUM(CASE WHEN txn_type = 'debit' THEN amount ELSE 0 END) as total_debits
             FROM wallet_transactions wt
             JOIN patient_wallets pw ON wt.wallet_id = pw.wallet_id
             WHERE wt.hospital_id = $1 AND wt.patient_id = $2`,
            [hospitalId, patientId]
        );
        const { total_credits, total_debits } = sumResult.rows[0];
        const ledgerBalance = (parseFloat(total_credits) || 0) - (parseFloat(total_debits) || 0);

        const wallet = await this.getWallet(hospitalId, patientId);
        const walletBalance = wallet ? parseFloat(wallet.balance) : 0;

        return {
            ledger_balance: ledgerBalance,
            wallet_balance: walletBalance,
            is_consistent: Math.abs(ledgerBalance - walletBalance) < 0.01
        };
    }
}

module.exports = new WalletRepository();
