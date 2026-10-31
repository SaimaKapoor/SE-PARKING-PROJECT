const DEFAULT_HOURLY_RATE = 30;

/**
 * Fee policy: charge for each started hour. Zero/negative durations cost 0.
 * A positive duration shorter than one hour is billed as one hour.
 */
export function calculateParkingFee(durationMinutes, hourlyRate = DEFAULT_HOURLY_RATE) {
  const minutes = Number(durationMinutes);
  const rate = Number(hourlyRate);
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new TypeError('durationMinutes must be a non-negative number');
  }
  if (!Number.isFinite(rate) || rate < 0) {
    throw new TypeError('hourlyRate must be a non-negative number');
  }
  const hours = minutes === 0 ? 0 : Math.ceil(minutes / 60);
  return Number((hours * rate).toFixed(2));
}

export function getHourlyRate() {
  const rate = Number(process.env.PARKING_HOURLY_RATE ?? DEFAULT_HOURLY_RATE);
  return Number.isFinite(rate) && rate >= 0 ? rate : DEFAULT_HOURLY_RATE;
}
