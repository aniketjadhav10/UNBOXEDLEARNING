import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { allowMethods, readString, sendError } from '../../src/lib/api-utils/http.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['POST'])) return;

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const topic = readString(req.body?.topic, 'topic');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Create concise homeschool lessons. Return JSON with title, summary, objectives, activities, and assessment.',
        },
        {
          role: 'user',
          content: `Generate a beginner-friendly lesson for this topic: ${topic}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message.content;
    if (!raw) throw new Error('OpenAI returned an empty lesson');

    const lesson = JSON.parse(raw) as {
      title: string;
      summary: string;
      objectives: string[];
      activities: string[];
      assessment: string;
    };

    res.status(200).json({ lesson });
  } catch (error) {
    sendError(res, error, 500);
  }
}
