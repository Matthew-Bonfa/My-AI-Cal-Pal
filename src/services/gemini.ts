import { MacroData } from '../navigation/types';

/**
 * Configure your Gemini API Key.
 * In Expo, you can define EXPO_PUBLIC_GEMINI_API_KEY in a .env file.
 */
const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';

const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * System prompt strictly constraining the model to act as an expert sports nutritionist
 * and respond only with valid JSON containing calories, protein, carbs, and fat.
 */
const SYSTEM_INSTRUCTION = `
You are an expert sports nutritionist, macro-tracking specialist, and precision dietary analyst.
Your objective: Estimate the macronutrient breakdown and caloric energy of the food pictured, meticulously incorporating any user-provided textual context, serving sizes, portion descriptions, and ingredient weights (e.g., "150g raw chicken breast, 300g cooked white rice").

Rules:
1. Prioritize precise weight and portion details stated in the user text over visual estimation alone.
2. Return ONLY a single raw JSON object matching this exact schema:
   {
     "calories": number,
     "protein": number,
     "carbs": number,
     "fat": number
   }
3. The values must be non-negative numbers representing:
   - "calories": total energy in kilocalories (kcal)
   - "protein": total protein in grams (g)
   - "carbs": total carbohydrates in grams (g)
   - "fat": total dietary fat in grams (g)
4. Do NOT include markdown code blocks, backticks, comments, or any additional text.
`.trim();

/**
 * Strips data URI prefix if present (e.g., "data:image/jpeg;base64,...")
 */
function sanitizeBase64(base64: string): string {
  return base64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
}

/**
 * Analyzes a food image and user context using Gemini 1.5 Flash.
 *
 * @param base64Image - Base64 encoded string of the food image.
 * @param textContext - Additional user context describing portions, weights, or ingredients.
 * @param apiKeyOverride - Optional API key override if not using environment variables.
 * @returns Promise<MacroData> - The estimated calories, protein, carbs, and fat.
 */
export async function analyzeFoodMacros(
  base64Image: string,
  textContext: string,
  apiKeyOverride?: string
): Promise<MacroData> {
  const activeKey = apiKeyOverride || GEMINI_API_KEY;

  if (!activeKey || activeKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error(
      'Gemini API key is not configured. Please set EXPO_PUBLIC_GEMINI_API_KEY in your .env or pass a valid key.'
    );
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey}`;
  const cleanImage = sanitizeBase64(base64Image);

  const promptText = textContext.trim().length > 0
    ? `User meal context and ingredient weights:\n"${textContext.trim()}"\n\nPlease estimate the total calories and macronutrients for this meal.`
    : 'Please identify this food item and estimate its total calories and macronutrients.';

  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: cleanImage,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          calories: {
            type: 'NUMBER',
            description: 'Total energy in kcal',
          },
          protein: {
            type: 'NUMBER',
            description: 'Protein content in grams',
          },
          carbs: {
            type: 'NUMBER',
            description: 'Carbohydrates content in grams',
          },
          fat: {
            type: 'NUMBER',
            description: 'Total fat content in grams',
          },
        },
        required: ['calories', 'protein', 'carbs', 'fat'],
      },
      temperature: 0.1,
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Gemini API Error]', response.status, errorBody);
    throw new Error(
      `Gemini API request failed (${response.status}): ${errorBody || response.statusText}`
    );
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('No content returned from Gemini 1.5 Flash.');
  }

  try {
    const parsed = JSON.parse(rawText);

    return {
      calories: Math.round(Number(parsed.calories) || 0),
      protein: Math.round((Number(parsed.protein) || 0) * 10) / 10,
      carbs: Math.round((Number(parsed.carbs) || 0) * 10) / 10,
      fat: Math.round((Number(parsed.fat) || 0) * 10) / 10,
    };
  } catch (parseError) {
    console.error('[JSON Parse Error]', rawText, parseError);
    throw new Error('Failed to parse nutrition JSON from Gemini response.');
  }
}
