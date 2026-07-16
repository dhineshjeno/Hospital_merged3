// src/repositories/prescriptionItemRepository.js
// Prescription Item Repository - Database operations for prescription items

const { query } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// PRESCRIPTION ITEM REPOSITORY
// ============================================================================

/**
 * Create a new prescription item
 */
async function create(itemData) {
  try {
    const itemId = itemData.prescription_item_id || uuidv4();

    const result = await query(
      `INSERT INTO prescription_items (
        prescription_item_id,
        hospital_id,
        prescription_id,
        medicine_id,
        medicine_name,
        dosage,
        unit,
        frequency,
        duration_days,
        quantity,
        instructions,
        side_effects,
        status,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15
      ) RETURNING *`,
      [
        itemId,
        itemData.hospital_id,
        itemData.prescription_id,
        itemData.medicine_id,
        itemData.medicine_name,
        itemData.dosage,
        itemData.unit,
        itemData.frequency,
        itemData.duration_days,
        itemData.quantity,
        itemData.instructions,
        itemData.side_effects,
        itemData.status,
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create prescription item');
    }

    return formatPrescriptionItem(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find prescription item by ID
 */
async function findById(hospitalId, itemId) {
  try {
    const result = await query(
      `SELECT * FROM prescription_items 
       WHERE prescription_item_id = $1 AND hospital_id = $2`,
      [itemId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatPrescriptionItem(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find items by prescription
 */
async function findByPrescription(hospitalId, prescriptionId) {
  try {
    const result = await query(
      `SELECT * FROM prescription_items 
       WHERE hospital_id = $1 AND prescription_id = $2
       ORDER BY created_at ASC`,
      [hospitalId, prescriptionId]
    );

    return result.rows.map(formatPrescriptionItem);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Update prescription item
 */
async function update(hospitalId, itemId, updateData) {
  try {
    const fields = [];
    const values = [hospitalId, itemId];
    let paramCount = 2;

    const updatableFields = [
      'status',
      'quantity_dispensed',
      'expiry_date',
      'batch_number',
      'dispensed_at',
      'dispensed_by_id',
      'instructions',
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
      `UPDATE prescription_items 
       SET ${fields.join(', ')}
       WHERE prescription_item_id = $2 AND hospital_id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatPrescriptionItem(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get pending items for patient
 */
async function getPendingForPatient(hospitalId, patientId) {
  try {
    const result = await query(
      `SELECT pi.* FROM prescription_items pi
       JOIN prescriptions p ON pi.prescription_id = p.prescription_id
       WHERE pi.hospital_id = $1 AND p.patient_id = $2 AND pi.status = 'Pending'
       ORDER BY pi.created_at ASC`,
      [hospitalId, patientId]
    );

    return result.rows.map(formatPrescriptionItem);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get dispensed items for patient
 */
async function getDispensedForPatient(hospitalId, patientId) {
  try {
    const result = await query(
      `SELECT pi.* FROM prescription_items pi
       JOIN prescriptions p ON pi.prescription_id = p.prescription_id
       WHERE pi.hospital_id = $1 AND p.patient_id = $2 AND pi.status = 'Dispensed'
       ORDER BY pi.dispensed_at DESC`,
      [hospitalId, patientId]
    );

    return result.rows.map(formatPrescriptionItem);
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format prescription item object
 */
function formatPrescriptionItem(itemRow) {
  if (!itemRow) {
    return null;
  }

  return {
    prescription_item_id: itemRow.prescription_item_id,
    prescription_id: itemRow.prescription_id,
    medicine_id: itemRow.medicine_id,
    medicine_name: itemRow.medicine_name,
    dosage: itemRow.dosage,
    unit: itemRow.unit,
    frequency: itemRow.frequency,
    duration_days: itemRow.duration_days,
    quantity: itemRow.quantity,
    quantity_dispensed: itemRow.quantity_dispensed,
    instructions: itemRow.instructions,
    side_effects: itemRow.side_effects,
    status: itemRow.status,
    expiry_date: itemRow.expiry_date,
    batch_number: itemRow.batch_number,
    dispensed_at: itemRow.dispensed_at,
    dispensed_by_id: itemRow.dispensed_by_id,
    created_at: itemRow.created_at,
    updated_at: itemRow.updated_at,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  create,
  findById,
  findByPrescription,
  update,
  getPendingForPatient,
  getDispensedForPatient,
  formatPrescriptionItem,
};