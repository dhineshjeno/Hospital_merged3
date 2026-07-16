// src/repositories/bedRepository.js
// Bed Repository - Database operations for beds

const { query } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// BED REPOSITORY
// ============================================================================

/**
 * Create a new bed
 */
async function create(bedData) {
  try {
    const bedId = bedData.bed_id || uuidv4();

    const result = await query(
      `INSERT INTO beds (
        bed_id,
        hospital_id,
        room_id,
        bed_number,
        status,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *`,
      [
        bedId,
        bedData.hospital_id,
        bedData.room_id,
        bedData.bed_number,
        bedData.status,
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create bed');
    }

    return formatBed(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find bed by ID
 */
async function findById(hospitalId, bedId) {
  try {
    const result = await query(
      `SELECT * FROM beds 
       WHERE bed_id = $1 AND hospital_id = $2`,
      [bedId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatBed(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find bed by number in room
 */
async function findByNumber(hospitalId, roomId, bedNumber) {
  try {
    const result = await query(
      `SELECT * FROM beds 
       WHERE hospital_id = $1 AND room_id = $2 AND bed_number = $3`,
      [hospitalId, roomId, bedNumber]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatBed(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find beds in a room
 */
async function findByRoom(hospitalId, roomId) {
  try {
    const result = await query(
      `SELECT * FROM beds 
       WHERE hospital_id = $1 AND room_id = $2
       ORDER BY bed_number ASC`,
      [hospitalId, roomId]
    );

    return result.rows.map(formatBed);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Update bed status
 */
async function update(hospitalId, bedId, updateData) {
  try {
    const fields = [];
    const values = [hospitalId, bedId];
    let paramCount = 2;

    const updatableFields = ['status'];

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
      `UPDATE beds 
       SET ${fields.join(', ')}
       WHERE bed_id = $2 AND hospital_id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatBed(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get available beds
 */
async function getAvailableBeds(hospitalId) {
  try {
    const result = await query(
      `SELECT * FROM beds 
       WHERE hospital_id = $1 AND status = 'Available'
       ORDER BY created_at ASC`,
      [hospitalId]
    );

    return result.rows.map(formatBed);
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format bed object
 */
function formatBed(bedRow) {
  if (!bedRow) {
    return null;
  }

  return {
    bed_id: bedRow.bed_id,
    room_id: bedRow.room_id,
    bed_number: bedRow.bed_number,
    status: bedRow.status,
    created_at: bedRow.created_at,
    updated_at: bedRow.updated_at,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  create,
  findById,
  findByNumber,
  findByRoom,
  update,
  getAvailableBeds,
  formatBed,
};