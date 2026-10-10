#!/usr/bin/env python3
"""Hide the hit-area box behind the adult Stand animations.

Those SWFs place a plain white rectangle at alpha 3/256 so the original Windows
client, which hit-tested window pixels, could catch clicks around the penguin.
On a dark desktop it shows as a grey box. Flash hit-tests ignore alpha, so its
alpha multiplier is set to 0 in place; nothing else in the file changes.

    python3 scripts/swf-hitarea.py resources/pet/Action
"""
import sys
import zlib
from pathlib import Path

FAINT = 3


class Bits:
    def __init__(self, b, pos):
        self.b, self.p = b, pos * 8

    def u(self, n):
        v = 0
        for _ in range(n):
            v = v << 1 | self.b[self.p >> 3] >> (7 - (self.p & 7)) & 1
            self.p += 1
        return v

    def s(self, n):
        v = self.u(n)
        return v - (1 << n) if n and v >> (n - 1) else v

    def skip_rect(self):
        n = self.u(5)
        self.p += 4 * n

    def align(self):
        self.p = (self.p + 7) & ~7
        return self.p >> 3


def is_rect(b, body, code):
    """A single solid fill, no lines, four straight axis-aligned edges."""
    r = Bits(b, body + 2)
    r.skip_rect()
    p = r.align()
    if code == 83:
        r = Bits(b, p)
        r.skip_rect()
        p = r.align() + 1
    if b[p] != 1 or b[p + 1] != 0:
        return False
    p += 2 + (3 if code in (2, 22) else 4)
    if b[p]:
        return False
    r = Bits(b, p + 1)
    fill_bits, line_bits = r.u(4), r.u(4)
    edges = 0
    while True:
        if r.u(1):
            if r.u(1) == 0:
                return False
            nb = r.u(4) + 2
            if r.u(1):
                return False
            r.u(1)
            r.u(nb)
            edges += 1
            continue
        flags = r.u(5)
        if flags == 0:
            return edges == 4
        if flags & 16:
            return False
        if flags & 1:
            n = r.u(5)
            r.u(2 * n)
        r.u(fill_bits * ((flags >> 1 & 1) + (flags >> 2 & 1)) + line_bits * (flags >> 3 & 1))


def faint_alpha(b, p):
    """Bit offset of a CXFORMWITHALPHA's alpha multiplier if it is FAINT, else None."""
    r = Bits(b, p)
    r.u(1)
    if not r.u(1):
        return None
    n = r.u(4)
    r.p += 3 * n
    off = r.p
    return (off, n) if r.s(n) == FAINT else None


def place(b, code, body):
    """-> (character id or None, alpha multiplier location or None)"""
    flags = b[body]
    p = body + 1
    flags2 = 0
    if code == 70:
        flags2 = b[p]
        p += 1
    p += 2
    if code == 70 and (flags2 & 0x08 or (flags2 & 0x10 and flags & 2)):
        p = b.index(0, p) + 1
    cid = None
    if flags & 2:
        cid = b[p] | b[p + 1] << 8
        p += 2
    if flags & 4:
        r = Bits(b, p)
        for _ in range(2):
            if r.u(1):
                r.u(2 * r.u(5))
        r.u(2 * r.u(5))
        p = r.align()
    return cid, faint_alpha(b, p) if flags & 8 else None


def walk(b, pos, end, rects, found, kids):
    while pos < end:
        head = b[pos] | b[pos + 1] << 8
        code, ln = head >> 6, head & 0x3F
        pos += 2
        if ln == 0x3F:
            ln = int.from_bytes(b[pos:pos + 4], 'little')
            pos += 4
        if code == 39:
            inner = []
            walk(b, pos + 4, pos + ln, rects, found, inner)
            if len(inner) == 1 and inner[0] in rects:
                rects.add(b[pos] | b[pos + 1] << 8)
        elif code in (2, 22, 32, 83) and is_rect(b, pos, code):
            rects.add(b[pos] | b[pos + 1] << 8)
        elif code in (26, 70):
            cid, alpha = place(b, code, pos)
            if cid is not None:
                kids.append(cid)
                if alpha and cid in rects:
                    found.append(alpha)
        pos += ln
        if code == 0:
            return


def patch(path):
    raw = path.read_bytes()
    if raw[:3] != b'CWS':
        return False
    b = bytearray(raw[:8] + zlib.decompress(raw[8:]))
    r = Bits(b, 8)
    r.skip_rect()
    found = []
    walk(b, r.align() + 4, len(b), set(), found, [])
    for off, n in found:
        for i in range(n):
            bit = off + i
            b[bit >> 3] &= ~(0x80 >> (bit & 7))
    if found:
        path.write_bytes(bytes(b[:8]) + zlib.compress(bytes(b[8:]), 9))
    return bool(found)


for f in sorted(Path(sys.argv[1]).rglob('*.swf')):
    if patch(f):
        print(f)
