import { ai, MODEL_NAME } from './server/ai/aiClient.ts';

async function test() {
  try {
    const formattedMessages = [
      { role: 'user', parts: [{ text: 'What tasks do I have for math?' }] }
    ];

    const reqConfig: any = {
      systemInstruction: 'You are a helpful educational AI assistant.',
      tools: [
        {
          functionDeclarations: [
            {
              name: 'save_user_memory',
              description: 'Saves an important fact.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  fact: {
                    type: 'STRING',
                    description: 'The distinct fact to remember'
                  }
                },
                required: ['fact']
              }
            },
            {
              name: 'search_curriculum_tasks',
              description: 'Searches all curriculum tasks.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  query: {
                    type: 'STRING'
                  }
                },
                required: ['query']
              }
            }
          ]
        }
      ]
    };

    console.log('Testing generateContent...');
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: formattedMessages,
      config: reqConfig
    });

    console.log('Response:', response.text);
    console.log('Function calls:', response.functionCalls);

    if (response.functionCalls && response.functionCalls.length > 0) {
      formattedMessages.push({
        role: 'model',
        parts: response.candidates?.[0]?.content?.parts || [] // MUST pass the exact parts!
      });

      formattedMessages.push({
        role: 'user', // TESTING IF 'user' gives text
        parts: response.functionCalls.map(fc => ({
          functionResponse: { name: fc.name, response: { result: 'Found math tasks' } }
        }))
      });

      const followUp = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: formattedMessages,
        config: reqConfig // MUST passing tools in followUp too!
      });
      console.log('Follow up response text:', followUp.text);
      console.log('Follow up response parts:', JSON.stringify(followUp.candidates?.[0]?.content?.parts, null, 2));
    }

  } catch (err) {
    console.error('Error in test:', err);
  }
}

test();
