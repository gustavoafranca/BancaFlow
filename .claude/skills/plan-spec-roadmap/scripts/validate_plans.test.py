from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("validate_plans.py")
SPEC = importlib.util.spec_from_file_location("validate_plans", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class ValidatePlansTest(unittest.TestCase):
    def setUp(self) -> None:
        self.source = Path(".docs/plans/01-participants.md").read_text(encoding="utf-8")

    def validate_text(self, text: str) -> list[str]:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "plan.md"
            path.write_text(text, encoding="utf-8")
            # Local links belong to the real plan and are irrelevant to these structural assertions.
            return [error for error in MODULE.validate(path) if not error.startswith("link local quebrado")]

    def test_ready_plan_with_vertical_increments_is_valid(self) -> None:
        self.assertEqual(self.validate_text(self.source), [])

    def test_ready_plan_without_increment_decomposition_is_rejected(self) -> None:
        start = self.source.index("## Decomposição em increments e changes")
        end = self.source.index("## Escopo", start)
        text = self.source[:start] + self.source[end:]
        errors = self.validate_text(text)
        self.assertTrue(any("headings obrigatórios ausentes" in error for error in errors))
        self.assertTrue(any("exige ao menos um incremento" in error for error in errors))

    def test_invalid_increment_state_is_rejected(self) -> None:
        text = self.source.replace("`DISCOVERY` |\n| INC-03", "`UNKNOWN` |\n| INC-03", 1)
        errors = self.validate_text(text)
        self.assertTrue(any("estado inválido no incremento INC-02" in error for error in errors))

    def test_duplicate_change_names_are_rejected(self) -> None:
        text = self.source.replace(
            "implement-participant-maintenance-mvp",
            "implement-participant-registration-mvp",
            1,
        )
        errors = self.validate_text(text)
        self.assertTrue(any("changes duplicadas entre increments" in error for error in errors))

    def test_nested_capability_plan_is_discovered(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            nested = root / "foundation" / "08-identity.md"
            nested.parent.mkdir()
            nested.write_text(self.source, encoding="utf-8")
            files, invalid = MODULE.markdown_files([str(root)])
            self.assertEqual(invalid, 0)
            self.assertEqual(files, [nested])
            self.assertEqual(MODULE.duplicate_capability_numbers(files), [])

    def test_duplicate_global_numbers_across_areas_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            first = root / "foundation" / "08-identity.md"
            second = root / "operations" / "08-shifts.md"
            first.parent.mkdir()
            second.parent.mkdir()
            first.write_text(self.source, encoding="utf-8")
            second.write_text(self.source, encoding="utf-8")
            errors = MODULE.duplicate_capability_numbers([first, second])
            self.assertTrue(any("numeração de plano duplicada 08" in error for error in errors))

    def test_unfilled_path_placeholder_is_rejected(self) -> None:
        text = self.source.replace("00-bancaflow-mvp-roadmap.md", "{{ROADMAP_RELATIVE_PATH}}", 1)
        errors = self.validate_text(text)
        self.assertTrue(any("placeholders de template não preenchidos" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
