let mockTime: Date | null = null

export const DAY_MS = 24 * 60 * 60 * 1000

export function setMockTime(date: Date | null) {
  mockTime = date
}

export function getNow(secondsInFuture: number = 0): Date {
  const date = mockTime ? new Date(mockTime) : new Date()
  date.setSeconds(date.getSeconds() + secondsInFuture)
  return date
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

export function isToday(d1?: Date): boolean {
  if (!d1) return false
  return isSameDay(d1, getNow())
}
