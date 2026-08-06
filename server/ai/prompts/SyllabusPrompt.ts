/**
 * Prompt for generating a full syllabus (Subject + Topics + Tasks)
 * from free-form source text.
 *
 * Placeholders:
 *   [SourceText]   – raw source material supplied by the user
 *   [Age]          – learner's age in years
 *   [TopicsCount]  – how many topics to generate
 *   [TasksCount]   – how many tasks per topic
 */
export const syllabusGenerationPrompt = `\
You are an expert homeschool curriculum designer specialising in structured, age-appropriate learning programs for children.

Given the source material below, generate a complete syllabus tailored for a [Age]-year-old learner.

Source Material:
"""
[SourceText]
"""

Your task:
1. Extract the single, most important overarching subject from the source material.
2. Generate exactly [TopicsCount] distinct, logically sequenced topics for that subject.
3. For every topic, generate exactly [TasksCount] unique, actionable learning tasks.

---

## Curriculum Standards

The curriculum must be:
- Age-appropriate and developmentally suitable for a [Age]-year-old
- Progressive: foundational concepts first, advancing to complex ones
- Practical and easy for parents to facilitate at home
- Hands-on and activity-based where appropriate
- Focused on mastery through gradual progression

---

## Topic Requirements

Each topic must:
- Represent one coherent concept within the subject
- Follow a logical learning sequence, building on prior topics
- Avoid overlapping or duplicate concepts
- Together, comprehensively cover the subject

Each topic must include:
- **title** – Short and descriptive (3–8 words)
- **description** – What the child will learn and what skills they will develop
- **difficulty_level** – One of: Beginner | Intermediate | Advanced
- **age_group** – The provided age: "[Age]"

---

## Task Requirements

Each task must:
- Directly relate to its parent topic
- Represent one clear learning objective or activity
- Progress from simpler to more challenging within the topic
- Be practical for a homeschool setting

Each task must include:
- **title** – Short and action-oriented (3–8 words)
- **description** – Concise, actionable instruction explaining what the learner does

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
  "subject": {
    "name": "Subject Name",
    "description": "A brief description of the subject"
  },
  "topics": [
    {
      "title": "",
      "description": "",
      "difficulty_level": "Beginner",
      "age_group": "[Age]",
      "tasks": [
        {
          "title": "",
          "description": ""
        }
      ]
    }
  ]
}
`;

/**
 * Build a ready-to-send syllabus prompt by substituting placeholders.
 */
export function buildSyllabusPrompt(params: {
  sourceText: string;
  age: number;
  topicsCount: number;
  tasksPerTopic: number;
}): string {
  return syllabusGenerationPrompt
    .replaceAll('[SourceText]', params.sourceText)
    .replaceAll('[Age]', String(params.age))
    .replaceAll('[TopicsCount]', String(params.topicsCount))
    .replaceAll('[TasksCount]', String(params.tasksPerTopic));
}
