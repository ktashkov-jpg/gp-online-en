export function generateTimeSlots(startStr: string, endStr: string, intervalMinutes: number = 30) {
  const slots: string[] = [];
  let current = new Date(`2000-01-01T${startStr}:00`);
  const end = new Date(`2000-01-01T${endStr}:00`);

  while (current < end) {
    slots.push(current.toTimeString().substring(0, 5));
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }
  return slots;
}
