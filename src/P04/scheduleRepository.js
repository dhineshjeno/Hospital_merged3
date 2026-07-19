const { query } = require('../config/database');

const SCHEDULE_COLUMNS = `
  doctor_schedule_id,
  doctor_id,
  day_of_week,
  start_time,
  end_time,
  slot_duration_minutes,
  max_appointments,
  effective_from,
  effective_to,
  is_active,
  created_at,
  updated_at
`;

async function createSchedule(hospitalId, doctorId, data) {
  const result = await query(
    `INSERT INTO doctor_schedules (
      doctor_id, day_of_week, start_time, end_time,
      slot_duration_minutes, max_appointments, effective_from, effective_to, is_active
    ) 
    SELECT 
      d.doctor_id, $3, $4, $5, COALESCE($6, 15), COALESCE($7, 1),
      COALESCE($8, CURRENT_DATE), $9, COALESCE($10, true)
    FROM doctors d 
    WHERE d.hospital_id = $1 AND d.doctor_id = $2
    RETURNING ${SCHEDULE_COLUMNS}`,
    [
      hospitalId,
      doctorId,
      data.day_of_week,
      data.start_time,
      data.end_time,
      data.slot_duration_minutes,
      data.max_appointments,
      data.effective_from || null,
      data.effective_to || null,
      data.is_active,
    ],
  );

  return result.rows[0];
}

async function findScheduleById(hospitalId, doctorScheduleId, doctorId) {
  const result = await query(
    `SELECT ds.* FROM doctor_schedules ds
     JOIN doctors d ON d.doctor_id = ds.doctor_id
     WHERE d.hospital_id = $1 AND ds.doctor_schedule_id = $2 AND ds.doctor_id = $3`,
    [hospitalId, doctorScheduleId, doctorId],
  );

  return result.rows[0] || null;
}

async function listSchedulesByDoctor(hospitalId, doctorId, filters = {}) {
  const conditions = ['d.hospital_id = $1', 'ds.doctor_id = $2'];
  const params = [hospitalId, doctorId];

  if (filters.isActive !== undefined && filters.isActive !== null) {
    params.push(filters.isActive);
    conditions.push(`is_active = $${params.length}`);
  }

  if (filters.dayOfWeek !== undefined && filters.dayOfWeek !== null) {
    params.push(filters.dayOfWeek);
    conditions.push(`day_of_week = $${params.length}`);
  }

  const result = await query(
    `SELECT ds.* FROM doctor_schedules ds
     JOIN doctors d ON d.doctor_id = ds.doctor_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ds.day_of_week, ds.start_time`,
    params,
  );

  return result.rows;
}

async function updateSchedule(hospitalId, doctorScheduleId, doctorId, data) {
  const fieldMap = {
    day_of_week: 'day_of_week',
    start_time: 'start_time',
    end_time: 'end_time',
    slot_duration_minutes: 'slot_duration_minutes',
    max_appointments: 'max_appointments',
    effective_from: 'effective_from',
    effective_to: 'effective_to',
    is_active: 'is_active',
  };

  const setClauses = [];
  const params = [];

  Object.keys(fieldMap).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      params.push(data[key]);
      setClauses.push(`${fieldMap[key]} = $${params.length}`);
    }
  });

  if (setClauses.length === 0) {
    return findScheduleById(hospitalId, doctorScheduleId, doctorId);
  }

  setClauses.push('updated_at = now()');
  params.push(hospitalId);
  params.push(doctorScheduleId);
  params.push(doctorId);

  const result = await query(
    `UPDATE doctor_schedules ds
     SET ${setClauses.join(', ')}
     FROM doctors d
     WHERE d.doctor_id = ds.doctor_id
       AND d.hospital_id = ${params.length - 2}
       AND ds.doctor_schedule_id = ${params.length - 1}
       AND ds.doctor_id = ${params.length}
     RETURNING ds.*`,
    params,
  );

  return result.rows[0] || null;
}

async function deactivateSchedule(hospitalId, doctorScheduleId, doctorId) {
  const result = await query(
    `UPDATE doctor_schedules ds
     SET is_active = false, updated_at = now()
     FROM doctors d
     WHERE d.doctor_id = ds.doctor_id
       AND d.hospital_id = $1 
       AND ds.doctor_schedule_id = $2 
       AND ds.doctor_id = $3
     RETURNING ds.*`,
    [hospitalId, doctorScheduleId, doctorId],
  );

  return result.rows[0] || null;
}

async function findActiveSchedulesForDoctorOnDate(hospitalId, doctorId, dayOfWeek, date) {
  const result = await query(
    `SELECT ds.* FROM doctor_schedules ds
     JOIN doctors d ON d.doctor_id = ds.doctor_id
     WHERE d.hospital_id = $1
       AND ds.doctor_id = $2
       AND ds.day_of_week = $3
       AND ds.is_active = true
       AND ds.effective_from <= $4
       AND (ds.effective_to IS NULL OR ds.effective_to >= $4)
     ORDER BY ds.start_time`,
    [hospitalId, doctorId, dayOfWeek, date],
  );

  return result.rows;
}

module.exports = {
  createSchedule,
  findScheduleById,
  listSchedulesByDoctor,
  updateSchedule,
  deactivateSchedule,
  findActiveSchedulesForDoctorOnDate,
};
