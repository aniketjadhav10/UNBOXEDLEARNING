/**
 * Prompt for generating Tasks for a specific Topic within a Subject.
 *
 * Placeholders:
 *   [TopicName]    – name of the topic
 *   [SubjectName]  – name of the parent subject (optional context)
 *   [TasksCount]   – how many tasks to generate
 *   [AgeGroup]     – learner's age group (e.g. "3-5" or "10")
 */
export const tasksGenerationPrompt = `\
You are an expert homeschool curriculum designer specialising in structured, age-appropriate learning tasks for children.

Your task is to generate a focused set of learning tasks for the following topic.

**Topic:** [TopicName]
**Subject:** [SubjectName]
**Age Group:** [AgeGroup]

---

## Task Requirements

Generate exactly [TasksCount] unique, actionable tasks for this topic.

Each task must:
- Be directly and specifically related to "[TopicName]"
- Represent one clear learning objective or hands-on activity
- Progress from simpler to more challenging (beginner → advanced)
- Be practical for a parent to facilitate in a homeschool setting
- Reinforce the topic's learning outcomes
- Avoid duplication — each task should cover a distinct aspect of the topic

Each task must include:
- **title** – Short and action-oriented (3–8 words)
- **description** – Concise, actionable instruction (1–2 sentences) explaining exactly what the learner does or achieves
- **task_type** – One of: 'lesson', 'quiz', 'project', 'reading', 'worksheet', 'experiment', 'discussion'
- **instructions** – Step-by-step numbered instructions for teaching this task. (Use newline characters \\n to separate steps).
- **parent_guide** – Tips and advice for the parent/teacher facilitating the lesson.
- **materials_needed** – An array of strings representing items needed.
- **estimated_minutes** – Integer representing estimated time to complete (e.g., 30).
- **learning_objective** – The specific goal of this task.
- **assessment_criteria** – A short explanation of how the parent will know the child has mastered this task.
- **resources** – An array of external resource objects, each containing:
  - \`type\`: 'video', 'article', 'pdf', or 'link'.
  - \`url\`: A realistic placeholder URL.
  - \`title\`: Title of the resource.

---

## Writing Style

Use:
- Simple, parent-friendly language
- Present-tense, action-oriented descriptions ("Count objects…", "Draw a…", "Match the…")
- Consistent terminology aligned with the subject and topic

Avoid:
- Educational jargon or theory
- Placeholder or generic text ("Task 1", "Do something")
- Duplicate task titles
- Complex or unrealistic activities for the age group

---

## Progression Within the Topic
Tasks should flow through: Introduction → Practice → Application → Reinforcement → Challenge

---

## Output Format

Return ONLY valid JSON — no markdown, no comments, no extra text.

{
  "topic": "[TopicName]",
  "subject": "[SubjectName]",
  "age_group": "[AgeGroup]",
  "tasks": [
    {
      "title": "",
      "description": "",
      "task_type": "lesson",
      "instructions": "1. Do this.\\n2. Do that.",
      "parent_guide": "",
      "materials_needed": [""],
      "estimated_minutes": 30,
      "learning_objective": "",
      "assessment_criteria": "",
      "resources": [
        { "type": "video", "url": "...", "title": "..." }
      ]
    }
  ]
}
`;

/**
 * Build a ready-to-send tasks prompt by substituting placeholders.
 */
export function buildTasksPrompt(params: {
  topicName: string;
  subjectName?: string;
  tasksCount?: number;
  ageGroup?: string;
}): string {
  const tasksCount = params.tasksCount ?? 10;
  const subjectName = params.subjectName || 'General';
  const ageGroup = params.ageGroup || 'All ages';
  return tasksGenerationPrompt
    .replaceAll('[TopicName]', params.topicName)
    .replaceAll('[SubjectName]', subjectName)
    .replaceAll('[TasksCount]', String(tasksCount))
    .replaceAll('[AgeGroup]', ageGroup);
}
