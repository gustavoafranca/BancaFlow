#!/usr/bin/env python3
"""Validate roadmap Markdown without modifying any file."""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from pathlib import Path

STATES = {
    "DISCOVERY", "DECISIONS_PENDING", "READY_FOR_SPEC", "SPEC_PROPOSED",
    "SPEC_APPROVED", "IMPLEMENTING", "IMPLEMENTED", "REVIEWED",
    "DOCUMENTED", "ARCHIVED",
}
REQUIRED_PLAN_HEADINGS = {
    "identificação e estado", "objetivo e valor", "dependências", "escopo",
    "fora de escopo", "atores e permissões", "decisões", "domínio e contexts",
    "agregados, entidades, vos e serviços",
    "invariantes, estados, concorrência e idempotência",
    "casos de uso e falhas", "portas e adapters", "eventos e integrações",
    "persistência e migração", "backend", "web",
    "segurança, tenancy e auditoria", "testes e critérios de aceitação",
    "riscos e hipóteses", "definition of ready", "definition of done",
    "decomposição em increments e changes",
    "mapa de capability specs por incremento",
}
HEADING_RE = re.compile(r"^#{1,6}\s+(.+?)\s*$", re.MULTILINE)
DECLARED_STATE_RE = re.compile(
    r"^\s*-\s*\*\*Estado(?: global)?:\*\*\s*`?([A-Z_]+)`?\s*$", re.MULTILINE
)
LINK_RE = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")


def normalize_heading(value: str) -> str:
    value = re.sub(r"[`*_]", "", value).strip().lower()
    return re.sub(r"^\d+\s*[—–.:-]\s*", "", value)


def is_capability_text(text: str) -> bool:
    headings = [normalize_heading(h) for h in HEADING_RE.findall(text)]
    return "identificação e estado" in headings and (
        "definition of ready" in headings or "decisões" in headings
    )


def duplicate_capability_numbers(paths: list[Path]) -> list[str]:
    by_number: dict[str, list[Path]] = {}
    for path in paths:
        text = path.read_text(encoding="utf-8")
        if not is_capability_text(text):
            continue
        match = re.match(r"^(\d+)-", path.name)
        if not match or match.group(1) == "00":
            continue
        by_number.setdefault(match.group(1), []).append(path)
    return [
        f"numeração de plano duplicada {number}: " + ", ".join(str(path) for path in sorted(group))
        for number, group in sorted(by_number.items())
        if len(group) > 1
    ]


def has_critical_open_decision(text: str) -> bool:
    for line in text.splitlines():
        upper = line.upper()
        is_record = line.lstrip().startswith("|") or "DEC-" in upper
        if is_record and "CRITICAL" in upper and "OPEN" in upper:
            return True
    return False


def parse_increments(text: str) -> list[tuple[str, str, str]]:
    increments: list[tuple[str, str, str]] = []
    for line in text.splitlines():
        if not re.match(r"^\s*\|\s*INC-[A-Z0-9-]+\s*\|", line, re.I):
            continue
        cells = [cell.strip().strip("`") for cell in line.strip().strip("|").split("|")]
        if len(cells) < 6:
            continue
        increments.append((cells[0].upper(), cells[-2], cells[-1].upper()))
    return increments


def markdown_files(inputs: list[str]) -> tuple[list[Path], int]:
    found: set[Path] = set()
    invalid = 0
    for raw in inputs:
        path = Path(raw)
        if path.is_dir():
            found.update(p for p in path.rglob("*.md") if p.is_file())
        elif path.is_file() and path.suffix.lower() == ".md":
            found.add(path)
        else:
            invalid += 1
            print(f"ERROR {path}: caminho inexistente ou não Markdown")
    return sorted(found), invalid


def validate(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    headings = [normalize_heading(h) for h in HEADING_RE.findall(text)]
    errors: list[str] = []
    duplicates = [h for h, count in Counter(headings).items() if count > 1]
    if duplicates:
        errors.append("headings duplicados: " + ", ".join(sorted(duplicates)))
    is_capability = is_capability_text(text)
    if is_capability:
        if re.search(r"\{\{[A-Z0-9_]+\}\}", text):
            errors.append("placeholders de template não preenchidos")
        missing = sorted(REQUIRED_PLAN_HEADINGS - set(headings))
        if missing:
            errors.append("headings obrigatórios ausentes: " + ", ".join(missing))
        state_match = DECLARED_STATE_RE.search(text)
        state = state_match.group(1) if state_match else None
        if state not in STATES:
            errors.append(f"estado ausente ou inválido: {state or '<ausente>'}")
        elif state == "READY_FOR_SPEC" and has_critical_open_decision(text):
            errors.append("READY_FOR_SPEC incompatível com decisão CRITICAL/OPEN")
        increments = parse_increments(text)
        if state == "READY_FOR_SPEC" and not increments:
            errors.append("READY_FOR_SPEC exige ao menos um incremento decomposto")
        if state == "READY_FOR_SPEC" and increments and not any(item[2] == "READY_FOR_SPEC" for item in increments):
            errors.append("READY_FOR_SPEC exige um incremento READY_FOR_SPEC")
        change_names: list[str] = []
        for increment_id, change_name, increment_state in increments:
            if increment_state not in STATES:
                errors.append(f"estado inválido no incremento {increment_id}: {increment_state or '<ausente>'}")
            if not re.fullmatch(r"[a-z][a-z0-9-]+", change_name):
                errors.append(f"change inválida no incremento {increment_id}: {change_name or '<ausente>'}")
            else:
                change_names.append(change_name)
        duplicate_changes = [name for name, count in Counter(change_names).items() if count > 1]
        if duplicate_changes:
            errors.append("changes duplicadas entre increments: " + ", ".join(sorted(duplicate_changes)))
    for target in LINK_RE.findall(text):
        clean = target.split("#", 1)[0].strip().strip("<>")
        if not clean or re.match(r"^[a-z]+://", clean, re.I) or clean.startswith("mailto:"):
            continue
        if not (path.parent / clean).exists():
            errors.append(f"link local quebrado: {target}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", help="Arquivos Markdown ou diretórios")
    args = parser.parse_args()
    files, failures = markdown_files(args.paths)
    if not files:
        print("ERROR nenhum arquivo Markdown encontrado")
        return 2
    for path in files:
        errors = validate(path)
        if errors:
            failures += 1
            for error in errors:
                print(f"ERROR {path}: {error}")
        else:
            print(f"OK {path}")
    for error in duplicate_capability_numbers(files):
        failures += 1
        print(f"ERROR {error}")
    print(f"Checked {len(files)} file(s); {failures} failed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
