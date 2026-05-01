#!/usr/bin/env python3
"""
Package a Claude Code workflow skill folder for the Claude desktop/web app.

Two upload targets exist — do not mix them:

1) **Skill (chat “Skills”)** — Personalizar → Skills → Subir skill / “Upload a skill”
   ZIP contains one folder with **Skill.md** (see Anthropic “Creating custom Skills”).

2) **Claude Code plugin** — “Subir plugin local” / local plugin upload
   ZIP must include **.claude-plugin/plugin.json** and skills under **skills/** with
   **SKILL.md** (see Claude Code plugin docs).

Source layout (typical):
  .../skills/<skill-id>/SKILL.md
  .../references/, assets/, etc.

Usage:
  # Skill para Customize → Skills
  python3 scripts/package_skill_for_claude_app.py \\
    ~/.claude/plugins/cache/.../skills/api-design-principles

  # Plugin para “Subir plugin local” (el error que viste si subes un Skill.zip ahí)
  python3 scripts/package_skill_for_claude_app.py --format claude-plugin \\
    ~/.claude/plugins/cache/.../skills/api-design-principles

  python3 scripts/package_skill_for_claude_app.py --list-plugins

  # Todas las skills del plugin (un .zip por skill; omite name duplicado en YAML)
  python3 scripts/package_skill_for_claude_app.py --batch -o ./claude-app-skill-zips

Docs:
  Skills: https://support.claude.com/en/articles/12512198-creating-custom-skills
  Plugins: https://code.claude.com/docs/en/plugins
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

# Anthropic limits (Customize → Skills)
MAX_NAME_LEN = 64
MAX_DESC_LEN = 200

DEFAULT_PLUGIN_ROOT = Path.home() / ".claude/plugins/cache/claude-code-workflows"


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    """Parse simple YAML frontmatter --- ... --- from markdown."""
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    raw = parts[1].strip()
    body = parts[2].lstrip("\n")
    meta: dict[str, str] = {}
    for line in raw.splitlines():
        m = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line.strip())
        if not m:
            continue
        key, val = m.group(1), m.group(2).strip()
        if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
            val = val[1:-1]
        meta[key] = val
    return meta, body


def build_frontmatter(meta: dict[str, str]) -> str:
    lines = ["---"]
    order = ["name", "description", "dependencies"]
    seen = set()
    for k in order:
        if k in meta:
            lines.append(f"{k}: {meta[k]}")
            seen.add(k)
    for k, v in sorted(meta.items()):
        if k not in seen:
            lines.append(f"{k}: {v}")
    lines.append("---")
    return "\n".join(lines) + "\n"


def ensure_skill_md(skill_dir: Path) -> Path:
    upper = skill_dir / "SKILL.md"
    lower = skill_dir / "skill.md"
    if upper.is_file():
        return upper
    if lower.is_file():
        return lower
    raise FileNotFoundError(f"No SKILL.md in {skill_dir}")


def package_skill(skill_dir: Path, out_dir: Path) -> Path:
    skill_dir = skill_dir.resolve()
    src_md = ensure_skill_md(skill_dir)
    text = src_md.read_text(encoding="utf-8")
    meta, body = parse_frontmatter(text)
    if "name" not in meta or "description" not in meta:
        raise ValueError(
            "SKILL.md must start with YAML containing name: and description: "
            "(Claude app requirement)."
        )

    name = meta["name"].strip()
    if len(name) > MAX_NAME_LEN:
        raise ValueError(f"name is {len(name)} chars; max {MAX_NAME_LEN}: {name!r}")

    desc = meta["description"].strip()
    if len(desc) > MAX_DESC_LEN:
        meta["description"] = desc[: MAX_DESC_LEN - 1].rstrip() + "…"
        print(
            f"Warning: description truncated to {MAX_DESC_LEN} chars "
            f"(Claude app limit). Review Skill.md after upload.",
            file=sys.stderr,
        )

    folder_name = name
    # Folder name must match skill name per Anthropic packaging doc
    staging_parent = out_dir / "_staging"
    staging_parent.mkdir(parents=True, exist_ok=True)
    dest_root = staging_parent / folder_name
    if dest_root.exists():
        shutil.rmtree(dest_root)
    shutil.copytree(
        skill_dir,
        dest_root,
        ignore=shutil.ignore_patterns(".DS_Store", "__pycache__", "*.pyc"),
    )
    # Rename SKILL.md / skill.md → Skill.md
    copied_md = dest_root / src_md.name
    if not copied_md.is_file():
        raise RuntimeError(f"Expected {copied_md} after copy")
    skill_md_path = dest_root / "Skill.md"
    if copied_md != skill_md_path:
        copied_md.rename(skill_md_path)
    skill_md_path.write_text(
        build_frontmatter(meta) + body,
        encoding="utf-8",
    )

    zip_path = out_dir / f"{folder_name}.zip"
    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for p in dest_root.rglob("*"):
            if p.is_file():
                arc = p.relative_to(out_dir / "_staging")
                zf.write(p, arc.as_posix())

    shutil.rmtree(staging_parent)
    return zip_path


def package_claude_code_plugin(skill_dir: Path, out_dir: Path) -> Path:
    """ZIP for Claude app “Subir plugin local”: .claude-plugin/plugin.json + skills/.../SKILL.md."""
    skill_dir = skill_dir.resolve()
    src_md = ensure_skill_md(skill_dir)
    text = src_md.read_text(encoding="utf-8")
    meta, _body = parse_frontmatter(text)
    if "name" not in meta or "description" not in meta:
        raise ValueError("SKILL.md must contain YAML name: and description: in frontmatter.")

    skill_slug = meta["name"].strip()
    if not skill_slug:
        raise ValueError("Skill name in frontmatter is empty.")

    plugin_folder_name = f"{skill_slug}-plugin"
    staging_parent = out_dir / "_staging"
    staging_parent.mkdir(parents=True, exist_ok=True)
    plugin_root = staging_parent / plugin_folder_name
    if plugin_root.exists():
        shutil.rmtree(plugin_root)

    claude_plugin = plugin_root / ".claude-plugin"
    claude_plugin.mkdir(parents=True)
    manifest = {
        "name": skill_slug,
        "version": "1.0.0",
        "description": meta["description"].strip()[:500],
    }
    (claude_plugin / "plugin.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    skills_dest = plugin_root / "skills" / skill_slug
    shutil.copytree(
        skill_dir,
        skills_dest,
        ignore=shutil.ignore_patterns(".DS_Store", "__pycache__", "*.pyc"),
    )

    zip_path = out_dir / f"{plugin_folder_name}.zip"
    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for p in plugin_root.rglob("*"):
            if p.is_file():
                arc = p.relative_to(staging_parent)
                zf.write(p, arc.as_posix())

    shutil.rmtree(staging_parent)
    return zip_path


def iter_plugin_skills(plugin_root: Path) -> list[Path]:
    skills: list[Path] = []
    if not plugin_root.is_dir():
        return skills
    for skill_md in sorted(plugin_root.glob("**/skills/*/SKILL.md")):
        skills.append(skill_md.parent)
    return skills


def skill_canonical_name(skill_dir: Path) -> str | None:
    """YAML name: for deduplication; None if missing or unreadable."""
    try:
        src = ensure_skill_md(skill_dir)
        text = src.read_text(encoding="utf-8")
        meta, _ = parse_frontmatter(text)
    except OSError:
        return None
    name = (meta.get("name") or "").strip()
    return name or None


def batch_package(
    plugin_root: Path,
    out_dir: Path,
    fmt: str,
    stop_on_error: bool,
) -> int:
    """Emit one ZIP per skill folder; skip duplicate YAML `name`. Returns exit code."""
    dirs = iter_plugin_skills(plugin_root)
    seen: set[str] = set()
    ok = 0
    skipped_dup = 0
    skipped_bad = 0
    errors = 0

    out_dir.mkdir(parents=True, exist_ok=True)

    for d in dirs:
        key = skill_canonical_name(d)
        if not key:
            print(f"omitido (sin name válido en frontmatter): {d}", file=sys.stderr)
            skipped_bad += 1
            if stop_on_error:
                return 1
            continue
        if key in seen:
            print(f"omitido (duplicado name={key!r}): {d}", file=sys.stderr)
            skipped_dup += 1
            continue
        seen.add(key)
        try:
            if fmt == "skill":
                zip_path = package_skill(d, out_dir)
            else:
                zip_path = package_claude_code_plugin(d, out_dir)
            print(zip_path)
            ok += 1
        except Exception as e:
            errors += 1
            print(f"error en {d}: {e}", file=sys.stderr)
            if stop_on_error:
                return 1

    print(
        f"\nResumen: {ok} ZIP generados, {skipped_dup} duplicados omitidos, "
        f"{skipped_bad} carpetas sin name, {errors} errores → {out_dir}",
        file=sys.stderr,
    )
    return 1 if errors and stop_on_error else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "skill_dir",
        nargs="?",
        type=Path,
        help="Path to a single skill folder (contains SKILL.md); omit with --batch",
    )
    ap.add_argument(
        "-o",
        "--out",
        type=Path,
        default=Path("claude-app-skill-zips"),
        help="Output directory for ZIP files (default: ./claude-app-skill-zips)",
    )
    ap.add_argument(
        "--list-plugins",
        action="store_true",
        help=f"List skills under {DEFAULT_PLUGIN_ROOT}",
    )
    ap.add_argument(
        "--plugin-root",
        type=Path,
        default=DEFAULT_PLUGIN_ROOT,
        help="Root for --list-plugins",
    )
    ap.add_argument(
        "--format",
        choices=("skill", "claude-plugin"),
        default="skill",
        help=(
            "skill = ZIP for Personalizar → Skills (Skill.md). "
            "claude-plugin = ZIP for Subir plugin local (.claude-plugin/plugin.json)."
        ),
    )
    ap.add_argument(
        "--batch",
        action="store_true",
        help=(
            f"Generar un ZIP por cada skill bajo --plugin-root (por defecto "
            f"{DEFAULT_PLUGIN_ROOT}); omite duplicados por name: en YAML."
        ),
    )
    ap.add_argument(
        "--stop-on-error",
        action="store_true",
        help="Con --batch, detener en el primer error (por defecto se sigue).",
    )
    args = ap.parse_args()

    if args.list_plugins:
        found = iter_plugin_skills(args.plugin_root)
        if not found:
            print(f"No skills found under {args.plugin_root}", file=sys.stderr)
            return 1
        for p in found:
            rel = p.relative_to(args.plugin_root)
            print(rel.as_posix())
        print(f"\nTotal: {len(found)}", file=sys.stderr)
        return 0

    if args.batch:
        if args.skill_dir is not None:
            print("Usa --batch sin ruta de skill (solo --batch y opcional -o).", file=sys.stderr)
            return 2
        out = args.out.resolve()
        return batch_package(
            args.plugin_root.resolve(),
            out,
            args.format,
            stop_on_error=args.stop_on_error,
        )

    if not args.skill_dir:
        ap.print_help()
        return 2

    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    if args.format == "skill":
        zip_path = package_skill(args.skill_dir, out)
    else:
        zip_path = package_claude_code_plugin(args.skill_dir, out)
    print(zip_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
