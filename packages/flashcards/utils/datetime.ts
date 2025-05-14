export function getNow(secondsInFuture: number = 0): Date {
  const date = new Date()
  date.setSeconds(date.getSeconds() + secondsInFuture)
  return date
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}
