// src/repositories/wardRepository.js
// Ward Repository - Database operations for wards

const { query } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// WARD REPOSITORY
// ============================================================================

/**
 * Create a new ward
 */
async function create(wardData) {
  try {
    const wardId = wardData.ward_id || uuidv4();

    const result = await query(
      `INSERT INTO wards (
        ward_id,
        hospital_id,
        name,
        ward_type,
        total_beds,
        available_beds,
        description,
        status,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING *`,
      [
        wardId,
        wardData.hospital_id,
        wardData.name,
        wardData.ward_type,
        wardData.total_beds,
        wardData.available_beds,
        wardData.description,
        wardData.status,
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create ward');
    }

    return formatWard(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find ward by ID
 */
async function findById(hospitalId, wardId) {
  try {
    const result = await query(
      `SELECT * FROM wards 
       WHERE ward_id = $1 AND hospital_id = $2`,
      [wardId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatWard(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find ward by name
 */
async function findByName(hospitalId, name) {
  try {
    const result = await query(
      `SELECT * FROM wards 
       WHERE hospital_id = $1 AND LOWER(name) = LOWER($2)`,
      [hospitalId, name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatWard(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find all wards in hospital
 */
async function findByHospital(hospitalId) {
  try {
    const result = await query(
      `SELECT * FROM wards 
       WHERE hospital_id = $1 AND status = 'Active'
       ORDER BY name ASC`,
      [hospitalId]
    );

    return result.rows.map(formatWard);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Update ward
 */
async function update(hospitalId, wardId, updateData) {
  try {
    const fields = [];
    const values = [hospitalId, wardId];
    let paramCount = 2;

    const updatableFields = [
      'status',
      'description',
      'available_beds',
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
      `UPDATE wards 
       SET ${fields.join(', ')}
       WHERE ward_id = $2 AND hospital_id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatWard(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get ward occupancy
 */
async function getOccupancy(hospitalId, wardId) {
  try {
    const result = await query(
      `SELECT 
        total_beds,
        available_beds,
        (total_beds - available_beds) as occupied_beds,
        ROUND((total_beds - available_beds)::numeric / total_beds * 100, 2) as occupancy_percentage
       FROM wards
       WHERE ward_id = $1 AND hospital_id = $2`,
      [wardId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format ward object
 */
function formatWard(wardRow) {
  if (!wardRow) {
    return null;
  }

  return {
    ward_id: wardRow.ward_id,
    name: wardRow.name,
    ward_type: wardRow.ward_type,
    total_beds: wardRow.total_beds,
    available_beds: wardRow.available_beds,
    occupied_beds: wardRow.total_beds - wardRow.available_beds,
    occupancy_percentage: ((wardRow.total_beds - wardRow.available_beds) / wardRow.total_beds * 100).toFixed(2),
    description: wardRow.description,
    status: wardRow.status,
    created_at: wardRow.created_at,
    updated_at: wardRow.updated_at,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  create,
  findById,
  findByName,
  findByHospital,
  update,
  getOccupancy,
  formatWard,
};