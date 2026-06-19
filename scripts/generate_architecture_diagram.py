#!/usr/bin/env python3
"""Generate a polished architecture diagram for the Insurance Claims Copilot."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "architectureDiagram.png"

W, H = 2400, 1350

# Palette
BG = (8, 12, 22)
BG_GRAD_TOP = (12, 18, 34)
GRID = (22, 30, 48)
CYAN = (0, 212, 255)
BLUE = (59, 130, 246)
PURPLE = (168, 85, 247)
GREEN = (16, 185, 129)
AMBER = (245, 158, 11)
ROSE = (244, 63, 94)
WHITE = (248, 250, 252)
MUTED = (148, 163, 184)
DARK_TEXT = (15, 23, 42)


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def gradient_bg() -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    px = img.load()
    for y in range(H):
        t = y / H
        r = lerp(BG_GRAD_TOP[0], BG[0], t)
        g = lerp(BG_GRAD_TOP[1], BG[1], t)
        b = lerp(BG_GRAD_TOP[2], BG[2], t)
        for x in range(W):
            px[x, y] = (r, g, b)
    return img


def load_fonts() -> dict[str, ImageFont.FreeTypeFont | ImageFont.ImageFont]:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    bold = regular = None
    for path in candidates:
        if Path(path).exists():
            if "Bold" in path and bold is None:
                bold = ImageFont.truetype(path, 0)
            elif "Bold" not in path and regular is None:
                regular = ImageFont.truetype(path, 0)
    if bold is None:
        bold = ImageFont.load_default()
    if regular is None:
        regular = ImageFont.load_default()

    return {
        "title": bold.font_variant(size=46) if hasattr(bold, "font_variant") else ImageFont.truetype(candidates[0], 46),
        "subtitle": regular.font_variant(size=22) if hasattr(regular, "font_variant") else ImageFont.truetype(candidates[1], 22),
        "layer": bold.font_variant(size=20) if hasattr(bold, "font_variant") else ImageFont.truetype(candidates[0], 20),
        "box_title": bold.font_variant(size=24) if hasattr(bold, "font_variant") else ImageFont.truetype(candidates[0], 24),
        "box_sub": regular.font_variant(size=17) if hasattr(regular, "font_variant") else ImageFont.truetype(candidates[1], 17),
        "small": regular.font_variant(size=15) if hasattr(regular, "font_variant") else ImageFont.truetype(candidates[1], 15),
        "badge": bold.font_variant(size=14) if hasattr(bold, "font_variant") else ImageFont.truetype(candidates[0], 14),
    }


def draw_grid(draw: ImageDraw.ImageDraw) -> None:
    for x in range(0, W, 60):
        draw.line([(x, 120), (x, H - 40)], fill=GRID, width=1)
    for y in range(120, H - 40, 60):
        draw.line([(40, y), (W - 40, y)], fill=GRID, width=1)


def glow_round_rect(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    fill: tuple[int, int, int],
    outline: tuple[int, int, int],
    radius: int = 18,
    glow: int = 3,
) -> None:
    x1, y1, x2, y2 = box
    for i in range(glow, 0, -1):
        alpha = 40 + i * 18
        c = tuple(min(255, o + i * 8) for o in outline)
        draw.rounded_rectangle(
            (x1 - i, y1 - i, x2 + i, y2 + i),
            radius=radius + i,
            outline=c,
            width=1,
        )
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=2)


def draw_arrow(
    draw: ImageDraw.ImageDraw,
    start: tuple[int, int],
    end: tuple[int, int],
    color: tuple[int, int, int],
    width: int = 3,
) -> None:
    draw.line([start, end], fill=color, width=width)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    size = 14
    left = (
        end[0] - size * math.cos(angle - math.pi / 7),
        end[1] - size * math.sin(angle - math.pi / 7),
    )
    right = (
        end[0] - size * math.cos(angle + math.pi / 7),
        end[1] - size * math.sin(angle + math.pi / 7),
    )
    draw.polygon([end, left, right], fill=color)


def draw_curved_arrow(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[int, int]],
    color: tuple[int, int, int],
    width: int = 3,
) -> None:
    if len(points) < 2:
        return
    for i in range(len(points) - 1):
        draw.line([points[i], points[i + 1]], fill=color, width=width)
    draw_arrow(draw, points[-2], points[-1], color, width)


def centered_text(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    lines: list[str],
    fonts: list[ImageFont.ImageFont],
    colors: list[tuple[int, int, int]],
    y_offset: int = 0,
) -> None:
    x1, y1, x2, y2 = box
    heights = []
    for line, font in zip(lines, fonts):
        bbox = draw.textbbox((0, 0), line, font=font)
        heights.append(bbox[3] - bbox[1])
    gap = 6
    total = sum(heights) + gap * (len(lines) - 1)
    y = y1 + (y2 - y1 - total) // 2 + y_offset
    for line, font, color in zip(lines, fonts, colors):
        bbox = draw.textbbox((0, 0), line, font=font)
        tw = bbox[2] - bbox[0]
        x = x1 + (x2 - x1 - tw) // 2
        draw.text((x, y), line, font=font, fill=color)
        y += (bbox[3] - bbox[1]) + gap


def draw_node(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    title: str,
    subtitle: str,
    fonts: dict,
    fill: tuple[int, int, int],
    outline: tuple[int, int, int],
    icon: str | None = None,
) -> None:
    glow_round_rect(draw, box, fill=fill, outline=outline)
    x1, y1, x2, y2 = box
    if icon:
        draw.text((x1 + 18, y1 + 14), icon, font=fonts["box_title"], fill=outline)
        title_x = x1 + 52
        draw.text((title_x, y1 + 16), title, font=fonts["box_title"], fill=WHITE)
        draw.text((title_x, y1 + 48), subtitle, font=fonts["box_sub"], fill=MUTED)
    else:
        centered_text(
            draw,
            box,
            [title, subtitle],
            [fonts["box_title"], fonts["box_sub"]],
            [WHITE, MUTED],
        )


def draw_layer_label(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, color: tuple[int, int, int], font) -> None:
    draw.rounded_rectangle((x, y, x + 280, y + 42), radius=10, fill=(color[0] // 8, color[1] // 8, color[2] // 8), outline=color, width=2)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text((x + (280 - tw) // 2, y + 10), text, font=font, fill=color)


def main() -> None:
    img = gradient_bg()
    draw = ImageDraw.Draw(img)
    fonts = load_fonts()

    draw_grid(draw)

    # Title block
    draw.text((80, 42), "Insurance Claims Copilot", font=fonts["title"], fill=WHITE)
    draw.text((80, 96), "Human-in-the-loop AI architecture  ·  LangChain · LangMem · RAG · Groq", font=fonts["subtitle"], fill=MUTED)

    # Layer labels
    draw_layer_label(draw, 80, 150, "PRESENTATION", CYAN, fonts["layer"])
    draw_layer_label(draw, 560, 150, "API & DATA", BLUE, fonts["layer"])
    draw_layer_label(draw, 1040, 150, "AI AGENT", GREEN, fonts["layer"])
    draw_layer_label(draw, 1520, 150, "INTEGRATIONS", AMBER, fonts["layer"])

    # --- Presentation layer ---
    human_box = (90, 240, 340, 360)
    glow_round_rect(draw, human_box, fill=(10, 30, 42), outline=CYAN)
    centered_text(draw, human_box, ["👤", "Claims Adjuster", "Licensed human reviewer"], [fonts["box_title"], fonts["box_title"], fonts["box_sub"]], [CYAN, WHITE, MUTED])

    nextjs_box = (90, 400, 460, 520)
    draw_node(draw, nextjs_box, "Next.js Dashboard", ":3000  ·  FNOL · Draft Review · Audit", fonts, (10, 28, 48), CYAN, "◈")

    review_box = (90, 560, 460, 680)
    draw_node(draw, review_box, "Human Review", "Edit · Approve · Request Info", fonts, (10, 28, 48), CYAN, "✎")

    # --- API & Data ---
    api_box = (580, 320, 980, 440)
    draw_node(draw, api_box, "FastAPI Backend", ":8000  ·  tickets · drafts · memory · KB", fonts, (12, 24, 58), BLUE, "⚙")

    sqlite_box = (580, 500, 980, 620)
    draw_node(draw, sqlite_box, "SQLite", "customers · claims · drafts", fonts, (28, 16, 52), PURPLE, "🗄")

    memory_save_box = (580, 680, 980, 800)
    draw_node(draw, memory_save_box, "Save Approved Resolution", "writes to LangMem on accept", fonts, (28, 16, 52), PURPLE, "💾")

    # --- AI Agent (center hero) ---
    copilot_box = (1060, 380, 1460, 560)
    glow_round_rect(draw, copilot_box, fill=(8, 38, 32), outline=GREEN, radius=24, glow=5)
    centered_text(
        draw,
        copilot_box,
        ["🤖", "Support Copilot", "LangChain create_agent orchestrator"],
        [fonts["title"], fonts["box_title"], fonts["box_sub"]],
        [GREEN, WHITE, MUTED],
        y_offset=-10,
    )

    draft_box = (1060, 620, 1460, 740)
    draw_node(draw, draft_box, "AI Draft Recommendation", "coverage text + context_used audit", fonts, (8, 32, 48), CYAN, "📋")

    groq_box = (1060, 780, 1460, 900)
    draw_node(draw, groq_box, "Groq LLM", "reasoning + draft synthesis", fonts, (8, 38, 28), GREEN, "✦")

    # --- Integrations (right) ---
    langmem_box = (1540, 220, 1940, 340)
    draw_node(draw, langmem_box, "LangMem Memory", "customer + company scopes", fonts, (30, 18, 58), PURPLE, "🧠")

    inmem_box = (1980, 220, 2320, 340)
    draw_node(draw, inmem_box, "InMemoryStore", "LangGraph persistence", fonts, (30, 18, 58), PURPLE, "◎")

    rag_box = (1540, 400, 1940, 520)
    draw_node(draw, rag_box, "RAG Retrieval", "top-k policy / SOP chunks", fonts, (42, 28, 8), AMBER, "🔍")

    chroma_box = (1980, 400, 2320, 520)
    draw_node(draw, chroma_box, "ChromaDB", "vector store · chroma_rag/", fonts, (42, 28, 8), AMBER, "☁")

    kb_box = (1760, 560, 2160, 660)
    draw_node(draw, kb_box, "Insurance Knowledge Base", "knowledge_base/ · .md · .txt", fonts, (42, 28, 8), AMBER, "📚")

    tools_box = (1540, 720, 1940, 840)
    draw_node(draw, tools_box, "Support Tools", "LangChain tool calling", fonts, (42, 28, 8), AMBER, "🧰")

    plan_box = (1540, 880, 1740, 980)
    draw_node(draw, plan_box, "Plan Lookup", "tier · SLA", fonts, (42, 28, 8), AMBER, None)

    ticket_box = (1760, 880, 2160, 980)
    draw_node(draw, ticket_box, "Open Ticket Load", "claim queue band", fonts, (42, 28, 8), AMBER, None)

    # --- Main flow arrows (cyan) ---
    draw_curved_arrow(draw, [(275, 360), (275, 400)], CYAN)
    draw_curved_arrow(draw, [(275, 520), (275, 560)], CYAN)
    draw_curved_arrow(draw, [(460, 620), (580, 380)], CYAN)
    draw_curved_arrow(draw, [(980, 380), (1060, 470)], CYAN)
    draw_curved_arrow(draw, [(1260, 560), (1260, 620)], CYAN)
    draw_curved_arrow(draw, [(1060, 680), (460, 680), (460, 460), (90, 460)], CYAN)

    # API to SQLite
    draw_arrow(draw, (780, 440), (780, 500), PURPLE)
    draw_arrow(draw, (780, 620), (780, 680), PURPLE)

    # Copilot to integrations
    draw_arrow(draw, (1460, 430), (1540, 280), PURPLE)
    draw_arrow(draw, (1940, 280), (1980, 280), PURPLE)
    draw_arrow(draw, (1460, 470), (1540, 460), AMBER)
    draw_arrow(draw, (1940, 460), (1980, 460), AMBER)
    draw_arrow(draw, (1860, 520), (1860, 560), AMBER)
    draw_arrow(draw, (1460, 510), (1540, 780), AMBER)
    draw_arrow(draw, (1640, 840), (1640, 880), AMBER)
    draw_arrow(draw, (1860, 840), (1860, 880), AMBER)

    # Copilot to Groq
    draw_arrow(draw, (1260, 560), (1260, 780), GREEN)

    # Memory save back to LangMem
    draw_curved_arrow(draw, [(980, 740), (1200, 740), (1200, 200), (1540, 200), (1740, 220)], PURPLE)

    # Legend
    legend_y = 1040
    draw.rounded_rectangle((80, legend_y, 2320, 1280), radius=16, fill=(12, 18, 30), outline=(40, 52, 72), width=2)
    draw.text((110, legend_y + 20), "Data Flow", font=fonts["box_title"], fill=WHITE)

    legends = [
        (CYAN, "User interaction & draft review loop"),
        (BLUE, "REST API orchestration"),
        (GREEN, "Agent reasoning & LLM inference"),
        (PURPLE, "Persistent data & long-term memory"),
        (AMBER, "RAG retrieval & operational tools"),
    ]
    lx = 110
    for color, label in legends:
        draw.rounded_rectangle((lx, legend_y + 70, lx + 14, legend_y + 84), radius=4, fill=color)
        draw.text((lx + 20, legend_y + 64), label, font=fonts["small"], fill=MUTED)
        lx += 430

    # Workflow steps
    steps = [
        "① Adjuster submits FNOL",
        "② API persists claim",
        "③ Copilot gathers context",
        "④ LLM drafts recommendation",
        "⑤ Human approves → memory",
    ]
    sx = 110
    for i, step in enumerate(steps):
        draw.rounded_rectangle((sx, legend_y + 120, sx + 400, legend_y + 165), radius=10, fill=(18, 26, 42), outline=(50, 64, 90))
        draw.text((sx + 16, legend_y + 132), step, font=fonts["small"], fill=WHITE)
        if i < len(steps) - 1:
            draw_arrow(draw, (sx + 400, legend_y + 142), (sx + 430, legend_y + 142), MUTED, 2)
        sx += 430

    img.save(OUTPUT, "PNG", optimize=True)
    print(f"Saved: {OUTPUT}")


if __name__ == "__main__":
    main()
