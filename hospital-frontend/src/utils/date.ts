export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}