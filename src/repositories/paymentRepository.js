// src/repositories/paymentRepository.js
// Payment Repository - Database operations for payments

const { query } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// PAYMENT REPOSITORY
// ============================================================================

/**
 * Create a new payment
 */
async function create(paymentData) {
  try {
    const paymentId = paymentData.payment_id || uuidv4();

    const result = await query(
      `INSERT INTO payments (
        payment_id,
        hospital_id,
        invoice_id,
        amount,
        payment_method,
        transaction_id,
        notes,
        status,
        received_at,
        received_by_id,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING *`,
      [
        paymentId,
        paymentData.hospital_id,
        paymentData.invoice_id,
        paymentData.amount,
        paymentData.payment_method,
        paymentData.transaction_id,
        paymentData.notes,
        paymentData.status,
        paymentData.received_at,
        paymentData.received_by_id,
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create payment');
    }

    return formatPayment(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find payment by ID
 */
async function findById(hospitalId, paymentId) {
  try {
    const result = await query(
      `SELECT * FROM payments 
       WHERE payment_id = $1 AND hospital_id = $2`,
      [paymentId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatPayment(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find payments by invoice
 */
async function findByInvoice(hospitalId, invoiceId) {
  try {
    const result = await query(
      `SELECT * FROM payments 
       WHERE hospital_id = $1 AND invoice_id = $2
       ORDER BY received_at DESC`,
      [hospitalId, invoiceId]
    );

    return result.rows.map(formatPayment);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get total paid for invoice
 */
async function getInvoiceTotalPaid(hospitalId, invoiceId) {
  try {
    const result = await query(
      `SELECT SUM(amount) as total FROM payments 
       WHERE hospital_id = $1 AND invoice_id = $2 AND status = 'Completed'`,
      [hospitalId, invoiceId]
    );

    if (result.rows.length === 0 || !result.rows[0].total) {
      return 0;
    }

    return parseFloat(result.rows[0].total);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get payments by date range
 */
async function getByDateRange(hospitalId, dateFrom, dateTo) {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as payment_count,
        SUM(amount) as total_received,
        payment_method
       FROM payments
       WHERE hospital_id = $1 
       AND DATE(received_at) >= $2 
       AND DATE(received_at) <= $3
       AND status = 'Completed'
       GROUP BY payment_method
       ORDER BY total_received DESC`,
      [hospitalId, dateFrom, dateTo]
    );

    return result.rows;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format payment object
 */
function formatPayment(paymentRow) {
  if (!paymentRow) {
    return null;
  }

  return {
    payment_id: paymentRow.payment_id,
    invoice_id: paymentRow.invoice_id,
    amount: parseFloat(paymentRow.amount),
    payment_method: paymentRow.payment_method,
    transaction_id: paymentRow.transaction_id,
    notes: paymentRow.notes,
    status: paymentRow.status,
    received_at: paymentRow.received_at,
    received_by_id: paymentRow.received_by_id,
    created_at: paymentRow.created_at,
    updated_at: paymentRow.updated_at,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  create,
  findById,
  findByInvoice,
  getInvoiceTotalPaid,
  getByDateRange,
  formatPayment,
};