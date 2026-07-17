const { timeToMinutes } = require('./scheduleValidator');

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Generates candidate slot start/end times (HH:MM strings) for a single
 * schedule block, then removes any slot that overlaps an already-booked
 * appointment time range for that doctor on that date.
 *
 * @param {Array<{start_time: string, end_time: string, slot_duration_minutes: number}>} schedules
 * @param {Array<{startMinutes: number, endMinutes: number}>} bookedRanges
 * @returns {Array<{start_time: string, end_time: string}>}
 */
function generateAvailableSlots(schedules, bookedRanges) {
  const slots = [];

  schedules.forEach((schedule) => {
    const startMinutes = timeToMinutes(schedule.start_time);
    const endMinutes = timeToMinutes(schedule.end_time);
    const duration = schedule.slot_duration_minutes;

    for (let slotStart = startMinutes; slotStart + duration <= endMinutes; slotStart += duration) {
      const slotEnd = slotStart + duration;

      const overlapsBooked = bookedRanges.some(
        (booked) => slotStart < booked.endMinutes && booked.startMinutes < slotEnd,
      );

      if (!overlapsBooked) {
        slots.push({
          start_time: minutesToTime(slotStart),
          end_time: minutesToTime(slotEnd),
        });
      }
    }
  });

  return slots;
}

module.exports = {
  generateAvailableSlots,
  minutesToTime,
};
