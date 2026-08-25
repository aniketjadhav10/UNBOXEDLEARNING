// Prompt for AI-assessed standards coverage: given a framework + grade + subject
// and the child's current skills, list the expected standards and judge which are
// covered vs. missing. Avoids a giant static standards catalog.
export function buildStandardsPrompt(params: {
  framework: string;
  grade: string;
  subject: string;
  skillNames: string[];
}): string {
  const skills = params.skillNames.length
    ? params.skillNames.map((s) => `- ${s}`).join('\n')
    : '- (none yet)';

  return `You are a curriculum standards auditor.
For the "${params.framework}" framework at the "${params.grade}" level, subject "${params.subject}",
list the key learning standards a student is expected to master (aim for 8–15 concrete standards).
Then judge which are already covered by the child's CURRENT skills below, and which are gaps.

Child's current skills:
${skills}

Match generously by meaning, not exact wording. Return ONLY valid JSON:
{
  "coverage_pct": 0,                         // integer 0–100 = covered / total expected
  "covered": [ { "standard": "Standard text", "skill": "matched skill name" } ],
  "gaps": [ "Expected standard not yet covered" ]
}`;
}
