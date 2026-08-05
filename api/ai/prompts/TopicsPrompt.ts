/**
 * Prompt for generating Topics (and their tasks) for a given Subject.
 *
 * Placeholders:
 *   [SubjectName]   – name of the subject
 *   [AgeGroup]      – learner's age group (e.g. "3-5" or "10")
 *   [TopicsCount]   – how many topics to generate
 *   [TasksCount]    – how many tasks per topic
 */
export const topicsGenerationPrompt = `\
You are an expert homeschool curriculum designer specialising in structured, age-appropriate learning programs for children.

Your task is to generate a complete set of topics and tasks for the following subject.

**Subject Name:** [SubjectName]
**Age Group:** [AgeGroup]

The curriculum hierarchy is: Subject → Topic → Task

---

## Curriculum Standards

The curriculum must be:
- Age-appropriate and developmentally suitable for age [AgeGroup]
- Progressive: foundational concepts first, advancing to complex ones
- Practical and easy for parents to facilitate at home
- Hands-on and activity-based where appropriate
- Focused on mastery through gradual progression

---

## Topic Requirements

Generate exactly [TopicsCount] unique topics.

Each topic must:
- Represent one coherent concept within [SubjectName]
- Follow a logical learning sequence, building on prior topics
- Avoid overlapping or duplicate concepts
- Together, comprehensively cover [SubjectName]

Each topic must include:
- **title** – Short and descriptive (3–8 words)
- **description** – What the child will learn and what skills they will develop
- **difficulty_level** – One of: Beginner | Intermediate | Advanced
- **age_group** – The provided age group: "[AgeGroup]"
- **learning_objectives** – An array of 2-3 specific learning outcomes
- **estimated_hours** – Number of hours estimated to complete this topic (e.g., 2.5)
- **bloom_level** – Bloom's taxonomy level
- **keywords** – Array of 3-5 relevant keywords

---

## Task Requirements

Generate exactly [TasksCount] unique tasks per topic.

Each task must:
- Directly relate to its parent topic
- Represent one clear learning objective or activity
- Progress from simpler to more challenging within the topic
- Be practical for a homeschool setting
- Reinforce the topic's learning outcomes

Each task must include:
- **title** – Short and action-oriented (3–8 words)
- **description** – Concise, actionable instruction (1–2 sentences) explaining exactly what the learner does
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
- Action-oriented task descriptions
- Consistent terminology throughout

Avoid:
- Educational jargon or theory
- Placeholder or generic text
- Duplicate topic or task titles
- Complex or unrealistic activities

---

## Progression Stages (apply across topics in order)
1. Introduction → 2. Recognition → 3. Understanding → 4. Practice →
5. Application → 6. Problem Solving → 7. Independent Learning → 8. Mastery

---

## Output Format

Return ONLY valid JSON — no markdown, no comments, no extra text.

{
  "subject": "[SubjectName]",
  "age_group": "[AgeGroup]",
  "topics": [
    {
      "title": "",
      "description": "",
      "difficulty_level": "Beginner",
      "age_group": "[AgeGroup]",
      "learning_objectives": [""],
      "estimated_hours": 2.5,
      "bloom_level": "understand",
      "keywords": [""],
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
  ]
}
`;

/**
 * Build a ready-to-send topics prompt by substituting placeholders.
 */
export function buildTopicsPrompt(params: {
  subjectName: string;
  ageGroup: string;
  topicsCount?: number;
  tasksPerTopic?: number;
}): string {
  const topicsCount = params.topicsCount ?? 10;
  const tasksPerTopic = params.tasksPerTopic ?? 10;
  return topicsGenerationPrompt
    .replaceAll('[SubjectName]', params.subjectName)
    .replaceAll('[AgeGroup]', params.ageGroup)
    .replaceAll('[TopicsCount]', String(topicsCount))
    .replaceAll('[TasksCount]', String(tasksPerTopic));
}
