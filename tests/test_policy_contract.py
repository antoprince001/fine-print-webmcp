"""Contract checks for FinePrint's machine-readable in-page policy."""

import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
POLICY_MATCH = re.search(
    r'<script id="fineprint-policy" type="application/json">\s*(.*?)\s*</script>',
    INDEX,
    re.DOTALL,
)


class PolicyContractTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(POLICY_MATCH, "The in-page policy declaration is missing.")
        self.policy = json.loads(POLICY_MATCH.group(1))

    def test_policy_covers_all_five_traps(self):
        required_choices = {
            "cookie-accept",
            "terms-row",
            "trial-btn",
            "permissions-allow",
            "upgrade-cta",
        }
        self.assertTrue(required_choices.issubset(self.policy["elements"]))

    def test_every_declared_choice_has_a_complete_consequence_shape(self):
        expected = {
            "dataShared",
            "moneyCommitted",
            "recurringCharge",
            "reversible",
            "timeLimit",
        }
        for element_id, entry in self.policy["elements"].items():
            with self.subTest(element_id=element_id):
                self.assertEqual(set(entry["consequences"]), expected)
                self.assertIsInstance(entry["clauses"], list)
                self.assertTrue(entry["clauses"])


if __name__ == "__main__":
    unittest.main()
