"""
generator.py
Contains the logic to build hierarchical prompts, call the Gemini client, and save output.
"""
import os
import json
from datetime import datetime
from gemini_client import GeminiClient
from supabase_client import SupabaseManager
from config import OUTPUT_DIR, logger

# --- PROMPT TEMPLATES ---

TOPIC_PROMPT = """
Generate exactly 2 high-level topics to learn for the subject: "{subject}".
The output must be EXACTLY this JSON format:
{{
  "topics": ["String", "String"]
}}
Return ONLY valid JSON.
"""

TASK_PROMPT = """
Generate exactly 3 specific, actionable tasks to master the topic: "{topic}" (which falls under "{subject}").
The output must be EXACTLY this JSON format:
{{
  "tasks": ["String", "String", "String"]
}}
Return ONLY valid JSON.
"""

ACTIVITY_PROMPT = """
Generate exactly 3 hands-on activities to complete the learning task: "{task}" (under the topic "{topic}").
Each activity must have a name and a type (e.g., "Reading", "Video", "Quiz", "Practice", "Project").
The output must be EXACTLY this JSON format:
{{
  "activities": [
    {{
      "name": "String",
      "type": "String"
    }},
    {{
      "name": "String",
      "type": "String"
    }},
    {{
      "name": "String",
      "type": "String"
    }}
  ]
}}
Return ONLY valid JSON.
"""

class CurriculumGenerator:
    def __init__(self):
        self.client = GeminiClient()
        self.db = SupabaseManager()
        os.makedirs(OUTPUT_DIR, exist_ok=True)

    def generate_and_save(self):
        """
        Executes the hierarchical generation: Subjects -> Topics -> Tasks -> Activities.
        """
        logger.info("Starting hierarchical generation process...")
        
        if not self.db.enabled:
            logger.error("Supabase must be configured to fetch subjects for the pipeline. Aborting.")
            return False

        subjects = self.db.get_subjects_for_generation()
        if not subjects:
            logger.warning("No subjects found requiring AI generation (needs_ai_generation=True).")
            return False

        # Store everything for a final markdown dump
        full_curriculum = []

        for subject in subjects:
            subject_id = subject["id"]
            subject_name = subject["name"]
            logger.info(f"Processing Subject: {subject_name}")
            
            subject_data = {"subject": subject_name, "topics": []}

            # 1. Generate Topics
            topics_data = self.client.generate_json_response(TOPIC_PROMPT.format(subject=subject_name))
            topics_list = topics_data.get("topics", [])
            
            for topic_name in topics_list:
                logger.info(f"  -> Generated Topic: {topic_name}")
                topic_id = self.db.insert_topic(subject_id, topic_name)
                topic_data = {"topic": topic_name, "tasks": []}
                
                # 2. Generate Tasks for this Topic
                tasks_data = self.client.generate_json_response(TASK_PROMPT.format(topic=topic_name, subject=subject_name))
                tasks_list = tasks_data.get("tasks", [])
                
                for t_idx, task_name in enumerate(tasks_list):
                    logger.info(f"    -> Generated Task: {task_name}")
                    task_id = self.db.insert_task(topic_id, task_name, t_idx)
                    task_data = {"task": task_name, "activities": []}
                    
                    # 3. Generate Activities for this Task
                    acts_data = self.client.generate_json_response(ACTIVITY_PROMPT.format(task=task_name, topic=topic_name))
                    acts_list = acts_data.get("activities", [])
                    
                    for a_idx, act_obj in enumerate(acts_list):
                        act_name = act_obj.get("name", "Untitled")
                        act_type = act_obj.get("type", "General")
                        logger.info(f"      -> Generated Activity: {act_name} ({act_type})")
                        
                        self.db.insert_activity(task_id, act_name, act_type, a_idx)
                        task_data["activities"].append(act_obj)
                    
                    topic_data["tasks"].append(task_data)
                
                subject_data["topics"].append(topic_data)
            
            # Mark the subject as completed so it isn't regenerated continuously
            self.db.mark_subject_completed(subject_id)
            logger.info(f"Finished generating curriculum for Subject: {subject_name}")
            
            full_curriculum.append(subject_data)

        # Save local records
        self._save_local_files(full_curriculum)
        logger.info("Hierarchical generation and database insertion complete!")
        return True

    def _save_local_files(self, curriculum: list):
        """Saves a JSON and Markdown backup of the generated run."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        json_path = os.path.join(OUTPUT_DIR, f"run_{timestamp}.json")
        md_path = os.path.join(OUTPUT_DIR, f"run_{timestamp}.md")
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(curriculum, f, indent=2)
            
        md_lines = ["# Curriculum Generation Run\n"]
        for sub in curriculum:
            md_lines.append(f"## Subject: {sub['subject']}\n")
            for topic in sub["topics"]:
                md_lines.append(f"### Topic: {topic['topic']}")
                for task in topic["tasks"]:
                    md_lines.append(f"#### Task: {task['task']}")
                    for act in task["activities"]:
                        md_lines.append(f"  - [ ] **{act['type']}**: {act['name']}")
                md_lines.append("")
                
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write("\n".join(md_lines))
        logger.info(f"Saved local backups to {OUTPUT_DIR}")
