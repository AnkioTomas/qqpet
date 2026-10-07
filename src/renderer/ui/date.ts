/** Formats unix seconds with the YYYY MM DD HH mm ss tokens. */
export function formatDate(sec: number, fmt = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = new Date(sec * 1000)
  const p = (n: number): string => String(n).padStart(2, '0')
  const parts: Record<string, string> = {
    YYYY: String(d.getFullYear()),
    MM: p(d.getMonth() + 1),
    DD: p(d.getDate()),
    HH: p(d.getHours()),
    mm: p(d.getMinutes()),
    ss: p(d.getSeconds()),
  }
  return fmt.replace(/YYYY|MM|DD|HH|mm|ss/g, (t) => parts[t])
}
