// src/repositories/roomRepository.js
// Room Repository - Database operations for rooms

const { query } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');

// ============================================================================
// ROOM REPOSITORY
// ============================================================================

/**
 * Create a new room
 */
async function create(roomData) {
  try {
    const roomId = roomData.room_id || uuidv4();

    const result = await query(
      `INSERT INTO rooms (
        room_id,
        hospital_id,
        ward_id,
        room_number,
        room_type,
        total_beds,
        available_beds,
        description,
        status,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING *`,
      [
        roomId,
        roomData.hospital_id,
        roomData.ward_id,
        roomData.room_number,
        roomData.room_type,
        roomData.total_beds,
        roomData.available_beds,
        roomData.description,
        roomData.status,
        new Date(),
        new Date(),
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create room');
    }

    return formatRoom(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find room by ID
 */
async function findById(hospitalId, roomId) {
  try {
    const result = await query(
      `SELECT * FROM rooms 
       WHERE room_id = $1 AND hospital_id = $2`,
      [roomId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatRoom(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find room by number in ward
 */
async function findByNumber(hospitalId, wardId, roomNumber) {
  try {
    const result = await query(
      `SELECT * FROM rooms 
       WHERE hospital_id = $1 AND ward_id = $2 AND room_number = $3`,
      [hospitalId, wardId, roomNumber]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatRoom(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Find rooms in a ward
 */
async function findByWard(hospitalId, wardId) {
  try {
    const result = await query(
      `SELECT * FROM rooms 
       WHERE hospital_id = $1 AND ward_id = $2 AND status = 'Active'
       ORDER BY room_number ASC`,
      [hospitalId, wardId]
    );

    return result.rows.map(formatRoom);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Update available beds count
 */
async function updateAvailableBeds(hospitalId, roomId) {
  try {
    const result = await query(
      `UPDATE rooms 
       SET available_beds = (
         SELECT total_beds - COUNT(*) FROM beds 
         WHERE room_id = $1 AND status = 'Occupied'
       )
       WHERE room_id = $1 AND hospital_id = $2
       RETURNING *`,
      [roomId, hospitalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return formatRoom(result.rows[0]);
  } catch (error) {
    throw error;
  }
}

// ============================================================================

/**
 * Get available rooms in ward
 */
async function getAvailableRooms(hospitalId, wardId) {
  try {
    const result = await query(
      `SELECT * FROM rooms 
       WHERE hospital_id = $1 AND ward_id = $2 AND status = 'Active' AND available_beds > 0
       ORDER BY available_beds DESC`,
      [hospitalId, wardId]
    );

    return result.rows.map(formatRoom);
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format room object
 */
function formatRoom(roomRow) {
  if (!roomRow) {
    return null;
  }

  return {
    room_id: roomRow.room_id,
    ward_id: roomRow.ward_id,
    room_number: roomRow.room_number,
    room_type: roomRow.room_type,
    total_beds: roomRow.total_beds,
    available_beds: roomRow.available_beds,
    occupied_beds: roomRow.total_beds - roomRow.available_beds,
    occupancy_percentage: ((roomRow.total_beds - roomRow.available_beds) / roomRow.total_beds * 100).toFixed(2),
    description: roomRow.description,
    status: roomRow.status,
    created_at: roomRow.created_at,
    updated_at: roomRow.updated_at,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  create,
  findById,
  findByNumber,
  findByWard,
  updateAvailableBeds,
  getAvailableRooms,
  formatRoom,
};