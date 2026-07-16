// src/repositories/invoiceRepository.js
// Invoice Repository - Database operations for invoices

const { query } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// INVOICE REPOSITORY
// ============================================================================

/**
 * Create a new invoice
 */
async function create(invoiceData) {
  try {
    const invoiceId = invoiceData.invoice_id || uuidv4();

    const result = await query(
      `INSERT INTO invoices (
        invoice_id,
        hospital_id,
        patient_id,
        appointment_id,
        invoice_number,
        subtotal,
        discount_percent,
        discount_amount,
        discount_reason,
        tax_amount,
        total_amount,
        status,
        notes,
        issued_at,
        issued_by_id,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17
      ) RETURNING *`,
      [
        invoiceId,
        invoiceData.hospital_id,
        invoiceData.patient_id,
        invoiceData.appointment_id,
        invoiceData.invoice_number,
        invoiceData.subtotal,
        invoiceData.discount_percent,
        invoiceData.discount_amount,
        invoiceData.discount_reason,
        invoiceData.tax_amount,
        invoiceData.total_amount,
        invoiceData.status,
        invoiceData.notes,
        invoiceData.issued_at,
        invoiceData.issued_by_id,
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create invoice');
    }

    return formatInvoice(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find invoice by ID
 */
async function findById(hospitalId, invoiceId) {
  try {
    const result = await query(
      `SELECT * FROM invoices 
       WHERE invoice_id = $1 AND hospital_id = $2`,
      [invoiceId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatInvoice(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find invoices by patient
 */
async function findByPatient(hospitalId, patientId, status = null) {
  try {
    let query_str = `SELECT * FROM invoices 
                     WHERE hospital_id = $1 AND patient_id = $2`;
    const params = [hospitalId, patientId];

    if (status) {
      query_str += ` AND status = $3`;
      params.push(status);
    }

    query_str += ` ORDER BY issued_at DESC`;

    const result = await query(query_str, params);

    return result.rows.map(formatInvoice);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get invoice with all items
 */
async function getWithItems(hospitalId, invoiceId) {
  try {
    const invoiceResult = await query(
      `SELECT * FROM invoices 
       WHERE invoice_id = $1 AND hospital_id = $2`,
      [invoiceId, hospitalId]
    );

    if (invoiceResult.rows.length === 0) {
      return null;
    }

    const invoice = formatInvoice(invoiceResult.rows[0]);

    const itemsResult = await query(
      `SELECT * FROM invoice_items 
       WHERE invoice_id = $1 AND hospital_id = $2
       ORDER BY created_at ASC`,
      [invoiceId, hospitalId]
    );

    return {
      ...invoice,
      items: itemsResult.rows,
    };
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Update invoice
 */
async function update(hospitalId, invoiceId, updateData) {
  try {
    const fields = [];
    const values = [hospitalId, invoiceId];
    let paramCount = 2;

    const updatableFields = [
      'status',
      'notes',
      'paid_at',
      'cancelled_at',
      'cancelled_by_id',
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
      `UPDATE invoices 
       SET ${fields.join(', ')}
       WHERE invoice_id = $2 AND hospital_id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatInvoice(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get billing summary for date range
 */
async function getSummary(hospitalId, dateFrom, dateTo) {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'Partially Paid' THEN 1 END) as partially_paid_count,
        COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled_count,
        SUM(total_amount) as total_amount,
        SUM(CASE WHEN status = 'Paid' THEN total_amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status IN ('Pending', 'Partially Paid') THEN total_amount ELSE 0 END) as pending_amount
       FROM invoices
       WHERE hospital_id = $1 
       AND DATE(issued_at) >= $2 
       AND DATE(issued_at) <= $3`,
      [hospitalId, dateFrom, dateTo]
    );

    if (result.rows.length === 0) {
      return {
        total_invoices: 0,
        paid_count: 0,
        pending_count: 0,
        partially_paid_count: 0,
        cancelled_count: 0,
        total_amount: 0,
        paid_amount: 0,
        pending_amount: 0,
      };
    }

    const row = result.rows[0];
    return {
      total_invoices: parseInt(row.total_invoices) || 0,
      paid_count: parseInt(row.paid_count) || 0,
      pending_count: parseInt(row.pending_count) || 0,
      partially_paid_count: parseInt(row.partially_paid_count) || 0,
      cancelled_count: parseInt(row.cancelled_count) || 0,
      total_amount: parseFloat(row.total_amount) || 0,
      paid_amount: parseFloat(row.paid_amount) || 0,
      pending_amount: parseFloat(row.pending_amount) || 0,
    };
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format invoice object
 */
function formatInvoice(invoiceRow) {
  if (!invoiceRow) {
    return null;
  }

  return {
    invoice_id: invoiceRow.invoice_id,
    invoice_number: invoiceRow.invoice_number,
    patient_id: invoiceRow.patient_id,
    appointment_id: invoiceRow.appointment_id,
    subtotal: parseFloat(invoiceRow.subtotal),
    discount_percent: invoiceRow.discount_percent,
    discount_amount: parseFloat(invoiceRow.discount_amount),
    discount_reason: invoiceRow.discount_reason,
    tax_amount: parseFloat(invoiceRow.tax_amount),
    total_amount: parseFloat(invoiceRow.total_amount),
    status: invoiceRow.status,
    notes: invoiceRow.notes,
    issued_at: invoiceRow.issued_at,
    issued_by_id: invoiceRow.issued_by_id,
    paid_at: invoiceRow.paid_at,
    cancelled_at: invoiceRow.cancelled_at,
    cancelled_by_id: invoiceRow.cancelled_by_id,
    created_at: invoiceRow.created_at,
    updated_at: invoiceRow.updated_at,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  create,
  findById,
  findByPatient,
  getWithItems,
  update,
  getSummary,
  formatInvoice,
};