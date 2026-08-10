export async function executeLLMCall(
  prompt: string,
  context?: any
): Promise<{ text: string; sentiment?: string; should_continue?: string }> {
  const apiKey = process.env.GROQ_API_KEY;

  if (apiKey) {
    try {
      const fullPrompt = context
        ? `Context: ${JSON.stringify(context)}\n\nPrompt: ${prompt}`
        : prompt;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content:
                'You are an AI workflow step processor. Return structured JSON with keys: text (string), sentiment (positive/negative/neutral), should_continue ("yes" or "no").',
            },
            { role: 'user', content: fullPrompt },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            text: parsed.text || content,
            sentiment: parsed.sentiment || 'positive',
            should_continue: parsed.should_continue || 'yes',
          };
        }
      }
    } catch (err) {
      console.warn('[LLM Error, falling back to stub]:', err);
    }
  }

  // STUB PATH — 1.5s artificial delay, deterministic response, logged as [STUBBED]
  console.log('[STUBBED] Executing LLM Call with prompt:', prompt);
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return {
    text: `[STUBBED LLM Response] Completed task for prompt: "${prompt}". Context summary: ${
      context ? JSON.stringify(context).slice(0, 100) : 'none'
    }`,
    sentiment: 'positive',
    should_continue: 'yes',
  };
}
