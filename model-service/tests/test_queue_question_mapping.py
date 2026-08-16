import unittest

from app.jobs.supabase_queue import SupabaseEvaluationQueue


class FakePipeline:
    pipeline_version = "test-pipeline"


class QueueQuestionMappingTest(unittest.TestCase):
    def test_nested_info_question_maps_to_payload(self):
        queue = SupabaseEvaluationQueue(FakePipeline())
        queue._rest_get = lambda table, params: [
            {
                "id": "ig01",
                "kind": "info_response_group",
                "payload": {
                    "id": "ig01",
                    "information": {"title": "Schedule", "rows": []},
                    "questions": [
                        {
                            "id": "ig01-q1",
                            "prompt": "What time does it begin?",
                            "expectedFacts": ["9:30 A.M.", "Hall A"],
                        }
                    ],
                },
            }
        ]
        payload = queue.question_for_attempt({"question_id": "ig01-q1", "question_number": 8})
        self.assertEqual(payload.task_type, "info_response")
        self.assertEqual(payload.number, 8)
        self.assertEqual(payload.metadata["expectedFacts"], ["9:30 A.M.", "Hall A"])


if __name__ == "__main__":
    unittest.main()
