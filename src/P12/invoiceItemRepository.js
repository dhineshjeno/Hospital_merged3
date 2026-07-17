// src/repositories/invoiceItemRepository.js
// Invoice Item Repository - Database operations for invoice items

const { query } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// INVOICE ITEM REPOSITORY
// ============================================================================

/**
 * Create a new invoice item
 */
async function create(itemData) {
  try {
    const itemId = itemData.invoice_item_id || uuidv4();

    const result = await query(
      `INSERT INTO invoice_items (
        invoice_item_id,
        hospital_id,
        invoice_id,
        service_name,
        description,
        quantity,
        rate,
        amount,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING *`,
      [
        itemId,
        itemData.hospital_id,
        itemData.invoice_id,
        itemData.service_name,
        itemData.description,
        itemData.quantity,
        itemData.rate,
        itemData.amount,
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create invoice item');
    }

    return formatInvoiceItem(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find items by invoice
 */
async function findByInvoice(hospitalId, invoiceId) {
  try {
    const result = await query(
      `SELECT * FROM invoice_items 
       WHERE hospital_id = $1 AND invoice_id = $2
       ORDER BY created_at ASC`,
      [hospitalId, invoiceId]
    );

    return result.rows.map(formatInvoiceItem);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get total for invoice
 */
async function getInvoiceTotal(hospitalId, invoiceId) {
  try {
    const result = await query(
      `SELECT SUM(amount) as total FROM invoice_items 
       WHERE hospital_id = $1 AND invoice_id = $2`,
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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format invoice item object
 */
function formatInvoiceItem(itemRow) {
  if (!itemRow) {
    return null;
  }

  return {
    invoice_item_id: itemRow.invoice_item_id,
    invoice_id: itemRow.invoice_id,
    service_name: itemRow.service_name,
    description: itemRow.description,
    quantity: itemRow.quantity,
    rate: parseFloat(itemRow.rate),
    amount: parseFloat(itemRow.amount),
    created_at: itemRow.created_at,
    updated_at: itemRow.updated_at,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  create,
  findByInvoice,
  getInvoiceTotal,
  formatInvoiceItem,
};