export const directorPrompt = `\
You are an expert homeschool curriculum director. 
Given the source material, generate a high-level curriculum outline for a [Age]-year-old learner at a [SkillLevel] skill level.
[TargetGradeInstruction]

Source Material:
"""
[SourceText]
"""

Your task:
1. Extract the single overarching subject.
2. Generate exactly [TopicsCount] distinct, logically sequenced topics for that subject.

Topic Requirements:
- Represent one coherent concept
- Follow a logical learning sequence
- Title: 3–8 words
- Description: What the child will learn
- difficulty_level: Beginner | Intermediate | Advanced
- learning_objectives: Array of 2-3 specific outcomes
- estimated_hours: Number of hours
- bloom_level: Highest Bloom's level reached (e.g., Apply)
- keywords: 3-5 vocabulary words

Return ONLY valid JSON matching this structure:
{
  "subject": {
    "name": "Subject Name",
    "description": "A brief description of the subject"
  },
  "topics": [
    {
      "title": "Topic Title",
      "description": "Topic description",
      "difficulty_level": "Beginner",
      "age_group": "[Age]",
      "learning_objectives": ["Obj 1", "Obj 2"],
      "estimated_hours": 2,
      "bloom_level": "Apply",
      "keywords": ["word1", "word2"]
    }
  ]
}
`;

export function buildDirectorPrompt(params: {
  sourceText: string;
  age: number;
  skillLevel: string;
  targetGrade: string | null;
  topicsCount: number;
}): string {
  const targetGradeInstruction = params.targetGrade
    ? `\nIMPORTANT: Align with standard curriculum requirements for **${params.targetGrade}**.`
    : '';

  return directorPrompt
    .replaceAll('[SourceText]', params.sourceText)
    .replaceAll('[Age]', String(params.age))
    .replaceAll('[SkillLevel]', params.skillLevel)
    .replaceAll('[TargetGradeInstruction]', targetGradeInstruction)
    .replaceAll('[TopicsCount]', String(params.topicsCount));
}
