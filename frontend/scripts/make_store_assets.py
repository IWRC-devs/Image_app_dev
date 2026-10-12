"""Generate Play Store listing assets (icon + feature graphic) from the app's
real icon photo. Run with: python3 scripts/make_store_assets.py
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # frontend/
REPO_ROOT = os.path.dirname(ROOT)
OUT_DIR = os.path.join(REPO_ROOT, "releases", "play-store-assets")
FONT_DIR = "C:/Windows/Fonts"

GREEN_DARK = (13, 21, 15)
GREEN_ACCENT = (92, 190, 133)
CREAM = (233, 239, 228)

os.makedirs(OUT_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# 1. Play Store icon: 512x512, straight resize of the real app icon artwork.
# ---------------------------------------------------------------------------
icon_src = Image.open(os.path.join(ROOT, "assets/images/icon.png")).convert("RGB")
icon_512 = icon_src.resize((512, 512), Image.LANCZOS)
icon_512.save(os.path.join(OUT_DIR, "icon-512.png"))

# ---------------------------------------------------------------------------
# 2. Feature graphic: 1024x500. Real leaf photo on the right, cropped and
#    darkened-gradient on the left so the wordmark stays legible.
# ---------------------------------------------------------------------------
W, H = 1024, 500
canvas = Image.new("RGB", (W, H), GREEN_DARK)

# crop a 500-tall slice of the (square) source photo, scaled to cover the
# right ~58% of the banner, then feather a left-to-right dark gradient over it.
photo = icon_src.copy()
scale = H / photo.height
photo = photo.resize((int(photo.width * scale), H), Image.LANCZOS)
photo_w = int(W * 0.62)
# take the photo's right-hand portion (where the foreground leaf sits) and fit it
if photo.width > photo_w:
    left_crop = photo.width - photo_w
    photo = photo.crop((left_crop, 0, photo.width, H))
else:
    photo = photo.resize((photo_w, H), Image.LANCZOS)
canvas.paste(photo, (W - photo_w, 0))

# darken + gradient-fade the photo into the dark ground so text stays legible
gradient = Image.new("L", (W, H), 0)
gdraw = ImageDraw.Draw(gradient)
fade_start = int(W * 0.30)
fade_end = int(W * 0.66)
for x in range(W):
    if x < fade_start:
        a = 255
    elif x > fade_end:
        a = 0
    else:
        a = int(255 * (1 - (x - fade_start) / (fade_end - fade_start)))
    gdraw.line([(x, 0), (x, H)], fill=a)
dark_layer = Image.new("RGB", (W, H), GREEN_DARK)
canvas = Image.composite(dark_layer, canvas, gradient)

# subtle overall darken on the photo half for text contrast insurance
enhancer = ImageEnhance.Brightness(canvas)
canvas = enhancer.enhance(0.92)

draw = ImageDraw.Draw(canvas)

title_font = ImageFont.truetype(os.path.join(FONT_DIR, "georgia.ttf"), 64)
tagline_font = ImageFont.truetype(os.path.join(FONT_DIR, "segoeui.ttf"), 26)
eyebrow_font = ImageFont.truetype(os.path.join(FONT_DIR, "segoeuisl.ttf"), 20)

margin = 56
y = 150

draw.text((margin, y - 46), "IWRC  •  FIELD RESEARCH TOOL", font=eyebrow_font, fill=GREEN_ACCENT)
draw.text((margin, y), "IWRC Imaging", font=title_font, fill=CREAM)
draw.text((margin, y + 100), "Standardized image and metadata collection", font=tagline_font, fill=(203, 214, 199))

canvas.save(os.path.join(OUT_DIR, "feature-graphic-1024x500.png"))

print("Wrote:", os.path.join(OUT_DIR, "icon-512.png"))
print("Wrote:", os.path.join(OUT_DIR, "feature-graphic-1024x500.png"))
