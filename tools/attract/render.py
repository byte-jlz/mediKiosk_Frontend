"""
Renders the attract loop (src/attract/Movie.jsx) into public/attract/medikiosk-attract.mp4.

Every frame is drawn on a virtual clock, so the video is smooth no matter how
slow the computer is. Needs: Python + playwright (pip install playwright,
then `playwright install chromium`) and ffmpeg on the PATH.

  1. npm run dev                       (keep it running)
  2. python tools/attract/render.py    (about 2 minutes)

Options:
  --url      where the dev server is      (default http://localhost:5173)
  --preview  also draw the clock + "Touch anywhere to start" into the video
             (only for showing it to people - the kiosk draws those live)
  --out      output file                  (default public/attract/medikiosk-attract.mp4)
"""
import argparse
import asyncio
import shutil
import subprocess
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright

FPS = 30
LAUNCH = {}  # extra Chromium launch options, e.g. {"executable_path": "..."}
ROOT = Path(__file__).resolve().parents[2]


async def render(url, overlay, frames_dir):
    async with async_playwright() as p:
        browser = await p.chromium.launch(**LAUNCH)
        page = await browser.new_page(viewport={"width": 1080, "height": 1920})
        page.on("pageerror", lambda e: print("page error:", e))
        await page.goto(f"{url}/attract-render.html?overlay={1 if overlay else 0}")
        await page.wait_for_function("window.__ready === true")
        await page.evaluate("Promise.all([...document.images].map(i => i.complete || new Promise(r => (i.onload = r))))")
        await page.evaluate("document.fonts.ready")
        length_ms = await page.evaluate("window.__length")
        n = length_ms * FPS // 1000
        for i in range(n):
            await page.evaluate(f"window.__frame({i * 1000 / FPS})")
            await page.screenshot(path=str(frames_dir / f"f{i:05d}.jpg"), type="jpeg", quality=94)
            if i % 150 == 0:
                print(f"frame {i}/{n}", flush=True)
        await browser.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:5173")
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--out", default=str(ROOT / "public" / "attract" / "medikiosk-attract.mp4"))
    args = ap.parse_args()
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg not found - install it first")
    with tempfile.TemporaryDirectory() as tmp:
        frames = Path(tmp)
        asyncio.run(render(args.url.rstrip("/"), args.preview, frames))
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(frames / "f%05d.jpg"),
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-profile:v", "high", "-level", "4.1",
             "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", args.out],
            check=True,
        )
    print("saved", args.out)


if __name__ == "__main__":
    main()
