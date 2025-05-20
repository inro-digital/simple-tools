interface TimeOptions {
  padAll?: boolean
  useTenths?: boolean
}

/** Converts ms to a displayable format, e.g., MM:SS.t */
export function formatDisplayTime(
  ms: number,
  { padAll = false, useTenths = true }: TimeOptions = {},
): string {
  let seconds = ms / 1000
  const hours = Math.floor(seconds / 3600)
  seconds = seconds % 3600
  const minutes = Math.floor(seconds / 60)
  seconds = Math.floor(seconds % 60)
  const tenths = Math.floor((ms % 1000) / 100)

  const displayHours = padAll ? hours.toString().padStart(2, '0') : hours
  const displayMins = (padAll || hours)
    ? minutes.toString().padStart(2, '0')
    : minutes
  const displaySeconds = seconds.toString().padStart(2, '0')

  let displayString = ''
  if (hours) displayString += displayHours + ':'
  displayString += displayMins + ':' + displaySeconds
  if (useTenths) displayString += '.' + tenths
  return displayString
}
