"""Generate FitFlow branding assets (app icon, adaptive foreground, splash).

Usage:  python3 scripts/generate_branding.py   (run from the fitflow/ directory)
Requires Pillow:  python3 -m pip install Pillow

Premium look: dark charcoal base with a vivid green→blue gradient lightning
bolt, plus a subtle glow ring for depth. Distinct from the previous
"black bolt over flat gradient" style.
"""
import math
import os
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "assets", "branding",
)
os.makedirs(OUT, exist_ok=True)

GREEN = (0, 230, 118)      # #00E676
BLUE = (0, 176, 255)       # #00B0FF
VIOLET = (124, 77, 255)    # #7C4DFF
CHARCOAL = (14, 17, 22)    # #0E1116
SURFACE = (23, 28, 36)     # #171C24

# Lightning bolt polygon, normalised to a unit box.
BOLT = [
    (0.55, 0.06), (0.25, 0.54), (0.45, 0.54),
    (0.38, 0.94), (0.78, 0.40), (0.56, 0.40), (0.70, 0.06),
]


def diagonal_gradient(size, c1, c2):
    """Smooth diagonal gradient image c1(top-left) -> c2(bottom-right)."""
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    return img


def radial_glow(size, center, radius, color, max_alpha):
    """Soft radial glow as an RGBA image."""
    cx, cy = center
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = img.load()
    for y in range(size):
        for x in range(size):
            dx, dy = x - cx, y - cy
            d = math.hypot(dx, dy)
            if d >= radius:
                continue
            t = 1 - (d / radius)
            a = int(max_alpha * (t ** 2))
            px[x, y] = (*color, a)
    return img


def bolt_points(size, scale, cx=0.5, cy=0.5):
    """Place the bolt centred, occupying `scale` of the box."""
    pts = []
    for nx, ny in BOLT:
        x = cx + (nx - 0.5) * scale
        y = cy + (ny - 0.5) * scale
        pts.append((x * size, y * size))
    return pts


def make_app_icon(size=1024):
    """Premium icon: charcoal base + green→blue gradient bolt + glow."""
    base = Image.new("RGBA", (size, size), CHARCOAL + (255,))

    # Outer radial glow (green) for depth — looks like the icon is lit.
    glow = radial_glow(size, (size // 2, size // 2), size * 0.55, GREEN, 90)
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.04))
    base.alpha_composite(glow)

    # The bolt is drawn on its own gradient image, then masked into the icon.
    grad = diagonal_gradient(size, GREEN, BLUE).convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).polygon(bolt_points(size, 0.60), fill=255)
    # Blur the mask edges very slightly for a softer cut.
    mask = mask.filter(ImageFilter.GaussianBlur(1.5))
    bolt = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bolt.paste(grad, (0, 0), mask)

    # Drop shadow under the bolt.
    shadow_mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(shadow_mask).polygon(
        [(x, y + size * 0.012) for x, y in bolt_points(size, 0.60)],
        fill=180,
    )
    shadow_mask = shadow_mask.filter(ImageFilter.GaussianBlur(size * 0.025))
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow.putalpha(shadow_mask)
    base.alpha_composite(shadow)
    base.alpha_composite(bolt)

    base.convert("RGB").save(f"{OUT}/icon_1024.png")


def make_foreground(size=1024, scale=0.46):
    """Transparent background, gradient bolt (for Android adaptive icon)."""
    grad = diagonal_gradient(size, GREEN, BLUE).convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).polygon(bolt_points(size, scale), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    out.save(f"{OUT}/icon_foreground.png")


def make_splash(size=1024, scale=0.7):
    grad = diagonal_gradient(size, GREEN, BLUE).convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).polygon(bolt_points(size, scale), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    out.save(f"{OUT}/splash.png")


if __name__ == "__main__":
    make_app_icon()
    make_foreground()
    make_splash()
    print("Branding assets generated in", OUT)
