// src/repositories/labOrderRepository.js
// Lab Order Repository - Database operations for lab orders

const { query } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// LAB ORDER REPOSITORY
// ============================================================================

/**
 * Create a new lab order
 */
async function create(orderData) {
  try {
    const orderId = orderData.lab_order_id || uuidv4();

    const result = await query(
      `INSERT INTO lab_orders (
        lab_order_id,
        hospital_id,
        patient_id,
        doctor_id,
        consultation_id,
        test_codes,
        urgency,
        clinical_notes,
        status,
        ordered_at,
        ordered_by_id,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *`,
      [
        orderId,
        orderData.hospital_id,
        orderData.patient_id,
        orderData.doctor_id,
        orderData.consultation_id,
        orderData.test_codes,
        orderData.urgency,
        orderData.clinical_notes,
        orderData.status,
        orderData.ordered_at,
        orderData.ordered_by_id,
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create lab order');
    }

    return formatLabOrder(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find lab order by ID
 */
async function findById(hospitalId, orderId) {
  try {
    const result = await query(
      `SELECT * FROM lab_orders 
       WHERE lab_order_id = $1 AND hospital_id = $2`,
      [orderId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatLabOrder(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find lab orders by patient
 */
async function findByPatient(hospitalId, patientId, status = null) {
  try {
    let query_str = `SELECT * FROM lab_orders 
                     WHERE hospital_id = $1 AND patient_id = $2`;
    const params = [hospitalId, patientId];

    if (status) {
      query_str += ` AND status = $3`;
      params.push(status);
    }

    query_str += ` ORDER BY ordered_at DESC`;

    const result = await query(query_str, params);

    return result.rows.map(formatLabOrder);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get lab order with all results
 */
async function getWithResults(hospitalId, orderId) {
  try {
    const orderResult = await query(
      `SELECT * FROM lab_orders 
       WHERE lab_order_id = $1 AND hospital_id = $2`,
      [orderId, hospitalId]
    );

    if (orderResult.rows.length === 0) {
      return null;
    }

    const order = formatLabOrder(orderResult.rows[0]);

    const resultsResult = await query(
      `SELECT * FROM lab_results 
       WHERE lab_order_id = $1 AND hospital_id = $2
       ORDER BY reported_at DESC`,
      [orderId, hospitalId]
    );

    return {
      ...order,
      results: resultsResult.rows,
    };
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Update lab order
 */
async function update(hospitalId, orderId, updateData) {
  try {
    const fields = [];
    const values = [hospitalId, orderId];
    let paramCount = 2;

    const updatableFields = [
      'status',
      'notes',
      'sample_collected_at',
      'sample_collected_by_id',
    ];

    updatableFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        values.push(updateData[field]);
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await query(
      `UPDATE lab_orders 
       SET ${fields.join(', ')}
       WHERE lab_order_id = $2 AND hospital_id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatLabOrder(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get pending orders
 */
async function getPending(hospitalId) {
  try {
    const result = await query(
      `SELECT * FROM lab_orders 
       WHERE hospital_id = $1 AND status = 'Pending'
       ORDER BY urgency DESC, ordered_at ASC`,
      [hospitalId]
    );

    return result.rows.map(formatLabOrder);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find lab orders by hospital (all patients)
 */
async function findByHospital(hospitalId, status = null) {
  try {
    let query_str = `SELECT * FROM lab_orders WHERE hospital_id = $1`;
    const params = [hospitalId];

    if (status) {
      query_str += ` AND status = $2`;
      params.push(status);
    }

    query_str += ` ORDER BY ordered_at DESC LIMIT 100`;

    const result = await query(query_str, params);

    // Get results for each order
    const orders = result.rows.map(formatLabOrder);
    
    // We should probably fetch results too, since the frontend expects them.
    // Let's do a quick IN query for results if orders exist
    if (orders.length > 0) {
      const orderIds = orders.map(o => o.lab_order_id);
      const placeholders = orderIds.map((_, i) => `$${i + 2}`).join(',');
      const resultsQuery = await query(
        `SELECT * FROM lab_results WHERE hospital_id = $1 AND lab_order_id IN (${placeholders})`,
        [hospitalId, ...orderIds]
      );
      
      const resultsByOrder = {};
      resultsQuery.rows.forEach(r => {
        if (!resultsByOrder[r.lab_order_id]) resultsByOrder[r.lab_order_id] = [];
        resultsByOrder[r.lab_order_id].push(r);
      });
      
      orders.forEach(o => {
        o.results = resultsByOrder[o.lab_order_id] || [];
      });
    }

    return orders;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format lab order object
 */
function formatLabOrder(orderRow) {
  if (!orderRow) {
    return null;
  }

  return {
    lab_order_id: orderRow.lab_order_id,
    patient_id: orderRow.patient_id,
    doctor_id: orderRow.doctor_id,
    consultation_id: orderRow.consultation_id,
    test_codes: orderRow.test_codes,
    urgency: orderRow.urgency,
    clinical_notes: orderRow.clinical_notes,
    status: orderRow.status,
    ordered_at: orderRow.ordered_at,
    ordered_by_id: orderRow.ordered_by_id,
    sample_collected_at: orderRow.sample_collected_at,
    sample_collected_by_id: orderRow.sample_collected_by_id,
    notes: orderRow.notes,
    created_at: orderRow.created_at,
    updated_at: orderRow.updated_at,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  create,
  findById,
  findByPatient,
  getWithResults,
  update,
  getPending,
  findByHospital,
  formatLabOrder,
};