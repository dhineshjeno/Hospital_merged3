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

async function createSchedule(doctorId, data) {
  const result = await query(
    `INSERT INTO doctor_schedules (
      doctor_id, day_of_week, start_time, end_time,
      slot_duration_minutes, max_appointments, effective_from, effective_to, is_active
    ) VALUES (
      $1, $2, $3, $4, COALESCE($5, 15), COALESCE($6, 1),
      COALESCE($7, CURRENT_DATE), $8, COALESCE($9, true)
    )
    RETURNING ${SCHEDULE_COLUMNS}`,
    [
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

async function findScheduleById(doctorScheduleId, doctorId) {
  const result = await query(
    `SELECT ${SCHEDULE_COLUMNS} FROM doctor_schedules
     WHERE doctor_schedule_id = $1 AND doctor_id = $2`,
    [doctorScheduleId, doctorId],
  );

  return result.rows[0] || null;
}

async function listSchedulesByDoctor(doctorId, filters = {}) {
  const conditions = ['doctor_id = $1'];
  const params = [doctorId];

  if (filters.isActive !== undefined && filters.isActive !== null) {
    params.push(filters.isActive);
    conditions.push(`is_active = $${params.length}`);
  }

  if (filters.dayOfWeek !== undefined && filters.dayOfWeek !== null) {
    params.push(filters.dayOfWeek);
    conditions.push(`day_of_week = $${params.length}`);
  }

  const result = await query(
    `SELECT ${SCHEDULE_COLUMNS} FROM doctor_schedules
     WHERE ${conditions.join(' AND ')}
     ORDER BY day_of_week, start_time`,
    params,
  );

  return result.rows;
}

async function updateSchedule(doctorScheduleId, doctorId, data) {
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
    return findScheduleById(doctorScheduleId, doctorId);
  }

  setClauses.push('updated_at = now()');
  params.push(doctorScheduleId);
  params.push(doctorId);

  const result = await query(
    `UPDATE doctor_schedules
     SET ${setClauses.join(', ')}
     WHERE doctor_schedule_id = $${params.length - 1} AND doctor_id = $${params.length}
     RETURNING ${SCHEDULE_COLUMNS}`,
    params,
  );

  return result.rows[0] || null;
}

async function deactivateSchedule(doctorScheduleId, doctorId) {
  const result = await query(
    `UPDATE doctor_schedules
     SET is_active = false, updated_at = now()
     WHERE doctor_schedule_id = $1 AND doctor_id = $2
     RETURNING ${SCHEDULE_COLUMNS}`,
    [doctorScheduleId, doctorId],
  );

  return result.rows[0] || null;
}

async function findActiveSchedulesForDoctorOnDate(doctorId, dayOfWeek, date) {
  const result = await query(
    `SELECT ${SCHEDULE_COLUMNS} FROM doctor_schedules
     WHERE doctor_id = $1
       AND day_of_week = $2
       AND is_active = true
       AND effective_from <= $3
       AND (effective_to IS NULL OR effective_to >= $3)
     ORDER BY start_time`,
    [doctorId, dayOfWeek, date],
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
