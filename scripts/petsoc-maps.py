"""Rebuild the community scene/mini map pictures missing from the PetSoc dump.

The maps are the scene's background tiles plus its entities, scaled to the
size WorldMapConfig/MiniMapConfig ask for. Entities that are SWFs get their
first frame through JPEXS ffdec.

    python3 scripts/petsoc-maps.py /path/to/ffdec.jar
"""

import os
import re
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'resources/pet/petsoc'
FFDEC = sys.argv[1]


def nocase(rel: str) -> Path:
    path = ROOT
    for part in rel.split('/'):
        path = path / next(n for n in os.listdir(path) if n.lower() == part.lower())
    return path


def stage_color(data: bytes) -> tuple[int, ...] | None:
    """The SetBackgroundColor tag, if the SWF has one."""
    body = zlib.decompress(data[8:]) if data[:3] == b'CWS' else data[8:]
    pos = (5 + (body[0] >> 3) * 4 + 7) // 8 + 4
    while pos < len(body):
        header = int.from_bytes(body[pos:pos + 2], 'little')
        code, size = header >> 6, header & 0x3F
        pos += 2
        if size == 0x3F:
            size = int.from_bytes(body[pos:pos + 4], 'little')
            pos += 4
        if code == 9:
            return tuple(body[pos:pos + 3]) + (255,)
        if code == 0:
            return None
        pos += size
    return None


def swf_frame(path: Path) -> Image.Image:
    """ffdec paints the stage colour; a loaded SWF has none, so key it out."""
    with tempfile.TemporaryDirectory() as out:
        subprocess.run(['java', '-jar', FFDEC, '-format', 'frame:png', '-select', '1', '-export', 'frame', out, str(path)],
                       check=True, capture_output=True)
        img = Image.open(Path(out) / '1.png').convert('RGBA')
    key = stage_color(path.read_bytes())
    img.putdata([(0, 0, 0, 0) if p == key else p for p in img.getdata()])
    return img


def picture(path: Path) -> Image.Image:
    with open(path, 'rb') as f:
        swf = f.read(3) in (b'CWS', b'FWS', b'ZWS')
    return swf_frame(path) if swf else Image.open(path).convert('RGBA')


def render(scene: int) -> Image.Image | None:
    cfg = nocase(f'Data/SceneConfig_1065/{scene}/Config.xml').read_text(encoding='utf-8')
    bg = re.search(r'<Background rows="(\d+)" cols="(\d+)"[^>]*>\s*<Path value="([^"]+)"/>\s*<Item width="(\d+)" height="(\d+)"', cfg)
    rows, cols, tiles, w, h = int(bg[1]), int(bg[2]), ROOT / bg[3], int(bg[4]), int(bg[5])
    if not all((tiles / f'{r}_{c}.jpg').exists() for r in range(rows) for c in range(cols)):
        return None
    canvas = Image.new('RGB', (cols * w, rows * h))
    for r in range(rows):
        for c in range(cols):
            canvas.paste(Image.open(tiles / f'{r}_{c}.jpg'), (c * w, r * h))

    placed = []
    for model in re.findall(r'<EntityModel\b.*?</EntityModel>', cfg, re.S):
        view = ROOT / re.search(r'<View [^>]*path="([^"]+)"', model)[1]
        if not view.exists():
            continue
        cx, cy = map(int, re.search(r'<CenterPoint x="(-?\d+)" y="(-?\d+)"', model).groups())
        for x, y in re.findall(r'<Npc [^>]*\sx="(-?\d+)" y="(-?\d+)"', model):
            placed.append((int(y), int(x) - cx, int(y) - cy, view))
    # Buildings (游戏中心, 竞技场...) are NPCs; walking characters are left to the map's own dots.
    npcs = nocase(f'Data/NpcList_1065/{scene}/NpcList.xml').read_text(encoding='utf-8')
    for attrs, body in re.findall(r'<Npc\s([^>]*)>(.*?)</Npc>', npcs, re.S):
        view = re.search(r'<Param name="view">([^<]+)<', body)
        if 'AnimateNPC' in attrs or not view or not (ROOT / view[1]).exists():
            continue
        x, y = (int(re.search(rf'\s{k}="(-?\d+)"', attrs)[1]) for k in 'xy')
        cx, cy = map(int, re.search(r'<CenterPoint x="(-?\d+)" y="(-?\d+)"', body).groups())
        placed.append((y, x - cx, y - cy, ROOT / view[1]))
    cache: dict[Path, Image.Image] = {}
    for _, x, y, view in sorted(placed, key=lambda p: p[0]):
        img = cache.setdefault(view, picture(view))
        canvas.paste(img, (x, y), img)
    return canvas


def targets(config: str) -> dict[int, tuple[str, int, int]]:
    text = nocase(config).read_text(encoding='utf-8')
    found = re.findall(r'<SceneModel id="(\d+)"[^>]*backmapWidth="(\d+)" backmapHight="(\d+)"[^>]*>[^<]*<backmap src="([^"]+)"', text)
    return {int(i): (src, int(w), int(h)) for i, w, h, src in found}


large = targets('Data/MapCfg_1065/WorldMapConfig.xml')
mini = targets('Data/MapCfg_1065/MiniMapConfig.xml')
for scene in sorted(large.keys() | mini.keys()):
    if not nocase('Data/SceneConfig_1065').joinpath(str(scene), 'Config.xml').exists():
        continue
    full = render(scene)
    if full is None:
        print(scene, 'skipped: background tiles missing')
        continue
    for src, w, h in filter(None, (large.get(scene), mini.get(scene))):
        out = ROOT / src
        full.resize((w, h), Image.LANCZOS).save(out, quality=88)
        print(scene, out.relative_to(ROOT), (w, h))
