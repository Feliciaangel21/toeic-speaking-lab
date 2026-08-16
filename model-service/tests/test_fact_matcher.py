import unittest

from app.scorers.facts import fact_match, match_expected_facts
from app.scorers.calibrator import info_score


class FactMatcherTest(unittest.TestCase):
    def test_exact_fact(self):
        matched, confidence = fact_match("Conference Room B", "It will be held in Conference Room B at 3 p.m.")
        self.assertTrue(matched)
        self.assertGreaterEqual(confidence, 0.8)

    def test_missing_fact(self):
        result = match_expected_facts(["$25", "Room 204"], "It costs twenty five dollars.")
        self.assertIn("Room 204", result["missing"])

    def test_llm_does_not_directly_set_score(self):
        llm = {
            "supported": ["Tuesday", "2:30 PM"],
            "missing": ["August 18"],
            "contradicted": [],
            "ambiguous": [],
            "confidence": 0.9,
        }
        score, _, components = info_score(2 / 3, llm)
        self.assertIn(score, {2, 3})
        self.assertLessEqual(components["combined"], 1.0)


if __name__ == "__main__":
    unittest.main()
