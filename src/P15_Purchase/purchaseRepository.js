const { query, pool } = require('../config/database');

class PurchaseRepository {
    async generateSawRefNo(client, hospitalId) {
        const year = new Date().getFullYear();
        const seqRes = await client.query("SELECT nextval('saw_purchase_seq') as seq");
        const seq = seqRes.rows[0].seq.padStart(6, '0');
        return `PH-${year}-${seq}`;
    }

    async getPreviousProfit(client, hospitalId, medicineCode) {
        // Get the latest purchase item for this medicine
        const sql = `
            SELECT profit_percentage 
            FROM purchase_items 
            WHERE hospital_id = $1 AND medicine_code = $2
            ORDER BY purchase_item_id DESC
            LIMIT 1
        `;
        const result = await client.query(sql, [hospitalId, medicineCode]);
        return result.rows.length ? parseFloat(result.rows[0].profit_percentage) : null;
    }

    async createPurchase(hospitalId, userId, data) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { supplier_id, invoice_no, purchase_date, items } = data;
            const saw_ref_no = await this.generateSawRefNo(client, hospitalId);

            // Create purchase header
            const headerSql = `
                INSERT INTO purchases (hospital_id, supplier_id, invoice_no, saw_ref_no, purchase_date, created_by, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'approved')
                RETURNING *
            `;
            const headerRes = await client.query(headerSql, [hospitalId, supplier_id, invoice_no, saw_ref_no, purchase_date, userId]);
            const purchase = headerRes.rows[0];

            let hasProfitDrop = false;
            let totalAmount = 0;

            // Process items
            const itemsArray = Array.isArray(items) ? items : Object.values(items);
            for (const item of itemsArray) {
                const { medicine_code, batch_no, expiry_date, quantity, cost_price, sale_price } = item;
                const profit_percentage = ((sale_price - cost_price) / sale_price) * 100;
                
                const previous_profit = await this.getPreviousProfit(client, hospitalId, medicine_code);
                
                let isProfitDropped = false;
                if (previous_profit !== null && profit_percentage < previous_profit) {
                    isProfitDropped = true;
                    hasProfitDrop = true;
                }

                // Insert item
                const itemSql = `
                    INSERT INTO purchase_items (hospital_id, purchase_id, medicine_code, batch_no, expiry_date, quantity, cost_price, sale_price, profit_percentage, previous_profit_percentage)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING *
                `;
                await client.query(itemSql, [hospitalId, purchase.purchase_id, medicine_code, batch_no, expiry_date, quantity, cost_price, sale_price, profit_percentage, previous_profit]);

                totalAmount += (cost_price * quantity);

                // Create approval request if profit dropped
                if (isProfitDropped) {
                    const diff = previous_profit - profit_percentage;
                    const approvalSql = `
                        INSERT INTO purchase_approvals (hospital_id, purchase_id, medicine_code, previous_profit, new_profit, profit_diff)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `;
                    await client.query(approvalSql, [hospitalId, purchase.purchase_id, medicine_code, previous_profit, profit_percentage, diff]);
                }
            }

            // If any item dropped profit, the whole purchase goes to pending
            if (hasProfitDrop) {
                await client.query('UPDATE purchases SET status = $1, total_amount = $2 WHERE purchase_id = $3', ['pending', totalAmount, purchase.purchase_id]);
                purchase.status = 'pending';
            } else {
                await client.query('UPDATE purchases SET total_amount = $1 WHERE purchase_id = $2', [totalAmount, purchase.purchase_id]);
            }
            
            purchase.total_amount = totalAmount;

            await client.query('COMMIT');
            return purchase;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getPendingApprovals(hospitalId) {
        const sql = `
            SELECT pa.*, p.saw_ref_no, p.invoice_no, s.name as supplier_name, p.purchase_date
            FROM purchase_approvals pa
            JOIN purchases p ON pa.purchase_id = p.purchase_id
            JOIN suppliers s ON p.supplier_id = s.supplier_id
            WHERE pa.hospital_id = $1 AND pa.status = 'pending'
            ORDER BY pa.created_at ASC
        `;
        const result = await query(sql, [hospitalId]);
        return result.rows;
    }

    async reviewApproval(hospitalId, approvalId, userId, data) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const { status, reason } = data; // 'approved' or 'rejected'
            
            const sql = `
                UPDATE purchase_approvals 
                SET status = $1, reason = $2, reviewed_by = $3, reviewed_at = now()
                WHERE hospital_id = $4 AND approval_id = $5 AND status = 'pending'
                RETURNING purchase_id
            `;
            const result = await client.query(sql, [status, reason, userId, hospitalId, approvalId]);
            
            if (result.rows.length === 0) {
                throw new Error('Approval not found or already processed');
            }

            const purchaseId = result.rows[0].purchase_id;

            // Check if all approvals for this purchase are resolved
            const pendingSql = `
                SELECT COUNT(*) as count FROM purchase_approvals 
                WHERE purchase_id = $1 AND status = 'pending'
            `;
            const pendingRes = await client.query(pendingSql, [purchaseId]);
            
            if (parseInt(pendingRes.rows[0].count) === 0) {
                // If any rejection exists, mark purchase as rejected? 
                // Or maybe just approve the purchase header if all are reviewed?
                // Let's assume if ALL items are approved, purchase is approved. If ANY rejected, purchase is rejected.
                const rejectedSql = `
                    SELECT COUNT(*) as count FROM purchase_approvals 
                    WHERE purchase_id = $1 AND status = 'rejected'
                `;
                const rejectedRes = await client.query(rejectedSql, [purchaseId]);
                
                const purchaseStatus = parseInt(rejectedRes.rows[0].count) > 0 ? 'rejected' : 'approved';
                
                await client.query('UPDATE purchases SET status = $1 WHERE purchase_id = $2', [purchaseStatus, purchaseId]);
            }

            await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new PurchaseRepository();
