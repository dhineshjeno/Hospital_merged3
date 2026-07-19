// src/P16/legacyRoomController.js
const { pool } = require('../config/database');


async function getRoomTypes(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT DISTINCT r.room_type 
       FROM rooms r 
       JOIN wards w ON r.ward_id = w.ward_id 
       WHERE w.hospital_id = $1 AND r.status = 'Active'`,
      [req.hospitalId]
    );
    const types = result.rows.map((row, i) => ({
      id: i.toString(),
      name: row.room_type,
      description: `${row.room_type} Room`
    }));
    res.json({ success: true, data: types });
  } catch (error) { next(error); }
}

async function getRoomsByOccupancy(req, res, next, isOccupied) {
  try {
    // Rooms are "available" if they have > 0 available_beds.
    // Rooms are "occupied" if they have at least 1 occupied bed (total_beds - available_beds > 0).
    const filter = isOccupied ? 'r.total_beds > r.available_beds' : 'r.available_beds > 0';
    
    // Fetch rooms and their parent wards
    const query = `
      SELECT 
        r.room_id, r.room_number, r.room_type, r.total_beds, r.available_beds, r.status as room_status,
        w.ward_id, w.name as ward_name, w.ward_type
      FROM rooms r
      JOIN wards w ON r.ward_id = w.ward_id
      WHERE w.hospital_id = $1 AND r.status = 'Active' AND ${filter}
    `;
    const { rows } = await pool.query(query, [req.hospitalId]);

    const rooms = await Promise.all(rows.map(async row => {
      const room = {
        id: row.room_id,
        roomNumber: row.room_number,
        roomTypeName: row.room_type,
        floor: 1, // mock
        wing: row.ward_name,
        status: isOccupied ? 'occupied' : 'available',
        amenities: ['AC', 'TV', 'WiFi'],
        isEmergencyWard: row.ward_type === 'Emergency' || row.ward_type === 'ICU',
      };

      if (isOccupied) {
        // Find an active admission in this room's beds
        const admissionQuery = `
          SELECT a.admission_date, a.expected_stay_days, a.patient_id, p.first_name, p.last_name
          FROM admissions a
          JOIN beds b ON a.current_bed_id = b.bed_id
          JOIN patients p ON a.patient_id = p.patient_id
          WHERE p.hospital_id = $2 AND b.room_id = $1 AND a.status = 'active'
          LIMIT 1
        `;
        const admissionRes = await pool.query(admissionQuery, [row.room_id, req.hospitalId]);
        if (admissionRes.rows.length > 0) {
          const adm = admissionRes.rows[0];
          room.patientId = adm.patient_id;
          room.patientName = `${adm.first_name} ${adm.last_name}`.trim();
          room.checkInDate = adm.admission_date ? adm.admission_date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          
          if (adm.expected_stay_days) {
            const outDate = new Date(adm.admission_date || new Date());
            outDate.setDate(outDate.getDate() + adm.expected_stay_days);
            room.expectedCheckOutDate = outDate.toISOString().split('T')[0];
          }
          room.dailyRate = 5000;
        }
      }
      return room;
    }));

    res.json({ success: true, data: rooms });
  } catch (error) { next(error); }
}

async function getAvailableRooms(req, res, next) {
  return getRoomsByOccupancy(req, res, next, false);
}

async function getOccupiedRooms(req, res, next) {
  return getRoomsByOccupancy(req, res, next, true);
}

async function getEmergencyWards(req, res, next) {
  try {
    const query = `
      SELECT r.room_id, r.room_number, r.room_type, r.total_beds, r.available_beds, w.name as ward_name
      FROM rooms r
      JOIN wards w ON r.ward_id = w.ward_id
      WHERE w.hospital_id = $1 AND w.ward_type IN ('Emergency', 'ICU') AND r.status = 'Active'
    `;
    const { rows } = await pool.query(query, [req.hospitalId]);
    const rooms = rows.map(row => ({
      id: row.room_id,
      roomNumber: row.room_number,
      roomTypeName: row.room_type,
      floor: 1,
      wing: row.ward_name,
      status: row.available_beds > 0 ? 'available' : 'occupied',
      amenities: ['Oxygen', 'Monitor'],
      isEmergencyWard: true
    }));
    res.json({ success: true, data: rooms });
  } catch (error) { next(error); }
}

async function getRoomOccupancyStatus(req, res, next) {
  try {
    const { rows } = await pool.query(`SELECT SUM(total_beds) as tb, SUM(available_beds) as ab FROM wards WHERE hospital_id = $1`, [req.hospitalId]);
    const tb = parseInt(rows[0].tb || 0, 10);
    const ab = parseInt(rows[0].ab || 0, 10);
    const occupied = tb - ab;
    const pct = tb > 0 ? Math.round((occupied / tb) * 100) : 0;
    
    // Legacy endpoint expects "rooms" instead of "beds" because it mapped 1 room = 1 bed.
    res.json({
      success: true,
      data: {
        totalRooms: tb,
        availableRooms: ab,
        occupiedRooms: occupied,
        occupancyPercentage: pct
      }
    });
  } catch (error) { next(error); }
}

async function checkInRoom(req, res, next) {
  try {
    const { roomId, patientId, expectedCheckOutDate } = req.body;
    
    // Find an available bed in this room
    const bedRes = await pool.query(
      `SELECT b.bed_id, b.ward_id 
       FROM beds b
       JOIN wards w ON w.ward_id = b.ward_id
       WHERE w.hospital_id = $2 AND b.room_id = $1 AND b.status = 'Available' 
       LIMIT 1`, 
      [roomId, req.hospitalId]
    );
    if (bedRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No available beds in this room' });
    }
    const { bed_id, ward_id } = bedRes.rows[0];

    // Pick a random doctor (for the legacy adapter)
    const docRes = await pool.query(`SELECT doctor_id FROM doctors WHERE hospital_id = $1 LIMIT 1`, [req.hospitalId]);
    if (docRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'No doctors available to admit patient' });
    }
    const doctor_id = docRes.rows[0].doctor_id;

    // Use a transaction to admit
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const expectedDays = expectedCheckOutDate 
        ? Math.ceil((new Date(expectedCheckOutDate) - new Date()) / 86400000)
        : 3;

      const admQuery = `
        INSERT INTO admissions (patient_id, admitting_doctor_id, initial_ward_id, initial_bed_id, current_ward_id, current_bed_id, admission_number, admission_reason, expected_stay_days)
        VALUES ($1, $2, $3, $4, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const admValues = [patientId, doctor_id, ward_id, bed_id, `ADM-${Date.now()}`, 'Legacy check-in', expectedDays];
      const newAdm = await client.query(admQuery, admValues);

      await client.query(`UPDATE beds SET status = 'Occupied' WHERE bed_id = $1`, [bed_id]);
      await client.query(`UPDATE rooms SET available_beds = available_beds - 1 WHERE room_id = $1`, [roomId]);
      await client.query(`UPDATE wards SET available_beds = available_beds - 1 WHERE ward_id = $1`, [ward_id]);
      
      await client.query('COMMIT');
      res.json({ success: true, data: { room: { id: roomId }, reservation: newAdm.rows[0] } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) { next(error); }
}

async function checkOutRoom(req, res, next) {
  try {
    const { roomId } = req.body;
    
    // Find active admission in this room
    const query = `
      SELECT a.admission_id, a.current_bed_id, a.current_ward_id
      FROM admissions a
      JOIN beds b ON a.current_bed_id = b.bed_id
      JOIN patients p ON p.patient_id = a.patient_id
      WHERE p.hospital_id = $2 AND b.room_id = $1 AND a.status = 'active'
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [roomId, req.hospitalId]);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No active admission found in this room' });
    }
    const { admission_id, current_bed_id, current_ward_id } = rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query(`UPDATE admissions SET status = 'discharged' WHERE admission_id = $1`, [admission_id]);
      await client.query(`UPDATE beds SET status = 'Available' WHERE bed_id = $1`, [current_bed_id]);
      await client.query(`UPDATE rooms SET available_beds = available_beds + 1 WHERE room_id = $1`, [roomId]);
      await client.query(`UPDATE wards SET available_beds = available_beds + 1 WHERE ward_id = $1`, [current_ward_id]);
      
      await client.query('COMMIT');
      res.json({ success: true, data: { room: { id: roomId }, bill: {} } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) { next(error); }
}

module.exports = {
  getRoomTypes,
  getAvailableRooms,
  getOccupiedRooms,
  getEmergencyWards,
  getRoomOccupancyStatus,
  checkInRoom,
  checkOutRoom
};
