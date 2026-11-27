#!/usr/bin/env python3
"""Corrige le décalage images / définitions du catalogue des panneaux (sans refaire l'extraction des PDF).

Cause : les codes à chiffre final (A15a1, B6a1, B21c1, G1bis…) n'étaient pas reconnus à l'extraction. Leur
texte s'est collé à la définition du panneau précédent et leur image est restée dans la séquence : chaque
image était donc associée au code suivant. Ici on redécoupe ces définitions collées, on retrouve la liste
complète des codes dans l'ordre, puis on réassocie la k-ième image à le k-ième code.

Les panneaux situés après la dernière image disponible (images perdues à l'extraction) sont retirés du
catalogue : sans image, ils ne peuvent pas être présentés.

Usage : python3 server/scripts/fix-panneaux-catalog.py [--dry-run]
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import shutil
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "content" / "code-panneaux"

spec = importlib.util.spec_from_file_location("build_panneaux", HERE / "build-panneaux-catalog.py")
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)

PREFIXES = r"(?:AB|AK|CE|EB|ID|SR|KC|KD|KM|KS|KR|KXC|SE|SI|SC|SU|Da|Dp|Dv|[A-Z])"
TOKEN = re.compile(
    r"(?<![A-Za-z0-9.])(" + PREFIXES + r"\d+[a-z]?\d?(?:-\d)?(?:[-_ ]?(?:bis|ancien))?)(?=\s+[A-ZÉÈ«\"'(])"
)



# Catégorie B : les images disponibles ne forment qu'une partie de la séquence officielle (plusieurs panneaux
# n'ont pas d'image dans l'extraction), l'association par position ne suffit donc pas. Table établie en regardant
# chaque image : (ancien nom de fichier, code réel, définition ; None = définition du catalogue).
MANUAL_B = [
    ("B0", "B0", None), ("B1", "B1", None), ("B2a", "B2a", None), ("B2b", "B2b", None), ("B2c", "B2c", None),
    ("B3", "B3", None), ("B3a", "B3a", None), ("B4", "B4", None), ("B5a", "B5a", None), ("B5b", "B5b", None),
    ("B5c", "B5c", None),
    ("B6d", "B6a1", None), ("B7a", "B6a2", None), ("B7b", "B6a3", None),
    ("B9a", "B6b1", None), ("B9b", "B6b2", None), ("B9c", "B6b3", None), ("B9d", "B6b3-ancien", None),
    ("B9e", "B6b4", None), ("B9f", "B6b5", None), ("B9g", "B6b5-ancien", None),
    ("B9h", "B6d", None),
    ("B9i", "B7a", None), ("B10a", "B7b", None), ("B11", "B8", None),
    ("B12", "B9a", None), ("B13", "B9b", None), ("B13a", "B9c", None), ("B14", "B9d", None),
    ("B15", "B10a", None), ("B16", "B11", None), ("B17", "B12", None), ("B18a", "B13", None), ("B18b", "B13a", None),
    ("B18c", "B14", None),
    ("B22b", "B14-30", "Limitation de vitesse à 30 km/h"),
    ("B22a", "B14-70", "Limitation de vitesse à 70 km/h"),
    ("B21e", "B14-90", "Limitation de vitesse à 90 km/h"),
    ("B21b", "B14-110", "Limitation de vitesse à 110 km/h"),
    ("B19", "B14-130", "Limitation de vitesse à 130 km/h"),
    ("B22c", "B15", None), ("B25", "B16", None), ("B26", "B17", None),
    ("B27a", "B18a", None), ("B27b", "B18b", None), ("B29", "B18c", None), ("B30", "B19", None),
    ("B34", "B21-2", None), ("B31", "B21c1", None), ("B33", "B21c2", None),
    ("B34a", "B21d1", None), ("B35", "B21d2", None), ("B39", "B21e", None),
    ("B40", "B22a", None), ("B41", "B22b", None), ("B42", "B22c", None), ("B43", "B25", None),
    ("B44", "B26", None), ("B45", "B27a", None), ("B49", "B27b", None),
    ("B50a", "B29", None), ("B50b", "B30", None), ("B50c", "B31", None),
    ("B50d", "B33", None),
    ("B50e", "B33-50", "Fin de limitation de vitesse à 50 km/h"),
    ("B51", "B33-30", "Fin de limitation de vitesse à 30 km/h"),
    ("B52", "B33-90", "Fin de limitation de vitesse à 90 km/h"),
    ("B53", "B33-110", "Fin de limitation de vitesse à 110 km/h"),
    ("B54", "B34", None), ("B55", "B34a", None),
]

def split_definition(code: str, definition: str) -> list[tuple[str, str]]:
    """Une définition collée → [(code, texte), …] (le premier est le code d'origine)."""
    matches = list(TOKEN.finditer(definition))
    if not matches:
        return [(code, definition)]
    parts = [(code, definition[: matches[0].start()].strip(" ."))]
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(definition)
        parts.append((m.group(1), definition[m.end() : end].strip(" .")))
    return parts


def main() -> None:
    global OUT
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--out", type=Path, default=OUT, help="dossier code-panneaux (copie de test possible)")
    parser.add_argument("--no-export", action="store_true", help="ne pas réécrire les fichiers TypeScript")
    args = parser.parse_args()
    OUT = args.out

    catalog = json.loads((OUT / "catalog.json").read_text(encoding="utf-8"))
    report = []
    new_categories = []

    for cat in catalog["categories"]:
        cid = cat["id"]
        old_signs = cat["signs"]
        images = [OUT / cid / f"{build.safe_name(s['code'])}.png" for s in old_signs]
        old_audio = {s["code"]: s.get("audio") for s in old_signs}
        old_def = {s["code"]: s["definition"] for s in old_signs}

        expanded: list[tuple[str, str]] = []
        for s in old_signs:
            expanded.extend(split_definition(s["code"], s["definition"]))

        defs_by_code = {c: t for c, t in expanded}
        if cid == "b":
            by_old = {s["code"]: OUT / cid / f"{build.safe_name(s['code'])}.png" for s in old_signs}
            pairs = [((new, text or defs_by_code.get(new, new)), by_old[old]) for old, new, text in MANUAL_B]
            lost = len(expanded) - len(pairs)
        else:
            pairs = list(zip(expanded, images))
            lost = max(0, len(expanded) - len(images))

        new_signs = []
        seen: set[str] = set()
        tmp_files: list[tuple[Path, Path]] = []
        for (code, text), img in pairs:
            if code in seen:
                continue
            seen.add(code)
            dest = OUT / cid / f"{build.safe_name(code)}.png"
            tmp_files.append((img, dest))
            sign = {
                "code": code,
                "definition": text or code,
                "image": f"/content/code-panneaux/{cid}/{build.safe_name(code)}.png",
            }
            audio = old_audio.get(code)
            # L'audio reste valable si la définition parlée est inchangée (début de l'ancienne définition).
            if audio and old_def.get(code, "").startswith(text[:40]):
                sign["audio"] = audio
            new_signs.append(sign)

        moved = sum(1 for (a, b) in tmp_files if a != b)
        report.append((cid, len(old_signs), len(expanded), len(new_signs), lost, moved))

        if not args.dry_run:
            with tempfile.TemporaryDirectory() as td:
                staged = []
                for i, (src, dest) in enumerate(tmp_files):
                    t = Path(td) / f"{i}.png"
                    shutil.copyfile(src, t)
                    staged.append((t, dest))
                for old in images:
                    old.unlink(missing_ok=True)
                for t, dest in staged:
                    shutil.copyfile(t, dest)

        new_categories.append({**cat, "count": len(new_signs), "signs": new_signs})

    print("cat   anciens  codes  gardés  perdus  images déplacées")
    for row in report:
        print("{:<10}{:>5}{:>7}{:>7}{:>7}{:>8}".format(*row))

    if args.dry_run:
        return
    catalog["categories"] = new_categories
    (OUT / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if not args.no_export:
        build.export_ts(catalog)
        # L'administration utilise la même copie du catalogue.
        mobile_ts = HERE.parents[1] / "mobile" / "src" / "data" / "codeRoute" / "panneauxCatalog.ts"
        admin_ts = HERE.parents[1] / "administration" / "src" / "data" / "panneauxCatalog.ts"
        shutil.copyfile(mobile_ts, admin_ts)
    print("catalog.json réécrit" + ("" if args.no_export else " et exports TypeScript réécrits"))


if __name__ == "__main__":
    main()
