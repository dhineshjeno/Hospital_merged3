const { query } = require('../config/database');

// ─── Patient Demographics ─────────────────────────────────────────────────────

async function getPatientDemographics(dateFrom, dateTo) {
  const [totalsResult, genderResult, ageResult, bloodGroupResult, statusResult] = await Promise.all([
    query(
      `SELECT
         COUNT(*)::int AS total_patients,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active_patients,
         COUNT(*) FILTER (WHERE status = 'inactive')::int AS inactive_patients,
         COUNT(*) FILTER (WHERE status = 'deceased')::int AS deceased_patients,
         COUNT(*) FILTER (WHERE created_at::date >= $1 AND created_at::date <= $2)::int AS new_registrations
       FROM patients`,
      [dateFrom, dateTo],
    ),
    query(
      `SELECT gender, COUNT(*)::int AS count,
         ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM patients), 0), 1) AS percentage
       FROM patients GROUP BY gender ORDER BY count DESC`,
      [],
    ),
    query(
      `SELECT
         CASE
           WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 18 THEN '0-17'
           WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 35 THEN '18-34'
           WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 50 THEN '35-49'
           WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 65 THEN '50-64'
           ELSE '65+'
         END AS age_group,
         COUNT(*)::int AS count
       FROM patients
       WHERE status != 'deceased'
       GROUP BY age_group
       ORDER BY age_group`,
      [],
    ),
    query(
      `SELECT blood_group, COUNT(*)::int AS count
       FROM patients WHERE blood_group IS NOT NULL
       GROUP BY blood_group ORDER BY count DESC`,
      [],
    ),
    query(
      `SELECT
         COUNT(*) FILTER (WHERE created_at::date >= $1)::int AS registered_this_period,
         AVG(EXTRACT(YEAR FROM AGE(date_of_birth)))::numeric(5,1) AS avg_age
       FROM patients WHERE status = 'active'`,
      [dateFrom],
    ),
  ]);

  return {
    totals: totalsResult.rows[0],
    gender_distribution: genderResult.rows,
    age_distribution: ageResult.rows,
    blood_group_distribution: bloodGroupResult.rows,
    period_stats: statusResult.rows[0],
  };
}

// ─── Appointment Analytics ────────────────────────────────────────────────────

async function getAppointmentAnalytics(dateFrom, dateTo) {
  const [totalsResult, byStatusResult, byDoctorResult, byTypeResult, byDayResult] = await Promise.all([
    query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
         COUNT(*) FILTER (WHERE status = 'no_show')::int AS no_show,
         COUNT(*) FILTER (WHERE status IN ('booked','confirmed'))::int AS upcoming,
         ROUND(COUNT(*) FILTER (WHERE status = 'completed') * 100.0
           / NULLIF(COUNT(*), 0), 1) AS completion_rate_pct
       FROM appointments
       WHERE (scheduled_start_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN $1 AND $2`,
      [dateFrom, dateTo],
    ),
    query(
      `SELECT status, COUNT(*)::int AS count
       FROM appointments
       WHERE (scheduled_start_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN $1 AND $2
       GROUP BY status ORDER BY count DESC`,
      [dateFrom, dateTo],
    ),
    query(
      `SELECT d.doctor_id, d.first_name || ' ' || d.last_name AS doctor_name,
         d.specialization,
         COUNT(a.appointment_id)::int AS total_appointments,
         COUNT(a.appointment_id) FILTER (WHERE a.status = 'completed')::int AS completed,
         COUNT(a.appointment_id) FILTER (WHERE a.status = 'cancelled')::int AS cancelled
       FROM doctors d
       LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
         AND (a.scheduled_start_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN $1 AND $2
       GROUP BY d.doctor_id
       ORDER BY total_appointments DESC`,
      [dateFrom, dateTo],
    ),
    query(
      `SELECT appointment_type, COUNT(*)::int AS count
       FROM appointments
       WHERE (scheduled_start_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN $1 AND $2
       GROUP BY appointment_type ORDER BY count DESC`,
      [dateFrom, dateTo],
    ),
    query(
      `SELECT TO_CHAR(scheduled_start_at AT TIME ZONE 'Asia/Kolkata', 'Day') AS day_of_week,
         EXTRACT(DOW FROM scheduled_start_at AT TIME ZONE 'Asia/Kolkata')::int AS dow_num,
         COUNT(*)::int AS count
       FROM appointments
       WHERE (scheduled_start_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN $1 AND $2
       GROUP BY day_of_week, dow_num
       ORDER BY dow_num`,
      [dateFrom, dateTo],
    ),
  ]);

  return {
    totals: totalsResult.rows[0],
    by_status: byStatusResult.rows,
    by_doctor: byDoctorResult.rows,
    by_type: byTypeResult.rows,
    by_day_of_week: byDayResult.rows,
  };
}

// ─── Doctor Utilisation ───────────────────────────────────────────────────────

async function getDoctorUtilisation(dateFrom, dateTo) {
  const result = await query(
    `SELECT
       d.doctor_id,
       d.first_name || ' ' || d.last_name AS doctor_name,
       d.specialization,
       d.consultation_fee,
       COUNT(DISTINCT a.appointment_id) FILTER (WHERE a.status = 'completed')::int
         AS completed_appointments,
       COUNT(DISTINCT c.consultation_id)::int AS consultations_done,
       COUNT(DISTINCT p.prescription_id)::int AS prescriptions_written,
       COUNT(DISTINCT lo.lab_order_id)::int AS lab_orders_placed,
       COALESCE(SUM(i.total_amount) FILTER (WHERE i.status IN ('paid','partially_paid')), 0)
         ::numeric(14,2) AS revenue_generated,
       ROUND(COUNT(DISTINCT a.appointment_id) FILTER (WHERE a.status = 'completed')
         / NULLIF(($2::date - $1::date + 1), 0), 2)
         AS avg_appointments_per_day
     FROM doctors d
     LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
       AND (a.scheduled_start_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN $1 AND $2
     LEFT JOIN consultations c ON c.doctor_id = d.doctor_id
       AND c.consultation_started_at::date BETWEEN $1 AND $2
     LEFT JOIN prescriptions p ON p.doctor_id = d.doctor_id
       AND p.prescribed_at::date BETWEEN $1 AND $2
     LEFT JOIN lab_orders lo ON lo.doctor_id = d.doctor_id
       AND lo.ordered_at::date BETWEEN $1 AND $2
     LEFT JOIN invoices i ON i.appointment_id = a.appointment_id
     GROUP BY d.doctor_id
     ORDER BY completed_appointments DESC`,
    [dateFrom, dateTo],
  );
  return result.rows;
}

// ─── Medicine Usage ───────────────────────────────────────────────────────────

async function getMedicineUsage(dateFrom, dateTo, limit) {
  const [topPrescribedResult, dispensingResult, categoryResult] = await Promise.all([
    query(
      `SELECT
         pi.medicine_name,
         COUNT(DISTINCT pi.prescription_id)::int AS times_prescribed,
         SUM(pi.quantity)::int AS total_quantity_prescribed,
         COUNT(DISTINCT p.patient_id)::int AS unique_patients
       FROM prescription_items pi
       JOIN prescriptions p ON p.prescription_id = pi.prescription_id
       WHERE p.prescribed_at::date BETWEEN $1 AND $2
       GROUP BY pi.medicine_name
       ORDER BY times_prescribed DESC
       LIMIT $3`,
      [dateFrom, dateTo, limit],
    ),
    query(
      `SELECT
         m.medicine_name, m.category,
         SUM(ABS(t.quantity)) FILTER (WHERE t.transaction_type = 'dispense')::int AS total_dispensed,
         COUNT(t.stock_transaction_id) FILTER (WHERE t.transaction_type = 'dispense')::int AS dispense_count
       FROM pharmacy_stock_transactions t
       JOIN medicine_batches mb ON mb.medicine_batch_id = t.medicine_batch_id
       JOIN medicines m ON m.medicine_id = mb.medicine_id
       WHERE t.performed_at::date BETWEEN $1 AND $2
         AND t.transaction_type = 'dispense'
       GROUP BY m.medicine_id
       ORDER BY total_dispensed DESC
       LIMIT $3`,
      [dateFrom, dateTo, limit],
    ),
    query(
      `SELECT
         m.category,
         COUNT(DISTINCT m.medicine_id)::int AS medicine_count,
         COALESCE(SUM(mb.quantity_on_hand) FILTER (WHERE mb.status = 'active'), 0)::int AS total_stock
       FROM medicines m
       LEFT JOIN medicine_batches mb ON mb.medicine_id = m.medicine_id
       WHERE m.status = 'active'
       GROUP BY m.category
       ORDER BY medicine_count DESC`,
      [],
    ),
  ]);

  return {
    top_prescribed: topPrescribedResult.rows,
    top_dispensed: dispensingResult.rows,
    by_category: categoryResult.rows,
  };
}

// ─── Revenue Report ───────────────────────────────────────────────────────────

async function getRevenueReport(dateFrom, dateTo) {
  const [summaryResult, byServiceResult, byDoctorResult, byStatusResult, dailyResult] = await Promise.all([
    query(
      `SELECT
         COUNT(*)::int AS total_invoices,
         COALESCE(SUM(total_amount), 0)::numeric(14,2) AS total_billed,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0)::numeric(14,2) AS total_collected,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'partially_paid'), 0)::numeric(14,2) AS partially_collected,
         COALESCE(SUM(total_amount) FILTER (WHERE status IN ('draft','issued')), 0)::numeric(14,2) AS total_outstanding,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'void'), 0)::numeric(14,2) AS total_void,
         COALESCE(AVG(total_amount), 0)::numeric(10,2) AS avg_invoice_amount
       FROM invoices
       WHERE invoice_date BETWEEN $1 AND $2`,
      [dateFrom, dateTo],
    ),
    query(
      `SELECT
         ii.item_type,
         COUNT(ii.invoice_item_id)::int AS item_count,
         COALESCE(SUM(ii.line_total), 0)::numeric(14,2) AS total_revenue
       FROM invoice_items ii
       JOIN invoices i ON i.invoice_id = ii.invoice_id
       WHERE i.invoice_date BETWEEN $1 AND $2
         AND i.status IN ('paid','partially_paid','issued')
       GROUP BY ii.item_type
       ORDER BY total_revenue DESC`,
      [dateFrom, dateTo],
    ),
    query(
      `SELECT
         d.first_name || ' ' || d.last_name AS doctor_name,
         d.specialization,
         COUNT(DISTINCT i.invoice_id)::int AS invoices,
         COALESCE(SUM(i.total_amount) FILTER (WHERE i.status = 'paid'), 0)::numeric(14,2) AS revenue
       FROM doctors d
       JOIN appointments a ON a.doctor_id = d.doctor_id
       JOIN invoices i ON i.appointment_id = a.appointment_id
       WHERE i.invoice_date BETWEEN $1 AND $2
       GROUP BY d.doctor_id
       ORDER BY revenue DESC`,
      [dateFrom, dateTo],
    ),
    query(
      `SELECT status, COUNT(*)::int AS count,
         COALESCE(SUM(total_amount), 0)::numeric(14,2) AS amount
       FROM invoices WHERE invoice_date BETWEEN $1 AND $2
       GROUP BY status ORDER BY amount DESC`,
      [dateFrom, dateTo],
    ),
    query(
      `SELECT invoice_date::date AS date,
         COUNT(*)::int AS invoice_count,
         COALESCE(SUM(total_amount), 0)::numeric(14,2) AS billed,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0)::numeric(14,2) AS collected
       FROM invoices WHERE invoice_date BETWEEN $1 AND $2
       GROUP BY invoice_date::date
       ORDER BY date`,
      [dateFrom, dateTo],
    ),
  ]);

  return {
    summary: summaryResult.rows[0],
    by_service_type: byServiceResult.rows,
    by_doctor: byDoctorResult.rows,
    by_status: byStatusResult.rows,
    daily_trend: dailyResult.rows,
  };
}

// ─── Lab Report ───────────────────────────────────────────────────────────────

async function getLabReport(dateFrom, dateTo) {
  const [summaryResult, byTestResult, abnormalResult, byDoctorResult] = await Promise.all([
    query(
      `SELECT
         COUNT(DISTINCT lo.lab_order_id)::int AS total_orders,
         COUNT(loi.lab_order_item_id)::int AS total_tests_ordered,
         COUNT(lr.lab_result_id)::int AS results_entered,
         COUNT(lr.lab_result_id) FILTER (WHERE lr.result_status = 'final')::int AS results_finalized,
         COUNT(lr.lab_result_id) FILTER (WHERE lr.abnormal_flag != 'normal')::int AS abnormal_results,
         ROUND(COUNT(lr.lab_result_id) FILTER (WHERE lr.abnormal_flag != 'normal') * 100.0
           / NULLIF(COUNT(lr.lab_result_id), 0), 1) AS abnormal_rate_pct
       FROM lab_orders lo
       JOIN lab_order_items loi ON loi.lab_order_id = lo.lab_order_id
       LEFT JOIN lab_results lr ON lr.lab_order_item_id = loi.lab_order_item_id
       WHERE lo.ordered_at::date BETWEEN $1 AND $2`,
      [dateFrom, dateTo],
    ),
    query(
      `SELECT
         ltc.test_name, ltc.test_code,
         COUNT(loi.lab_order_item_id)::int AS times_ordered,
         COUNT(lr.lab_result_id)::int AS results_available,
         COUNT(lr.lab_result_id) FILTER (WHERE lr.abnormal_flag != 'normal')::int AS abnormal_count
       FROM lab_order_items loi
       JOIN lab_test_catalog ltc ON ltc.lab_test_id = loi.lab_test_id
       JOIN lab_orders lo ON lo.lab_order_id = loi.lab_order_id
       LEFT JOIN lab_results lr ON lr.lab_order_item_id = loi.lab_order_item_id
       WHERE lo.ordered_at::date BETWEEN $1 AND $2
       GROUP BY ltc.lab_test_id
       ORDER BY times_ordered DESC
       LIMIT 10`,
      [dateFrom, dateTo],
    ),
    query(
      `SELECT abnormal_flag, COUNT(*)::int AS count
       FROM lab_results lr
       JOIN lab_order_items loi ON loi.lab_order_item_id = lr.lab_order_item_id
       JOIN lab_orders lo ON lo.lab_order_id = loi.lab_order_id
       WHERE lo.ordered_at::date BETWEEN $1 AND $2
       GROUP BY abnormal_flag ORDER BY count DESC`,
      [dateFrom, dateTo],
    ),
    query(
      `SELECT d.first_name || ' ' || d.last_name AS doctor_name,
         COUNT(lo.lab_order_id)::int AS orders_placed
       FROM lab_orders lo
       JOIN doctors d ON d.doctor_id = lo.doctor_id
       WHERE lo.ordered_at::date BETWEEN $1 AND $2
       GROUP BY d.doctor_id ORDER BY orders_placed DESC LIMIT 10`,
      [dateFrom, dateTo],
    ),
  ]);

  return {
    summary: summaryResult.rows[0],
    top_tests: byTestResult.rows,
    by_abnormal_flag: abnormalResult.rows,
    top_ordering_doctors: byDoctorResult.rows,
  };
}

// ─── Queue Analytics ──────────────────────────────────────────────────────────

async function getQueueAnalytics(dateFrom, dateTo) {
  const [summaryResult, byDoctorResult, byHourResult] = await Promise.all([
    query(
      `SELECT
         COUNT(*)::int AS total_entries,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
         COUNT(*) FILTER (WHERE status = 'no_show')::int AS skipped,
         AVG(EXTRACT(EPOCH FROM (called_at - checked_in_at)) / 60)
           FILTER (WHERE called_at IS NOT NULL)::numeric(10,1) AS avg_wait_minutes,
         AVG(EXTRACT(EPOCH FROM (completed_at - checked_in_at)) / 60)
           FILTER (WHERE status = 'completed')::numeric(10,1) AS avg_total_minutes,
         MAX(priority) FILTER (WHERE priority > 0)::int AS max_priority_seen
       FROM queue_entries
       WHERE queue_date BETWEEN $1 AND $2`,
      [dateFrom, dateTo],
    ),
    query(
      `SELECT
         d.first_name || ' ' || d.last_name AS doctor_name,
         d.specialization,
         COUNT(q.queue_entry_id)::int AS total_patients,
         COUNT(q.queue_entry_id) FILTER (WHERE q.status = 'completed')::int AS completed,
         AVG(EXTRACT(EPOCH FROM (q.called_at - q.checked_in_at)) / 60)
           FILTER (WHERE q.called_at IS NOT NULL)::numeric(10,1) AS avg_wait_minutes
       FROM queue_entries q
       JOIN doctors d ON d.doctor_id = q.doctor_id
       WHERE q.queue_date BETWEEN $1 AND $2
       GROUP BY d.doctor_id ORDER BY total_patients DESC`,
      [dateFrom, dateTo],
    ),
    query(
      `SELECT
         EXTRACT(HOUR FROM checked_in_at)::int AS hour_of_day,
         COUNT(*)::int AS patient_count
       FROM queue_entries
       WHERE queue_date BETWEEN $1 AND $2
       GROUP BY hour_of_day ORDER BY hour_of_day`,
      [dateFrom, dateTo],
    ),
  ]);

  return {
    summary: summaryResult.rows[0],
    by_doctor: byDoctorResult.rows,
    by_hour: byHourResult.rows,
  };
}

// ─── Bed Occupancy Trends ─────────────────────────────────────────────────────

async function getBedOccupancyTrends(dateFrom, dateTo) {
  const [currentResult, admissionTrendResult, avgStayResult, wardBreakdownResult] = await Promise.all([
    query(
      `SELECT
         COUNT(b.bed_id)::int AS total_beds,
         COUNT(b.bed_id) FILTER (WHERE b.status = 'occupied')::int AS currently_occupied,
         COUNT(b.bed_id) FILTER (WHERE b.status = 'available')::int AS currently_available,
         COUNT(b.bed_id) FILTER (WHERE b.status = 'maintenance')::int AS under_maintenance,
         ROUND(COUNT(b.bed_id) FILTER (WHERE b.status = 'occupied') * 100.0
           / NULLIF(COUNT(b.bed_id), 0), 1) AS current_occupancy_pct
       FROM beds b
       JOIN wards w ON w.ward_id = b.ward_id WHERE w.is_active = true`,
      [],
    ),
    query(
      `SELECT
         admitted_at::date AS date,
         COUNT(*)::int AS admissions,
         COUNT(*) FILTER (WHERE status = 'discharged')::int AS discharges
       FROM admissions
       WHERE admitted_at::date BETWEEN $1 AND $2
       GROUP BY admitted_at::date ORDER BY date`,
      [dateFrom, dateTo],
    ),
    query(
      `SELECT
         AVG(EXTRACT(DAY FROM (
           COALESCE(d.discharged_at, now()) - a.admitted_at
         )))::numeric(10,1) AS avg_length_of_stay_days,
         MIN(EXTRACT(DAY FROM (
           COALESCE(d.discharged_at, now()) - a.admitted_at
         )))::int AS min_days,
         MAX(EXTRACT(DAY FROM (
           COALESCE(d.discharged_at, now()) - a.admitted_at
         )))::int AS max_days,
         COUNT(a.admission_id)::int AS total_admissions
       FROM admissions a
       LEFT JOIN discharges d ON d.admission_id = a.admission_id
       WHERE a.admitted_at::date BETWEEN $1 AND $2`,
      [dateFrom, dateTo],
    ),
    query(
      `SELECT
         w.ward_name, w.ward_type,
         COUNT(a.admission_id) FILTER (
           WHERE a.admitted_at::date BETWEEN $1 AND $2
         )::int AS period_admissions,
         AVG(EXTRACT(DAY FROM (
           COALESCE(d.discharged_at, now()) - a.admitted_at
         )))::numeric(10,1) AS avg_stay_days
       FROM wards w
       LEFT JOIN admissions a ON a.initial_ward_id = w.ward_id
       LEFT JOIN discharges d ON d.admission_id = a.admission_id
       WHERE w.is_active = true
       GROUP BY w.ward_id ORDER BY period_admissions DESC`,
      [dateFrom, dateTo],
    ),
  ]);

  return {
    current_snapshot: currentResult.rows[0],
    admission_discharge_trend: admissionTrendResult.rows,
    length_of_stay: avgStayResult.rows[0],
    by_ward: wardBreakdownResult.rows,
  };
}

module.exports = {
  getPatientDemographics,
  getAppointmentAnalytics,
  getDoctorUtilisation,
  getMedicineUsage,
  getRevenueReport,
  getLabReport,
  getQueueAnalytics,
  getBedOccupancyTrends,
};
