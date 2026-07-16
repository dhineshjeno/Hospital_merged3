const { query } = require('../config/database');

const QUEUE_COLUMNS = `
  queue_entry_id,
  hospital_id,
  appointment_id,
  patient_id,
  doctor_id,
  queue_date,
  queue_number,
  status,
  priority,
  checked_in_at,
  called_at,
  completed_at,
  created_at,
  updated_at
`;

async function createQueueEntry(hospitalId, data) {
  const result = await query(
    `INSERT INTO queue_entries (
      hospital_id, appointment_id, patient_id, doctor_id, queue_date, queue_number, priority
    )
    SELECT
      $1, $2, $3, $4, COALESCE($5, CURRENT_DATE),
      COALESCE((
        SELECT MAX(queue_number) + 1 FROM queue_entries
        WHERE hospital_id = $1 AND doctor_id = $4 AND queue_date = COALESCE($5, CURRENT_DATE)
      ), 1),
      COALESCE($6, 0)
    RETURNING ${QUEUE_COLUMNS}`,
    [
      hospitalId,
      data.appointment_id || null,
      data.patient_id,
      data.doctor_id,
      data.queue_date || null,
      data.priority,
    ],
  );

  return result.rows[0];
}

async function findQueueEntryById(hospitalId, queueEntryId) {
  const result = await query(
    `SELECT ${QUEUE_COLUMNS} FROM queue_entries WHERE hospital_id = $1 AND queue_entry_id = $2`,
    [hospitalId, queueEntryId],
  );
  return result.rows[0] || null;
}

async function listQueueForDoctor(hospitalId, doctorId, queueDate, statusFilter) {
  const conditions = ['hospital_id = $1', 'doctor_id = $2', 'queue_date = $3'];
  const params = [hospitalId, doctorId, queueDate];

  if (statusFilter) {
    params.push(statusFilter);
    conditions.push(`status = $${params.length}`);
  }

  const result = await query(
    `SELECT ${QUEUE_COLUMNS} FROM queue_entries
     WHERE ${conditions.join(' AND ')}
     ORDER BY priority DESC, queue_number ASC`,
    params,
  );
  return result.rows;
}

async function countAheadInQueue(hospitalId, doctorId, queueDate, priority, queueNumber) {
  const result = await query(
    `SELECT COUNT(*)::int AS ahead_count FROM queue_entries
     WHERE hospital_id = $1
       AND doctor_id = $2
       AND queue_date = $3
       AND status = 'waiting'
       AND (priority > $4 OR (priority = $4 AND queue_number < $5))`,
    [hospitalId, doctorId, queueDate, priority, queueNumber],
  );
  return result.rows[0].ahead_count;
}

async function updateQueueStatus(hospitalId, queueEntryId, status) {
  const timestampClauses = {
    called: 'called_at = now()',
    in_service: 'called_at = COALESCE(called_at, now())',
    completed: 'completed_at = now()',
  };

  const extraSet = timestampClauses[status] ? `, ${timestampClauses[status]}` : '';

  const result = await query(
    `UPDATE queue_entries
     SET status = $2, updated_at = now()${extraSet}
     WHERE hospital_id = $1 AND queue_entry_id = $3
     RETURNING ${QUEUE_COLUMNS}`,
    [hospitalId, status, queueEntryId],
  );
  return result.rows[0] || null;
}

async function getQueueStatsForDoctor(hospitalId, doctorId, queueDate) {
  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'waiting')::int AS waiting_count,
       COUNT(*) FILTER (WHERE status = 'in_service')::int AS in_service_count,
       COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count,
       COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count,
       COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped_count,
       AVG(EXTRACT(EPOCH FROM (completed_at - checked_in_at)) / 60)
         FILTER (WHERE status = 'completed')::numeric(10,1) AS avg_total_minutes,
       AVG(EXTRACT(EPOCH FROM (called_at - checked_in_at)) / 60)
         FILTER (WHERE called_at IS NOT NULL)::numeric(10,1) AS avg_wait_minutes
     FROM queue_entries
     WHERE hospital_id = $1 AND doctor_id = $2 AND queue_date = $3`,
    [hospitalId, doctorId, queueDate],
  );
  return result.rows[0];
}

module.exports = {
  createQueueEntry,
  findQueueEntryById,
  listQueueForDoctor,
  countAheadInQueue,
  updateQueueStatus,
  getQueueStatsForDoctor,
};
