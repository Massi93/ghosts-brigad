"""Generate FitFlow branding assets (app icon, adaptive foreground, splash).

Usage:  python3 scripts/generate_branding.py   (run from the fitflow/ directory)
Requires Pillow:  python3 -m pip install Pillow

Premium look: dark charcoal base with a vivid green→blue gradient stylised
dumbbell mark + a subtle radial glow. Distinct, universally readable as a
fitness app.
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
CHARCOAL = (14, 17, 22)    # #0E1116


# ---------------------------------------------------------------------------
# Drawing helpers
# ---------------------------------------------------------------------------
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


def draw_dumbbell(size, scale=0.7):
    """Return a mono (L mode) mask of a stylised horizontal dumbbell, centred.

    Layout (unit box, 1.0 = full size):
        plates:     two rounded rectangles at x=0.13 / x=0.87
        bar:        thin rectangle connecting them
        weights:    thicker outer caps for the heavy look
    """
    s = size
    mask = Image.new("L", (s, s), 0)
    d = ImageDraw.Draw(mask)

    # Normalised metrics, then scale them to `scale` * s, centred on the box.
    cx, cy = 0.5, 0.5

    def rect(x0, y0, x1, y1, radius=0):
        # Convert from unit-box around (cx, cy) with `scale` factor → pixels.
        ux0 = cx + (x0 - 0.5) * scale
        uy0 = cy + (y0 - 0.5) * scale
        ux1 = cx + (x1 - 0.5) * scale
        uy1 = cy + (y1 - 0.5) * scale
        px = [ux0 * s, uy0 * s, ux1 * s, uy1 * s]
        if radius > 0:
            d.rounded_rectangle(px, radius=radius * s, fill=255)
        else:
            d.rectangle(px, fill=255)

    # Centre bar (horizontal grip)
    rect(0.20, 0.46, 0.80, 0.54)

    # Inner plates (slightly bigger than the bar)
    rect(0.18, 0.38, 0.30, 0.62, radius=0.018)
    rect(0.70, 0.38, 0.82, 0.62, radius=0.018)

    # Outer plates (the chunky weights)
    rect(0.08, 0.30, 0.20, 0.70, radius=0.025)
    rect(0.80, 0.30, 0.92, 0.70, radius=0.025)

    return mask


# ---------------------------------------------------------------------------
# Asset builders
# ---------------------------------------------------------------------------
def make_app_icon(size=1024):
    """Premium icon: charcoal base + green→blue gradient dumbbell + glow."""
    base = Image.new("RGBA", (size, size), CHARCOAL + (255,))

    # Outer radial glow (green) → the icon feels lit from within.
    glow = radial_glow(size, (size // 2, size // 2), size * 0.55, GREEN, 95)
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.04))
    base.alpha_composite(glow)

    # Stylised dumbbell on a gradient body.
    grad = diagonal_gradient(size, GREEN, BLUE).convert("RGBA")
    mask = draw_dumbbell(size, scale=0.78)
    mask = mask.filter(ImageFilter.GaussianBlur(1.2))
    body = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    body.paste(grad, (0, 0), mask)

    # Drop shadow underneath the dumbbell.
    shadow_mask = draw_dumbbell(size, scale=0.78)
    shadow_mask = shadow_mask.filter(ImageFilter.GaussianBlur(size * 0.025))
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 200))
    shadow.putalpha(shadow_mask)
    # Offset shadow slightly downward.
    base.alpha_composite(shadow, dest=(0, int(size * 0.012)))

    base.alpha_composite(body)
    base.convert("RGB").save(f"{OUT}/icon_1024.png")


def make_foreground(size=1024, scale=0.62):
    """Transparent background, gradient dumbbell (Android adaptive icon)."""
    grad = diagonal_gradient(size, GREEN, BLUE).convert("RGBA")
    mask = draw_dumbbell(size, scale=scale)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    out.save(f"{OUT}/icon_foreground.png")


def make_splash(size=1024, scale=0.9):
    grad = diagonal_gradient(size, GREEN, BLUE).convert("RGBA")
    mask = draw_dumbbell(size, scale=scale)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    out.save(f"{OUT}/splash.png")


if __name__ == "__main__":
    make_app_icon()
    make_foreground()
    make_splash()
    print("Branding assets generated in", OUT)
