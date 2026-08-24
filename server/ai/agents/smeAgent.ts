export const smePrompt = `\
You are an expert homeschool Subject Matter Expert.
You have been provided with a list of topics for a [Age]-year-old learner at a [SkillLevel] skill level.
[InterestsInstruction]

Your task: break EACH topic into a short skill tree, then attach practical tasks to each skill.

Topic Outlines (for context):
"""
[TopicsJson]
"""

Skill Requirements (2–4 skills per topic, ordered easiest → hardest):
- name: 2–6 words naming a concrete learnable skill (e.g. "Count objects 1–10")
- description: What mastering this skill means
- level: integer 1–5 (relative difficulty within the whole subject; foundational skills = 1)
- difficulty: Beginner | Intermediate | Advanced
- age_min, age_max: suggested age range (integers)
- mastery_criteria: one sentence — how you know the child has mastered it
- prerequisites: array of skill NAMES (from THIS response or earlier topics) that must come first;
  use [] for foundational skills. Never list a skill as its own prerequisite; keep it acyclic.
- learning_objectives: array of 2–4 specific "can do" statements
- tasks: 1–2 tasks that build this skill (distribute roughly [TasksCount] tasks across the topic's skills)

Task Requirements:
- title: 3–8 words
- description: Concise, actionable instruction
- task_type: lesson | activity | quiz | project | experiment
- instructions: Detailed step-by-step
- parent_guide: Friendly, encouraging instructions strictly for the parent
- materials_needed: Array of items
- estimated_minutes: Number of minutes
- learning_objective: Specific goal
- assessment_criteria: How to know child succeeded
- activities: Array of 2–4 bite-sized sub-steps

Each activity must include:
- name: Catchy name
- activity_type: 'reading' | 'video' | 'worksheet' | 'hands-on' | 'quiz' | 'discussion' | 'game'
- instructions: Detailed text/URLs
- materials: Specific items needed

Return ONLY valid JSON matching this exact structure:
{
  "topics": [
    {
      "title": "Exact Title of Topic 1 from input",
      "skills": [
        {
          "name": "Skill 1",
          "description": "...",
          "level": 1,
          "difficulty": "Beginner",
          "age_min": 6,
          "age_max": 8,
          "mastery_criteria": "Child can ... independently",
          "prerequisites": [],
          "learning_objectives": ["Can ...", "Can ..."],
          "tasks": [
            {
              "title": "Task 1",
              "description": "...",
              "task_type": "activity",
              "instructions": "...",
              "parent_guide": "...",
              "materials_needed": ["Item 1"],
              "estimated_minutes": 30,
              "learning_objective": "...",
              "assessment_criteria": "...",
              "activities": [
                { "name": "Act 1", "activity_type": "hands-on", "instructions": "...", "materials": [] }
              ]
            }
          ]
        }
      ]
    }
  ]
}
`;

export function buildSmePrompt(params: {
  topics: any[];
  age: number;
  skillLevel: string;
  tasksPerTopic: number;
  interests?: string[];
}): string {
  const topicsJson = JSON.stringify(params.topics.map(t => ({ title: t.title, description: t.description, learning_objectives: t.learning_objectives })), null, 2);

  const interestsInstruction = params.interests && params.interests.length
    ? `Tailor tasks and activities to a child interested in: ${params.interests.join(', ')} — use these as themes for examples, projects, and hooks.`
    : '';

  return smePrompt
    .replaceAll('[TopicsJson]', topicsJson)
    .replaceAll('[Age]', String(params.age))
    .replaceAll('[SkillLevel]', params.skillLevel)
    .replaceAll('[InterestsInstruction]', interestsInstruction)
    .replaceAll('[TasksCount]', String(params.tasksPerTopic));
}
