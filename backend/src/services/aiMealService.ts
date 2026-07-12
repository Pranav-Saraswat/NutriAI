import Groq from "groq-sdk";
import { env } from "../config/env.js";

export interface IFoodItemEstimate {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionSize: string;
  confidence: number;
}

export interface IMealAnalysisResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidenceScore: number;
  items: IFoodItemEstimate[];
  notes?: string;
}

export interface IAiMealService {
  analyzeMealImage(base64Image: string, mimeType: string): Promise<{ success: boolean; data?: IMealAnalysisResult; error?: string }>;
  analyzeMealText(description: string): Promise<{ success: boolean; data?: IMealAnalysisResult; error?: string }>;
}

const VISION_SYSTEM_PROMPT = `You are a professional nutrition expert. Analyze the uploaded food image and provide an estimation of the calorie and macro (protein, carbs, fat) content of the meal.
Identify the food items, provide portion size estimates, and give your confidence scores.

You must respond with a raw JSON object and nothing else. Do not include markdown code block formatting (such as \`\`\`json ... \`\`\`). The JSON object must match this schema strictly:
{
  "name": "General description of the meal (e.g., Grilled Chicken Breast with Brown Rice)",
  "calories": Total calories estimated (integer),
  "protein": Total protein in grams (integer),
  "carbs": Total carbohydrates in grams (integer),
  "fat": Total fat in grams (integer),
  "confidenceScore": Overall confidence score from 0.0 to 1.0,
  "items": [
    {
      "name": "Name of individual food item or ingredient",
      "calories": Calories estimated (integer),
      "protein": Protein in grams (integer),
      "carbs": Carbs in grams (integer),
      "fat": Fat in grams (integer),
      "portionSize": "Portion size description (e.g., 150g, 1 cup, 2 slices)",
      "confidence": Confidence score for this item from 0.0 to 1.0
    }
  ],
  "notes": "Any culinary notes, assumed cooking oils, dressing info, or hidden ingredients"
}`;

const TEXT_SYSTEM_PROMPT = `You are a professional nutrition expert. Estimate the calorie and macro (protein, carbs, fat) content of the meal described in the user's text.
Identify the food items, estimate portion sizes based on normal servings, and supply your confidence scores.

You must respond with a raw JSON object and nothing else. Do not include markdown code block formatting (such as \`\`\`json ... \`\`\`). The JSON object must match this schema strictly:
{
  "name": "General description of the meal",
  "calories": Total calories estimated (integer),
  "protein": Total protein in grams (integer),
  "carbs": Total carbohydrates in grams (integer),
  "fat": Total fat in grams (integer),
  "confidenceScore": Overall confidence score from 0.0 to 1.0,
  "items": [
    {
      "name": "Name of individual food item or ingredient",
      "calories": Calories estimated (integer),
      "protein": Protein in grams (integer),
      "carbs": Carbs in grams (integer),
      "fat": Fat in grams (integer),
      "portionSize": "Portion size description",
      "confidence": Confidence score from 0.0 to 1.0
    }
  ],
  "notes": "Any estimations, notes on generic assumptions, or macro logic used"
}`;

class AiMealService implements IAiMealService {
  private getClient(): Groq | null {
    return env.groqApiKey ? new Groq({ apiKey: env.groqApiKey }) : null;
  }

  async analyzeMealImage(
    base64Image: string,
    mimeType: string
  ): Promise<{ success: boolean; data?: IMealAnalysisResult; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: "GROQ_API_KEY is missing. AI Vision analysis is unavailable." };
    }

    try {
      const response = await client.chat.completions.create({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: VISION_SYSTEM_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        return { success: false, error: "Empty response from AI vision service" };
      }

      const parsed: IMealAnalysisResult = JSON.parse(content.trim());
      return { success: true, data: parsed };
    } catch (error: any) {
      console.error("AI image analysis failed:", error);
      return {
        success: false,
        error: error.message || "Failed to analyze image with AI model",
      };
    }
  }

  async analyzeMealText(
    description: string
  ): Promise<{ success: boolean; data?: IMealAnalysisResult; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: "GROQ_API_KEY is missing. AI text analysis is unavailable." };
    }

    try {
      const response = await client.chat.completions.create({
        model: env.groqModel,
        messages: [
          { role: "system", content: TEXT_SYSTEM_PROMPT },
          { role: "user", content: `Please analyze this meal: "${description}"` },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        return { success: false, error: "Empty response from AI text service" };
      }

      const parsed: IMealAnalysisResult = JSON.parse(content.trim());
      return { success: true, data: parsed };
    } catch (error: any) {
      console.error("AI text analysis failed:", error);
      return {
        success: false,
        error: error.message || "Failed to analyze meal text with AI model",
      };
    }
  }
}

export const aiMealService = new AiMealService();
