export const syllabusPrompt = `Below is a cleaner, generic version optimized for LLMs (Gemini, GPT, Claude). It focuses only on **Subject → Topics → Tasks**.

---

# Generic Homeschool Curriculum Generation Prompt

You are an expert homeschool curriculum designer specializing in creating structured, age-appropriate learning programs for children.

Your task is to generate a complete curriculum for the following subject.

**Subject Name:** \`[SubjectName]\`

**Age Group:** \`[AgeGroup]\`

The curriculum hierarchy is:

**Subject → Topic → Task**

The curriculum should be:

* Age-appropriate
* Developmentally appropriate
* Progressive from beginner to advanced
* Practical and engaging
* Suitable for homeschooling
* Easy for parents to teach
* Focused on mastery through gradual progression
* Based on real-world learning whenever applicable
* Hands-on and play-based whenever appropriate

---

## Topic Requirements

Generate **10 unique topics**.

Each topic should:

* Represent an important concept within the subject.
* Follow a logical learning sequence from foundational concepts to advanced concepts.
* Build upon previously learned topics.
* Avoid overlapping concepts.
* Together, cover the complete subject.

Each topic must include:

* **title** – Short and meaningful.
* **description** – Explain what the child will learn and what skills or understanding are expected after completing the topic.
* **difficulty_level**
  * Beginner
  * Intermediate
  * Advanced
* **age_group** – Use the provided age group.
* **learning_objectives** – An array of 2-3 specific learning outcomes.
* **estimated_hours** – Number of hours estimated to complete this topic (e.g., 2.5).
* **bloom_level** – Bloom's taxonomy level (e.g., remember, understand, apply, analyze, evaluate, create).
* **keywords** – Array of 3-5 relevant keywords for search and semantic grouping.

---

## Task Requirements

Generate **at least 10 unique tasks** for every topic.

Each task should:

* Be directly related to its topic.
* Represent one clear learning objective or activity.
* Progress from simple to more challenging within the topic.
* Reinforce the topic's learning outcomes.
* Be practical for homeschooling.
* Encourage understanding, practice, and real-life application where appropriate.
* Avoid duplicate or repetitive tasks.

Each task must include:

* **title** – Short and meaningful.
* **description** – A concise, actionable description explaining what the learner should do or achieve.
* **task_type** – One of: 'lesson', 'quiz', 'project', 'reading', 'worksheet', 'experiment', 'discussion'.
* **instructions** – Step-by-step numbered instructions for teaching this task. (Use newline characters \\n to separate steps).
* **parent_guide** – Tips and advice for the parent/teacher facilitating the lesson.
* **materials_needed** – An array of strings representing items needed (e.g., ["pencil", "graph paper", "ruler"]).
* **estimated_minutes** – Integer representing estimated time to complete (e.g., 30).
* **learning_objective** – The specific goal of this task.
* **assessment_criteria** – A short explanation of how the parent will know the child has mastered this task.
* **resources** – An array of external resource objects, each containing:
  * \`type\`: 'video', 'article', 'pdf', or 'link'.
  * \`url\`: A realistic placeholder URL (e.g., "https://www.youtube.com/watch?v=placeholder" or "https://example.com/worksheet.pdf").
  * \`title\`: Title of the resource.

---

## Writing Style

Use:

* Short, clear titles
* Simple, parent-friendly language
* Action-oriented descriptions
* Practical learning objectives
* Consistent terminology throughout the curriculum

Avoid:

* Long explanations
* Educational theory
* Placeholder text
* Generic descriptions
* Duplicate topics or tasks
* Complex or unrealistic activities

---

## Output Format

Return **only valid JSON**.

\`\`\`json
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
\`\`\`

Do not include markdown, explanations, comments, or any text outside the JSON.
`;