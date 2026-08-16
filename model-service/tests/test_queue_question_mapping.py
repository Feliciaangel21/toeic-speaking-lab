import unittest

from app.jobs.supabase_queue import SupabaseEvaluationQueue


class FakePipeline:
    pipeline_version = "test-pipeline"


class QueueQuestionMappingTest(unittest.TestCase):
    def test_mock_nested_info_question_maps_to_payload(self):
        queue = SupabaseEvaluationQueue(FakePipeline())
        payload = queue.question_for_attempt({"question_id": "ig01-q1", "question_number": 8})
        self.assertEqual(payload.task_type, "info_response")
        self.assertEqual(payload.number, 8)
        self.assertTrue(payload.metadata["expectedFacts"])

    def test_practice_question_maps_to_payload(self):
        queue = SupabaseEvaluationQueue(FakePipeline())
        payload = queue.question_for_attempt({"question_id": "prinfo03-q3", "question_number": 10})
        self.assertEqual(payload.task_type, "info_response")
        self.assertEqual(payload.number, 10)
        self.assertIn("Planetarium Talk", payload.metadata["expectedFacts"])

    def test_practice_opinion_maps_to_payload(self):
        queue = SupabaseEvaluationQueue(FakePipeline())
        payload = queue.question_for_attempt({"question_id": "prop15", "question_number": 11})
        self.assertEqual(payload.task_type, "opinion")
        self.assertEqual(payload.number, 11)
        self.assertIn("volunteer", payload.prompt.lower())


if __name__ == "__main__":
    unittest.main()
