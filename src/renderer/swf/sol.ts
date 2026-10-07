/**
 * Flash SharedObject (.sol, AMF3) as Ruffle keeps it in localStorage: base64
 * under `<host>/<path>/<name>`. Covers what SWFs actually store: scalars,
 * strings, dense arrays and plain objects. Writes everything inline (no
 * reference tables), which every AMF3 reader accepts.
 */
export type Sol = Record<string, unknown>

export function readSol(key: string): Sol | null {
  const raw = localStorage.getItem(key)
  return raw === null ? null : decode(Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)))
}

export function writeSol(key: string, name: string, data: Sol): void {
  localStorage.setItem(key, btoa(String.fromCharCode(...encode(name, data))))
}

function decode(bytes: Uint8Array): Sol {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const text = new TextDecoder()
  // 0x00BF, u32 length, "TCSO", 6 reserved bytes, u16 name length, name, u32 AMF version.
  let p = 16
  p += 2 + view.getUint16(p) + 4
  const strings: string[] = []
  const objects: unknown[] = []
  const traits: { dynamic: boolean; keys: string[] }[] = []

  const u29 = (): number => {
    let n = 0
    for (let i = 0; i < 3; i++) {
      const b = bytes[p++]
      n = (n << 7) | (b & 0x7f)
      if (!(b & 0x80)) return n
    }
    return (n << 8) | bytes[p++]
  }
  const string = (): string => {
    const h = u29()
    if (!(h & 1)) return strings[h >> 1]
    const s = text.decode(bytes.subarray(p, (p += h >> 1)))
    if (s) strings.push(s)
    return s
  }
  const value = (): unknown => {
    switch (bytes[p++]) {
      case 0x00: return undefined
      case 0x01: return null
      case 0x02: return false
      case 0x03: return true
      case 0x04: {
        const n = u29()
        return n & 0x10000000 ? n - 0x20000000 : n
      }
      case 0x05: {
        p += 8
        return view.getFloat64(p - 8)
      }
      case 0x06: return string()
      case 0x09: {
        const h = u29()
        if (!(h & 1)) return objects[h >> 1]
        const a: unknown[] = []
        objects.push(a)
        while (string() !== '') value()
        for (let i = 0; i < h >> 1; i++) a.push(value())
        return a
      }
      case 0x0a: {
        const h = u29()
        if (!(h & 1)) return objects[h >> 1]
        let t = traits[h >> 2]
        if (h & 2) {
          string()
          t = { dynamic: Boolean(h & 8), keys: Array.from({ length: h >> 4 }, string) }
          traits.push(t)
        }
        const o: Sol = {}
        objects.push(o)
        for (const k of t.keys) o[k] = value()
        if (t.dynamic) for (let k = string(); k !== ''; k = string()) o[k] = value()
        return o
      }
      default: throw new Error(`AMF3 marker ${bytes[p - 1]} at ${p - 1}`)
    }
  }

  const data: Sol = {}
  while (p < bytes.length) {
    const k = string()
    data[k] = value()
    p++
  }
  return data
}

function encode(name: string, data: Sol): number[] {
  const out: number[] = []
  const u29 = (n: number): void => {
    if (n < 0x80) out.push(n)
    else if (n < 0x4000) out.push((n >> 7) | 0x80, n & 0x7f)
    else if (n < 0x200000) out.push((n >> 14) | 0x80, ((n >> 7) & 0x7f) | 0x80, n & 0x7f)
    else out.push((n >> 22) | 0x80, ((n >> 15) & 0x7f) | 0x80, ((n >> 8) & 0x7f) | 0x80, n & 0xff)
  }
  const string = (s: string): void => {
    const b = new TextEncoder().encode(s)
    u29((b.length << 1) | 1)
    out.push(...b)
  }
  const value = (v: unknown): void => {
    if (v === undefined) out.push(0x00)
    else if (v === null) out.push(0x01)
    else if (typeof v === 'boolean') out.push(v ? 0x03 : 0x02)
    else if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 0x10000000) {
      out.push(0x04)
      u29(v)
    } else if (typeof v === 'number') {
      const b = new DataView(new ArrayBuffer(8))
      b.setFloat64(0, v)
      out.push(0x05, ...new Uint8Array(b.buffer))
    } else if (typeof v === 'string') {
      out.push(0x06)
      string(v)
    } else if (Array.isArray(v)) {
      out.push(0x09)
      u29((v.length << 1) | 1)
      out.push(0x01)
      v.forEach(value)
    } else {
      // Anonymous dynamic object: inline traits, empty class name, no sealed members.
      out.push(0x0a, 0x0b, 0x01)
      for (const [k, e] of Object.entries(v as Sol)) {
        string(k)
        value(e)
      }
      out.push(0x01)
    }
  }

  const n = new TextEncoder().encode(name)
  const body = [0x54, 0x43, 0x53, 0x4f, 0, 4, 0, 0, 0, 0, n.length >> 8, n.length & 0xff, ...n, 0, 0, 0, 3]
  for (const [k, v] of Object.entries(data)) {
    string(k)
    value(v)
    out.push(0)
  }
  const len = body.length + out.length
  return [0x00, 0xbf, len >>> 24, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff, ...body, ...out]
}
