"""
supabase_client.py
Handles fetching and inserting data into the Supabase relational database.
"""
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY, CHILD_ID, logger

class SupabaseManager:
    def __init__(self):
        self.enabled = bool(SUPABASE_URL and SUPABASE_KEY)
        if self.enabled:
            self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        else:
            self.client = None

    def get_subjects_for_generation(self):
        """Fetches active subjects that have the 'needs_ai_generation' flag set to True."""
        if not self.enabled:
            return []
        res = self.client.table("subjects").select("id, name").eq("is_active", True).eq("needs_ai_generation", True).execute()
        return res.data

    def mark_subject_completed(self, subject_id: str):
        """Marks the subject as completed so it won't be processed again."""
        if not self.enabled:
            return
        self.client.table("subjects").update({"needs_ai_generation": False}).eq("id", subject_id).execute()

    def insert_topic(self, subject_id: str, title: str) -> str:
        """Inserts a topic and returns its ID."""
        res = self.client.table("topics").insert({
            "subject_id": subject_id,
            "title": title,
            "is_active": True,
            "order_index": 0
        }).execute()
        return res.data[0]["id"]

    def insert_task(self, topic_id: str, name: str, index: int) -> str:
        """Inserts a task and returns its ID."""
        res = self.client.table("tasks").insert({
            "topic_id": topic_id,
            "name": name,
            "source_type": "ai_generated",
            "is_active": True,
            "order_index": index
        }).execute()
        task_id = res.data[0]["id"]
        
        # Optional: Automatically assign this task to a child if CHILD_ID is set
        if CHILD_ID and CHILD_ID != "uuid-of-the-child-optional":
            try:
                self.client.table("task_progress").insert({
                    "task_id": task_id,
                    "child_id": CHILD_ID,
                    "learning_stage": "Introduced",
                    "learned_count": 0,
                    "target_count": 10,
                    "is_active": True,
                    "is_scheduled_this_week": False
                }).execute()
            except Exception as e:
                logger.error(f"Failed to assign task to child: {e}")
                
        return task_id

    def insert_activity(self, task_id: str, name: str, type_name: str, index: int) -> str:
        """Inserts an activity and returns its ID."""
        res = self.client.table("activities").insert({
            "task_id": task_id,
            "name": name,
            "type": type_name,
            "is_active": True,
            "order_index": index
        }).execute()
        return res.data[0]["id"]
