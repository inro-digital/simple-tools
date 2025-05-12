/** Converts ms to a displayable format, e.g., MM:SS.t */
export function formatDisplayTime(ms: number) {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const tenths = Math.floor((ms % 1000) / 100)
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds + '.' + tenths
}
