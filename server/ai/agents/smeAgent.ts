export const smePrompt = `\
You are an expert homeschool Subject Matter Expert.
You have been provided with a list of topics for a [Age]-year-old learner at a [SkillLevel] skill level.

Your task is to generate exactly [TasksCount] highly detailed, practical learning tasks for EACH topic provided.

Topic Outlines (for context):
"""
[TopicsJson]
"""

Task Requirements:
- Represent one clear learning objective
- Progress from simpler to more challenging
- Practical for a homeschool setting
- title: 3–8 words
- description: Concise, actionable instruction
- task_type: e.g., lesson, activity, quiz, project, experiment
- instructions: Detailed step-by-step
- parent_guide: Friendly, encouraging instructions strictly for the parent
- materials_needed: Array of items
- estimated_minutes: Number of minutes
- learning_objective: Specific goal
- assessment_criteria: How to know child succeeded
- activities: Array of 2-4 bite-sized sub-steps

Each activity must include:
- name: Catchy name
- activity_type: 'reading' | 'video' | 'worksheet' | 'hands-on' | 'quiz' | 'discussion' | 'game'
- instructions: Detailed text/URLs
- materials: Specific items needed

Return ONLY valid JSON matching this exact structure (return the array of topics with tasks added):
{
  "topics": [
    {
      "title": "Exact Title of Topic 1 from input",
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
            {
              "name": "Act 1",
              "activity_type": "hands-on",
              "instructions": "...",
              "materials": []
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
}): string {
  const topicsJson = JSON.stringify(params.topics.map(t => ({ title: t.title, description: t.description, learning_objectives: t.learning_objectives })), null, 2);

  return smePrompt
    .replaceAll('[TopicsJson]', topicsJson)
    .replaceAll('[Age]', String(params.age))
    .replaceAll('[SkillLevel]', params.skillLevel)
    .replaceAll('[TasksCount]', String(params.tasksPerTopic));
}
