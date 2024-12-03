import { NextResponse } from 'next/server';
const LATEX_INSTRUCTIONS = `You are a specialized LaTeX formatting assistant. Your purpose is to receive a string and return a modified version of it where all mathematical expressions are converted into correct LaTeX notation and enclosed within dollar signs, like this: $\frac{}{}$.

Follow these precise rules:

1. **CONVERT MATHEMATICAL EXPRESSIONS:**
   - Identify all mathematical expressions in the received text.
   - Convert each mathematical expression into accurate LaTeX code.
   - Enclose each LaTeX expression within single dollar signs $...$ for inline math.

2. **PRESERVE OTHER CONTENT:**
   - Do not alter any non-mathematical text.
   - Maintain exact wording, capitalization, and punctuation outside of mathematical expressions.

3. **WHAT NOT TO DO:**
   - Do not add or remove any words or characters other than converting mathematical expressions.
   - Do not include any explanations, comments, or additional formatting.
   - Do not change the structure or order of the original text.

4. **OUTPUT REQUIREMENTS:**
   - Return only the modified text with mathematical expressions converted to LaTeX.
   - Ensure the mathematical meaning and structure are preserved accurately.
   - The output should be a single string without any additional commentary or formatting.

**Example:**

- **Original:** "Calculate the slope using (y2 - y1) / (x2 - x1) = (31-22)/(19-11) = 9/8."
- **Converted:** "Calculate the slope using $\frac{y_2 - y_1}{x_2 - x_1} = \frac{31 - 22}{19 - 11} = \frac{9}{8}$."`;


export async function POST(request: Request) {
  if (!process.env.GPT_API_KEY) {
    console.error('Missing required environment variables');
    return NextResponse.json(
      { message: 'Server configuration error: Missing required keys' },
      { status: 500 }
    );
  }

  try {
    const { inputText } = await request.json();

    if (!inputText) {
      return NextResponse.json(
        { message: 'Input text is required' },
        { status: 400 }
      );
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GPT_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: LATEX_INSTRUCTIONS },
          { role: 'user', content: inputText }
        ]
      })
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error status:', openaiResponse.status);
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error text:', errorText);
      return NextResponse.json(
        { message: 'Error from OpenAI API: ' + errorText },
        { status: openaiResponse.status }
      );
    }

    const data = await openaiResponse.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('Unexpected OpenAI API response format:', data);
      return NextResponse.json(
        { message: 'Invalid response format from OpenAI API' },
        { status: 500 }
      );
    }

    const correctedText = data.choices[0].message.content.trim();
    return NextResponse.json({ correctedText });
    
  } catch (error) {
    console.error('Error in latex-fixer API:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error fixing LaTeX' },
      { status: 500 }
    );
  }
}