/**
 * Prompt for generating a full syllabus (Subject + Topics + Tasks + Activities)
 * from free-form source text.
 *
 * Placeholders:
 *   [SourceText]   – raw source material supplied by the user
 *   [Age]          – learner's age in years
 *   [SkillLevel]   – learner's skill level (Beginner, Intermediate, Advanced)
 *   [TargetGrade]  – (Optional) Standard curriculum grade to map against
 *   [TopicsCount]  – how many topics to generate
 *   [TasksCount]   – how many tasks per topic
 */
export const syllabusGenerationPrompt = `\
You are an expert homeschool curriculum designer specialising in structured, age-appropriate learning programs for children.

Given the source material below, generate a complete syllabus tailored for a [Age]-year-old learner who is at a **[SkillLevel]** skill level for this subject.
[TargetGradeInstruction]

Source Material:
"""
[SourceText]
"""

Your task:
1. Extract the single, most important overarching subject from the source material.
2. Generate exactly [TopicsCount] distinct, logically sequenced topics for that subject.
3. For every topic, generate exactly [TasksCount] unique, actionable learning tasks.

---

## Curriculum Standards & Teaching Methodologies

The curriculum must be:
- Developmentally suitable for a [Age]-year-old learner.
- Appropriately paced for a **[SkillLevel]** student.
- Progressive: foundational concepts first, advancing to complex ones.
- Practical and easy for parents to facilitate at home.
- Hands-on and activity-based where appropriate.

You must implicitly combine the best elements of the following teaching methodologies:
- **Montessori:** Encourage self-directed activity, hands-on learning, and collaborative play.
- **Waldorf:** Integrate arts, imagination, and practical skills.
- **Reggio Emilia:** Use the environment as the third teacher and encourage exploration.
- **Traditional & Blended:** Ensure strong foundational structure and measurable outcomes.

You must also ensure the syllabus covers all necessary concepts required by major global educational boards (including **IB, IGCSE, NIOS, CBSE, and Common Core**), ensuring the child does not miss any standard milestones.

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
- **learning_objectives** – Array of 2-3 specific learning outcomes
- **estimated_hours** – Number of hours required to complete the topic
- **bloom_level** – The highest Bloom's Taxonomy level reached (e.g. "Apply", "Analyze", "Create")
- **keywords** – Array of 3-5 important vocabulary words

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
- **task_type** – e.g., "lesson", "activity", "quiz", "project", "experiment"
- **instructions** – Detailed step-by-step instructions for the child
- **parent_guide** – Friendly, encouraging instructions strictly for the parent on how to teach, facilitate, or assess this task.
- **materials_needed** – Array of items required (if none, leave empty)
- **estimated_minutes** – Number of minutes to complete
- **learning_objective** – The specific goal of this task
- **assessment_criteria** – How the parent knows the child has succeeded
- **activities** – An array of 2-4 bite-sized, sequential sub-steps or activities that make up this task.

Each item in the **activities** array must include:
- **name** – A short, catchy name for the activity
- **activity_type** – Must be one of: 'reading', 'video', 'worksheet', 'hands-on', 'quiz', 'discussion', 'game'
- **instructions** – Detailed text instructions or reading material for this specific activity step (you can include URLs here if relevant)
- **materials** – Array of specific items needed just for this activity (if none, leave empty)

---

## Writing Style

Use:
- Simple, parent-friendly language
- Action-oriented task descriptions
- Consistent terminology throughout

Avoid:
- Educational jargon or theory (unless explained simply)
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
      "learning_objectives": ["", ""],
      "estimated_hours": 2,
      "bloom_level": "Apply",
      "keywords": ["", ""],
      "tasks": [
        {
          "title": "",
          "description": "",
          "task_type": "activity",
          "instructions": "",
          "parent_guide": "",
          "materials_needed": ["", ""],
          "estimated_minutes": 30,
          "learning_objective": "",
          "assessment_criteria": "",
          "activities": [
            {
              "name": "Watch introductory video",
              "activity_type": "video",
              "instructions": "Watch this short video to understand the core concept before we start. Search YouTube for: educational concept.",
              "materials": []
            },
            {
              "name": "Hands-on practice",
              "activity_type": "hands-on",
              "instructions": "Use the materials to build a physical model.",
              "materials": ["Scissors", "Paper"]
            }
          ]
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
  skillLevel: string;
  targetGrade: string | null;
  topicsCount: number;
  tasksPerTopic: number;
}): string {
  const targetGradeInstruction = params.targetGrade
    ? `\nIMPORTANT: The parent has requested this syllabus align with standard curriculum requirements for **${params.targetGrade}**. Please ensure milestones, vocabulary, and objectives map to ${params.targetGrade} standards, while keeping the homeschool flexibility.`
    : '';

  return syllabusGenerationPrompt
    .replaceAll('[SourceText]', params.sourceText)
    .replaceAll('[Age]', String(params.age))
    .replaceAll('[SkillLevel]', params.skillLevel)
    .replaceAll('[TargetGradeInstruction]', targetGradeInstruction)
    .replaceAll('[TopicsCount]', String(params.topicsCount))
    .replaceAll('[TasksCount]', String(params.tasksPerTopic));
}
