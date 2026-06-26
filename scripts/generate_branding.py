"""Generate FitFlow branding assets (app icon, adaptive foreground, splash).

Usage:  python3 scripts/generate_branding.py   (run from the fitflow/ directory)
Requires Pillow:  python3 -m pip install Pillow
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "assets", "branding")
os.makedirs(OUT, exist_ok=True)
GREEN = (0, 230, 118)      # #00E676
BLUE  = (0, 176, 255)      # #00B0FF
CHARCOAL = (14, 17, 22)    # #0E1116

def gradient(size, c1, c2):
    """Diagonal linear gradient image c1(top-left) -> c2(bottom-right)."""
    w = h = size
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = (x + y) / (w + h - 2)
            px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    return img

# Lightning-bolt polygon, normalised to a unit box.
BOLT = [
    (0.55, 0.06), (0.25, 0.54), (0.45, 0.54),
    (0.38, 0.94), (0.78, 0.40), (0.56, 0.40), (0.70, 0.06),
]

def bolt_points(size, scale, cx=0.5, cy=0.5):
    """Place the bolt centred, occupying `scale` of the box."""
    pts = []
    for (nx, ny) in BOLT:
        # centre the unit shape around (0.5,0.5) then scale + recentre
        x = cx + (nx - 0.5) * scale
        y = cy + (ny - 0.5) * scale
        pts.append((x * size, y * size))
    return pts

def make_app_icon(size=1024):
    img = gradient(size, GREEN, BLUE).convert("RGBA")
    d = ImageDraw.Draw(img)
    d.polygon(bolt_points(size, 0.62), fill=CHARCOAL + (255,))
    img.save(f"{OUT}/icon_1024.png")

def make_foreground(size=1024, scale=0.46):
    # Transparent background, gradient-filled bolt (for Android adaptive icon).
    grad = gradient(size, GREEN, BLUE).convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).polygon(bolt_points(size, scale), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    out.save(f"{OUT}/icon_foreground.png")

def make_splash(size=1024, scale=0.7):
    grad = gradient(size, GREEN, BLUE).convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).polygon(bolt_points(size, scale), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    out.save(f"{OUT}/splash.png")

make_app_icon()
make_foreground()
make_splash()
print("icons generated")
