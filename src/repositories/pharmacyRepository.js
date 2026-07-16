const { query, pool } = require('../config/database');

async function createMedicine(hospitalId, data) {
  const result = await query(
    `INSERT INTO medicines (
       hospital_id, medicine_code, medicine_name, generic_name, category, manufacturer,
       dosage_form, strength, unit_of_measure, unit_price, reorder_level, requires_prescription
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, 0), COALESCE($12, true))
     RETURNING *`,
    [
      hospitalId, data.medicine_code, data.medicine_name, data.generic_name || null,
      data.category, data.manufacturer || null, data.dosage_form, data.strength || null,
      data.unit_of_measure, data.unit_price, data.reorder_level, data.requires_prescription,
    ],
  );
  return result.rows[0];
}

async function findMedicineById(hospitalId, medicineId) {
  const result = await query(
    `SELECT m.*, COALESCE(SUM(mb.quantity_on_hand), 0)::int AS total_stock
     FROM medicines m
     LEFT JOIN medicine_batches mb ON mb.medicine_id = m.medicine_id AND mb.status = 'active'
     WHERE m.hospital_id = $1 AND m.medicine_id = $2
     GROUP BY m.medicine_id`,
    [hospitalId, medicineId],
  );
  return result.rows[0] || null;
}

async function listMedicines(hospitalId, filters) {
  const { search, category, status, requiresPrescription, page, pageSize } = filters;
  const conditions = ['m.hospital_id = $1'];
  const params = [hospitalId];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(m.medicine_name ILIKE $${params.length} OR m.generic_name ILIKE $${params.length} OR m.medicine_code ILIKE $${params.length})`);
  }
  if (category) { params.push(category); conditions.push(`m.category = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`m.status = $${params.length}`); }
  if (requiresPrescription !== undefined) { params.push(requiresPrescription); conditions.push(`m.requires_prescription = $${params.length}`); }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const countResult = await query(`SELECT COUNT(*)::int AS total FROM medicines m ${whereClause}`, params);

  const offset = (page - 1) * pageSize;
  params.push(pageSize); const lp = params.length;
  params.push(offset);   const op = params.length;

  const rowsResult = await query(
    `SELECT m.*, COALESCE(SUM(mb.quantity_on_hand), 0)::int AS total_stock
     FROM medicines m
     LEFT JOIN medicine_batches mb ON mb.medicine_id = m.medicine_id AND mb.status = 'active'
     ${whereClause}
     GROUP BY m.medicine_id
     ORDER BY m.medicine_name LIMIT $${lp} OFFSET $${op}`,
    params,
  );
  return { rows: rowsResult.rows, totalCount: countResult.rows[0].total };
}

async function updateMedicine(hospitalId, medicineId, data) {
  const fieldMap = {
    medicine_name: 'medicine_name', generic_name: 'generic_name', category: 'category',
    manufacturer: 'manufacturer', dosage_form: 'dosage_form', strength: 'strength',
    unit_of_measure: 'unit_of_measure', unit_price: 'unit_price', reorder_level: 'reorder_level',
    requires_prescription: 'requires_prescription', status: 'status',
  };
  const setClauses = [];
  const params = [hospitalId, medicineId];
  Object.keys(fieldMap).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      params.push(data[key]);
      setClauses.push(`${fieldMap[key]} = $${params.length}`);
    }
  });
  if (!setClauses.length) return findMedicineById(hospitalId, medicineId);
  setClauses.push('updated_at = now()');
  const result = await query(
    `UPDATE medicines SET ${setClauses.join(', ')} WHERE hospital_id = $1 AND medicine_id = $2 RETURNING *`,
    params,
  );
  return result.rows[0] || null;
}

async function receiveBatch(hospitalId, medicineId, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const batchResult = await client.query(
      `INSERT INTO medicine_batches (
         hospital_id, medicine_id, batch_number, purchase_price, selling_price,
         quantity_received, quantity_on_hand, manufactured_date, expiry_date
       ) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8)
       RETURNING *`,
      [
        hospitalId, medicineId, data.batch_number, data.purchase_price, data.selling_price,
        data.quantity, data.manufactured_date || null, data.expiry_date,
      ],
    );
    const batch = batchResult.rows[0];

    await client.query(
      `INSERT INTO pharmacy_stock_transactions
       (hospital_id, medicine_batch_id, medicine_id, transaction_type, quantity, reference_note)
       VALUES ($1, $2, $3, 'receive', $4, $5)`,
      [hospitalId, batch.medicine_batch_id, medicineId, data.quantity, data.reference_note || null],
    );

    await client.query('COMMIT');
    return batch;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listBatches(hospitalId, medicineId, includeAll) {
  const statusCondition = includeAll ? '' : "AND status = 'active' AND quantity_on_hand > 0";
  const result = await query(
    `SELECT * FROM medicine_batches
     WHERE hospital_id = $1 AND medicine_id = $2 ${statusCondition}
     ORDER BY expiry_date ASC`,
    [hospitalId, medicineId],
  );
  return result.rows;
}

async function findBatchById(hospitalId, batchId, medicineId) {
  const result = await query(
    `SELECT * FROM medicine_batches WHERE hospital_id = $1 AND medicine_batch_id = $2 AND medicine_id = $3`,
    [hospitalId, batchId, medicineId],
  );
  return result.rows[0] || null;
}

async function findBatchByIdOnly(hospitalId, batchId) {
  const result = await query(
    `SELECT * FROM medicine_batches WHERE hospital_id = $1 AND medicine_batch_id = $2`,
    [hospitalId, batchId],
  );
  return result.rows[0] || null;
}

async function updateBatchStatus(hospitalId, batchId, status) {
  const result = await query(
    `UPDATE medicine_batches SET status = $3, updated_at = now()
     WHERE hospital_id = $1 AND medicine_batch_id = $2 RETURNING *`,
    [hospitalId, batchId, status],
  );
  return result.rows[0] || null;
}

async function recordTransaction(client, hospitalId, batchId, medicineId, type, qty, extras = {}) {
  await client.query(
    `INSERT INTO pharmacy_stock_transactions
     (hospital_id, medicine_batch_id, medicine_id, transaction_type, quantity,
      patient_id, prescription_item_id, invoice_item_id, reference_note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      hospitalId, batchId, medicineId, type, qty,
      extras.patient_id || null, extras.prescription_item_id || null,
      extras.invoice_item_id || null, extras.reference_note || null,
    ],
  );
}

async function dispense(hospitalId, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const batchRes = await client.query(
      `SELECT * FROM medicine_batches WHERE hospital_id = $1 AND medicine_batch_id = $2 FOR UPDATE`,
      [hospitalId, data.medicine_batch_id],
    );
    const batch = batchRes.rows[0];
    if (!batch) {
      const err = new Error('Batch not found');
      err.code = 'BATCH_NOT_FOUND';
      throw err;
    }
    if (batch.status !== 'active') {
      const err = new Error(`Cannot dispense from a batch with status: ${batch.status}`);
      err.code = 'BATCH_INACTIVE';
      throw err;
    }
    if (batch.quantity_on_hand < data.quantity) {
      const err = new Error(`Insufficient stock. Requested: ${data.quantity}, Available: ${batch.quantity_on_hand}`);
      err.code = 'INSUFFICIENT_STOCK';
      throw err;
    }

    const updatedRes = await client.query(
      `UPDATE medicine_batches SET quantity_on_hand = quantity_on_hand - $3, updated_at = now()
       WHERE hospital_id = $1 AND medicine_batch_id = $2 RETURNING *`,
      [hospitalId, batch.medicine_batch_id, data.quantity],
    );

    await recordTransaction(client, hospitalId, batch.medicine_batch_id, batch.medicine_id, 'dispense', -data.quantity, {
      patient_id: data.patient_id,
      prescription_item_id: data.prescription_item_id,
      invoice_item_id: data.invoice_item_id,
      reference_note: data.reference_note,
    });

    await client.query('COMMIT');
    return updatedRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function stockIn(hospitalId, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const batchRes = await client.query(
      `SELECT * FROM medicine_batches WHERE hospital_id = $1 AND medicine_batch_id = $2 FOR UPDATE`,
      [hospitalId, data.medicine_batch_id],
    );
    const batch = batchRes.rows[0];
    if (!batch) {
      const err = new Error('Batch not found');
      err.code = 'BATCH_NOT_FOUND';
      throw err;
    }

    const updatedRes = await client.query(
      `UPDATE medicine_batches SET quantity_on_hand = quantity_on_hand + $3, updated_at = now()
       WHERE hospital_id = $1 AND medicine_batch_id = $2 RETURNING *`,
      [hospitalId, batch.medicine_batch_id, data.quantity],
    );

    await recordTransaction(client, hospitalId, batch.medicine_batch_id, batch.medicine_id, 'stock_in', data.quantity, {
      reference_note: data.reference_note,
    });

    await client.query('COMMIT');
    return updatedRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function adjustment(hospitalId, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const batchRes = await client.query(
      `SELECT * FROM medicine_batches WHERE hospital_id = $1 AND medicine_batch_id = $2 FOR UPDATE`,
      [hospitalId, data.medicine_batch_id],
    );
    const batch = batchRes.rows[0];
    if (!batch) {
      const err = new Error('Batch not found');
      err.code = 'BATCH_NOT_FOUND';
      throw err;
    }

    const newQty = batch.quantity_on_hand + data.quantity;
    if (newQty < 0) {
      const err = new Error(`Adjustment would result in negative stock. Current: ${batch.quantity_on_hand}`);
      err.code = 'NEGATIVE_STOCK';
      throw err;
    }

    const updatedRes = await client.query(
      `UPDATE medicine_batches SET quantity_on_hand = $3, updated_at = now()
       WHERE hospital_id = $1 AND medicine_batch_id = $2 RETURNING *`,
      [hospitalId, batch.medicine_batch_id, newQty],
    );

    const type = data.quantity >= 0 ? 'adjustment_up' : 'adjustment_down';
    await recordTransaction(client, hospitalId, batch.medicine_batch_id, batch.medicine_id, type, data.quantity, {
      reference_note: data.reference_note,
    });

    await client.query('COMMIT');
    return updatedRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getLowStockAlerts(hospitalId) {
  const result = await query(
    `SELECT m.medicine_id, m.medicine_code, m.medicine_name, m.reorder_level,
       COALESCE(SUM(mb.quantity_on_hand), 0)::int AS current_stock
     FROM medicines m
     LEFT JOIN medicine_batches mb ON mb.medicine_id = m.medicine_id AND mb.status = 'active'
     WHERE m.hospital_id = $1 AND m.status = 'active'
     GROUP BY m.medicine_id
     HAVING COALESCE(SUM(mb.quantity_on_hand), 0) <= m.reorder_level
     ORDER BY m.medicine_name`,
    [hospitalId],
  );
  return result.rows;
}

async function getExpiryAlerts(hospitalId, withinDays = 30) {
  const result = await query(
    `SELECT mb.medicine_batch_id, mb.batch_number, mb.expiry_date, mb.quantity_on_hand,
       m.medicine_id, m.medicine_code, m.medicine_name
     FROM medicine_batches mb
     JOIN medicines m ON m.medicine_id = mb.medicine_id
     WHERE mb.hospital_id = $1 AND mb.status = 'active' AND mb.quantity_on_hand > 0
       AND mb.expiry_date <= CURRENT_DATE + $2::interval
     ORDER BY mb.expiry_date ASC`,
    [hospitalId, `${withinDays} days`],
  );
  return result.rows;
}

async function getStockSummary(hospitalId, medicineId) {
  const result = await query(
    `SELECT m.medicine_id, m.medicine_code, m.medicine_name, m.unit_of_measure,
       COALESCE(SUM(mb.quantity_on_hand), 0)::int AS total_stock,
       COUNT(mb.medicine_batch_id)::int AS active_batches,
       MIN(mb.expiry_date) AS earliest_expiry
     FROM medicines m
     LEFT JOIN medicine_batches mb ON mb.medicine_id = m.medicine_id AND mb.status = 'active' AND mb.quantity_on_hand > 0
     WHERE m.hospital_id = $1 AND m.medicine_id = $2
     GROUP BY m.medicine_id`,
    [hospitalId, medicineId],
  );
  return result.rows[0] || null;
}

async function listTransactions(hospitalId, filters) {
  const { medicineId, batchId, transactionType, page, pageSize } = filters;
  const conditions = ['t.hospital_id = $1'];
  const params = [hospitalId];

  if (medicineId) { params.push(medicineId); conditions.push(`t.medicine_id = $${params.length}`); }
  if (batchId) { params.push(batchId); conditions.push(`t.medicine_batch_id = $${params.length}`); }
  if (transactionType) { params.push(transactionType); conditions.push(`t.transaction_type = $${params.length}`); }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const countResult = await query(`SELECT COUNT(*)::int AS total FROM pharmacy_stock_transactions t ${whereClause}`, params);

  const offset = (page - 1) * pageSize;
  params.push(pageSize); const lp = params.length;
  params.push(offset);   const op = params.length;

  const rowsResult = await query(
    `SELECT t.*, m.medicine_name, m.medicine_code, mb.batch_number, mb.expiry_date
     FROM pharmacy_stock_transactions t
     JOIN medicines m ON m.medicine_id = t.medicine_id
     JOIN medicine_batches mb ON mb.medicine_batch_id = t.medicine_batch_id
     ${whereClause}
     ORDER BY t.performed_at DESC LIMIT $${lp} OFFSET $${op}`,
    params,
  );
  return { rows: rowsResult.rows, totalCount: countResult.rows[0].total };
}

module.exports = {
  createMedicine, findMedicineById, listMedicines, updateMedicine,
  receiveBatch, listBatches, findBatchById, findBatchByIdOnly, updateBatchStatus,
  dispense, stockIn, adjustment,
  getLowStockAlerts, getExpiryAlerts, getStockSummary, listTransactions,
};
