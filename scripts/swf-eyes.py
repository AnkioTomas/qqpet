#!/usr/bin/env python3
"""Make the pet's pupils follow the cursor where the original SWFs cannot.

Adult Stand.swf already does (it asks API.GetCursorPosition). This patches:
- Hide_left1/Hide_right1 (peeking from a screen edge): the frame script that holds
  the peek starts moving the pupils, given as child-index paths at that frame.
- Kid/Egg Stand.swf (no code at all): each pupil shape is wrapped in a sprite of
  class Pupil; the timeline animates the wrapper, Pupil offsets the shape inside.

Needs JPEXS (https://github.com/jindrapetrik/jpexs-decompiler) and the ORIGINAL SWFs:
  FFDEC=/path/to/ffdec-cli.jar python3 scripts/swf-eyes.py <original Action dir> resources/pet/Action
"""
import os
import re
import struct
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path

FFDEC = os.environ['FFDEC']
SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2])
WORK = Path(tempfile.mkdtemp())

# Peek pupil travel (rx, ry) in stage units, as far as the eye whites allow.
ADULT = (0.9, 0.3)
KID = (1.8, 1.0)
EGG = (1.8, 0.6)
# file, hold frame, pupil paths, (rx, ry)
PEEKS = [
    ('GG/Adult/Hide_left1', 20, [[4, 1], [4, 2]], ADULT),
    ('GG/Adult/Hide_right1', 20, [[3, 1], [3, 2]], ADULT),
    ('MM/Adult/Hide_left1', 20, [[3, 1], [3, 2]], ADULT),
    ('MM/Adult/Hide_right1', 20, [[3, 1], [3, 2]], ADULT),
    ('GG/Kid/Hide_left1', 32, [[8], [9]], KID),
    ('GG/Kid/Hide_right1', 32, [[8], [9]], KID),
    ('MM/Kid/Hide_left1', 35, [[9], [10]], KID),
    ('MM/Kid/Hide_right1', 36, [[9], [10]], KID),
    ('MM/Egg/Hide_left1', 22, [[5], [7]], EGG),
    ('MM/Egg/Hide_right1', 25, [[5], [7]], EGG),
    ('GG/Egg/Hide_left1', 60, 'egg', (3.0, 2.5)),
    ('GG/Egg/Hide_right1', 60, 'egg', (3.0, 2.5)),
]

METHODS = '''
      public var eyes:Array;

      public var eyesAt:int;

      public var eyesR:Point;

      public var eyesDrop:Array = [];

      public function eyesOn(paths:Array, rx:Number, ry:Number) : void
      {
         var p:Array = null;
         var o:DisplayObject = null;
         var i:int = 0;
         this.eyes = [];
         this.eyesAt = currentFrame;
         this.eyesR = new Point(rx,ry);
         for each(p in paths)
         {
            o = this;
            for each(i in p)
            {
               o = DisplayObjectContainer(o).getChildAt(i);
            }
            this.eyes.push({"o":o,"x":o.x,"y":o.y});
         }
         addEventListener(Event.ENTER_FRAME,this.eyesFollow);
      }

      public function eyesFollow(e:Event) : void
      {
         var q:Object = null;
         var home:Point = null;
         var dx:Number = NaN;
         var dy:Number = NaN;
         var d:Number = NaN;
         var k:Number = NaN;
         var to:Point = null;
         if(currentFrame != this.eyesAt)
         {
            for each(q in this.eyes)
            {
               q.o.x = q.x;
               q.o.y = q.y;
            }
            for each(q in this.eyesDrop)
            {
               q.parent.removeChild(q);
            }
            this.eyesDrop = [];
            removeEventListener(Event.ENTER_FRAME,this.eyesFollow);
            return;
         }
         var c:Array = String(ExternalInterface.call("API.GetCursorPosition",0)).split(",");
         var w:Array = String(ExternalInterface.call("API.GetWindowRect",null)).split(",");
         var sx:Number = (Number(c[0]) - Number(w[0])) * loaderInfo.width / Number(w[2]);
         var sy:Number = (Number(c[1]) - Number(w[1])) * loaderInfo.height / Number(w[3]);
         for each(q in this.eyes)
         {
            home = q.o.parent.localToGlobal(new Point(q.x,q.y));
            dx = sx - home.x;
            dy = sy - home.y;
            d = Math.sqrt(dx * dx + dy * dy);
            k = d < 1 ? 0 : Math.min(d,100) / 100 / d;
            to = q.o.parent.globalToLocal(new Point(home.x + dx * k * this.eyesR.x,home.y + dy * k * this.eyesR.y));
            q.o.x = to.x;
            q.o.y = to.y;
         }
      }
'''

# GG egg peeks from a button whose art is one merged shape: paint over its pupils
# and follow with new ones. Each eye: baked pupil center, eye white center (shape coords).
EGG_ART = '''
      public function eggEyes(rx:Number, ry:Number) : void
      {
         var e:Array = null;
         var s:Shape = null;
         var up:DisplayObjectContainer = DisplayObjectContainer(this.button_1.upState);
         var art:DisplayObjectContainer = up.getChildAt(0) is Shape ? up : DisplayObjectContainer(up.getChildAt(0));
         this.eyes = [];
         this.eyesAt = currentFrame;
         this.eyesR = new Point(rx,ry);
         for each(e in [[15.78,21.18,17.85,20.12],[15.33,34.75,17.7,36]])
         {
            s = new Shape();
            s.graphics.beginFill(16777215);
            s.graphics.drawEllipse(e[0] - 4.5,e[1] - 3.2,9,6.4);
            s.graphics.endFill();
            art.addChild(s);
            this.eyesDrop.push(s);
            s = new Shape();
            s.graphics.beginFill(0);
            s.graphics.drawEllipse(-3.5,-2.4,7,4.8);
            s.graphics.endFill();
            s.x = e[2];
            s.y = e[3];
            art.addChild(s);
            this.eyesDrop.push(s);
            this.eyes.push({"o":s,"x":s.x,"y":s.y});
         }
         addEventListener(Event.ENTER_FRAME,this.eyesFollow);
      }
'''

IMPORTS = '''   import flash.display.Shape;
   import flash.display.DisplayObject;
   import flash.display.DisplayObjectContainer;
   import flash.events.Event;
   import flash.external.ExternalInterface;
   import flash.geom.Point;
'''


def patch_peek(rel: str, frame: int, paths: list, r: tuple) -> None:
    swf = SRC / f'{rel}.swf'
    dec = WORK / 'peek' / rel.replace('/', '_')
    subprocess.run(['java', '-jar', FFDEC, '-format', 'script:as', '-export', 'script', str(dec), str(swf)], check=True, capture_output=True)
    holders = [p for p in dec.rglob('*.as') if f'function frame{frame}()' in p.read_text()]
    assert len(holders) == 1, (rel, holders)
    path = holders[0]
    src = path.read_text()
    name = '.'.join(path.relative_to(dec / 'scripts').with_suffix('').parts)
    src = re.sub(r'(package[^{]*\{\n)', r'\1' + IMPORTS, src, count=1)
    call = f'this.eggEyes({r[0]},{r[1]})' if paths == 'egg' else f'this.eyesOn({paths},{r[0]},{r[1]})'
    src, n = re.subn(rf'(internal function frame{frame}\(\) : \*\n\s*\{{\n)', rf'\1         {call};\n', src, count=1)
    assert n == 1, rel
    end = src.rstrip().rstrip('}').rstrip().rstrip('}')
    src = end + METHODS + (EGG_ART if paths == 'egg' else '') + '   }\n}\n'
    path.write_text(src)
    out = OUT / f'{rel}.swf'
    res = subprocess.run(['java', '-jar', FFDEC, '-replace', str(swf), str(out), name, str(path)], capture_output=True, text=True)
    if res.returncode or not out.exists() or 'rror' in res.stdout + res.stderr:
        raise SystemExit(f'{rel}: {res.stdout}{res.stderr}')
    print('ok', rel, name)


# file, pupil shape ids
STANDS = [
    ('GG/Kid/Stand', [3, 4, 83]),
    ('MM/Kid/Stand', [15, 16, 69]),
    ('GG/Egg/Stand', [13, 14, 68]),
    ('MM/Egg/Stand', [12, 13, 68]),
]
# Stand pupil travel (rx, ry) in stage units.
R = (1.0, 1.0)

PUPIL = '''package
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.external.ExternalInterface;
   import flash.geom.Point;

   public class Pupil extends MovieClip
   {
      public function Pupil()
      {
         super();
         addEventListener(Event.ENTER_FRAME,this.follow);
      }

      public function follow(e:Event) : void
      {
         var c:Array = String(ExternalInterface.call("API.GetCursorPosition",0)).split(",");
         var w:Array = String(ExternalInterface.call("API.GetWindowRect",null)).split(",");
         var sx:Number = (Number(c[0]) - Number(w[0])) * loaderInfo.width / Number(w[2]);
         var sy:Number = (Number(c[1]) - Number(w[1])) * loaderInfo.height / Number(w[3]);
         var home:Point = localToGlobal(new Point(0,0));
         var dx:Number = sx - home.x;
         var dy:Number = sy - home.y;
         var d:Number = Math.sqrt(dx * dx + dy * dy);
         var k:Number = d < 1 ? 0 : Math.min(d,100) / 100 / d;
         var to:Point = globalToLocal(new Point(home.x + dx * k * RX,home.y + dy * k * RY));
         getChildAt(0).x = to.x;
         getChildAt(0).y = to.y;
      }
   }
}
'''


def tags(data: bytes, pos: int):
    while pos < len(data):
        head, = struct.unpack_from('<H', data, pos)
        code, size, start = head >> 6, head & 0x3F, pos + 2
        if size == 0x3F:
            size, = struct.unpack_from('<I', data, start)
            start += 4
        yield code, data[start:start + size]
        pos = start + size
        if code == 0:
            return


def tag(code: int, body: bytes) -> bytes:
    return struct.pack('<HI', code << 6 | 0x3F, len(body)) + body


def retarget(code: int, body: bytes, wrap: dict) -> bytes:
    """PlaceObject2/3 pointing at a pupil shape now point at its wrapper."""
    if code == 26 and body[0] & 0x02:
        at = 3
    elif code == 70 and body[0] & 0x02:
        at = 4
        if body[1] & 0x08 or body[1] & 0x10:
            at = body.index(0, at) + 1
    else:
        return body
    cid, = struct.unpack_from('<H', body, at)
    if cid not in wrap:
        return body
    return body[:at] + struct.pack('<H', wrap[cid]) + body[at + 2:]


def body_of(raw: bytes) -> int:
    return 8 + (5 + 4 * (raw[8] >> 3) + 7) // 8 + 4


def unpack(data: bytes) -> bytes:
    return b'FWS' + data[3:8] + (zlib.decompress(data[8:]) if data[:3] == b'CWS' else data[8:])


def pupil_abc() -> bytes:
    """JPEXS only compiles over an existing class: build Pupil over the one-class PetHide donor."""
    donor = WORK / 'donor'
    donor.mkdir(parents=True, exist_ok=True)
    (donor / 'Pupil.as').write_text(PUPIL.replace('RX', str(R[0])).replace('RY', str(R[1])))
    subprocess.run(['java', '-jar', FFDEC, '-replace', str(SRC / 'GG/Adult/Hide_left1.swf'), str(donor / 'out.swf'), 'PetHide', str(donor / 'Pupil.as')], check=True, capture_output=True)
    raw = unpack((donor / 'out.swf').read_bytes())
    return next(b for c, b in tags(raw, body_of(raw)) if c == 82)


def rewrite(raw: bytes, pupils: list, abc: bytes) -> tuple[bytes, dict]:
    head_end = body_of(raw)
    ids = [struct.unpack_from('<H', b)[0] for c, b in tags(raw, head_end) if c in (2, 22, 32, 83, 39, 46, 84, 34, 7)]
    top = max(ids)
    wrap = {p: top + 1 + i for i, p in enumerate(pupils)}
    out = []
    for code, body in tags(raw, head_end):
        if code == 39:
            sid, frames = struct.unpack_from('<HH', body)
            inner = b''.join(tag(c, retarget(c, b, wrap)) for c, b in tags(body, 4))
            body = struct.pack('<HH', sid, frames) + inner
        out.append(tag(code, retarget(code, body, wrap)))
        if code == 69:
            out.append(tag(82, abc))
        if code in (2, 22, 32, 83) and struct.unpack_from('<H', body)[0] in wrap:
            cid = struct.unpack_from('<H', body)[0]
            place = struct.pack('<BHH', 0x02, 1, cid)
            sprite = struct.pack('<HH', wrap[cid], 1) + tag(26, place) + tag(1, b'') + tag(0, b'')
            out.append(tag(39, sprite))
            out.append(tag(76, struct.pack('<HH', 1, wrap[cid]) + b'Pupil\0'))
    body = raw[8:head_end] + b''.join(out)
    return raw[:4] + struct.pack('<I', 8 + len(body)) + body, wrap


def patch_stand(rel: str, pupils: list, abc: bytes) -> None:
    out, wrap = rewrite(unpack((SRC / f'{rel}.swf').read_bytes()), pupils, abc)
    (OUT / f'{rel}.swf').write_bytes(b'CWS' + out[3:8] + zlib.compress(out[8:], 9))
    print('ok', rel, wrap)



for job in PEEKS:
    patch_peek(*job)
abc = pupil_abc()
for job in STANDS:
    patch_stand(*job, abc)
