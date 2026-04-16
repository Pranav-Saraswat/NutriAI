import Groq from "groq-sdk";
import { env } from "../config/env.js";

const getSystemPrompt = (profileSummary) => `You are an AI Nutrition and Fitness Assistant.

RULE 1 - DOMAIN RESTRICTION
You ONLY answer questions related to:
* Nutrition
* Diet plans
* Weight loss
* Weight gain
* Muscle building
* Fitness and exercise
* Healthy lifestyle

If the user asks anything outside these topics, respond exactly with:
"I specialize only in nutrition and fitness. Please ask a health or diet related question."

RULE 2 - STRICT FORMATTING
All responses must follow structured formatting.
Use:
* Clear section headings
* Bullet points
* Tables for plans (diet plans, workout plans)

Never return long unstructured paragraphs.

USER PROFILE DATA:
${profileSummary}`;

const normalizeResponse = (content) => {
  if (typeof content === "string") return content.trim();
  if (!content) return "";
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : item?.text || item?.content || ""))
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return String(content).trim();
};

class LlmService {
  constructor() {
    this.client = env.groqApiKey ? new Groq({ apiKey: env.groqApiKey }) : null;
  }

  buildMessages(userMessage, profileSummary, chatHistory = []) {
    const messages = [{ role: "system", content: getSystemPrompt(profileSummary) }];
    for (const message of chatHistory.slice(-10)) {
      messages.push({ role: message.role, content: message.content });
    }
    if (!chatHistory.length) {
      messages.push({ role: "user", content: userMessage });
    }
    return messages;
  }

  async chat(userMessage, profileSummary, chatHistory = []) {
    if (!this.client) {
      return { success: false, error: "GROQ_API_KEY is missing. AI chat is unavailable." };
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: env.groqModel,
        messages: this.buildMessages(userMessage, profileSummary, chatHistory),
        temperature: 0.7,
        max_tokens: 600,
        stream: false,
      });

      const response = normalizeResponse(completion.choices?.[0]?.message?.content);
      if (!response) {
        return { success: false, error: "The AI service returned an empty response." };
      }
      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message || "AI request failed" };
    }
  }

  async chatStream(userMessage, profileSummary, chatHistory = [], onToken = () => {}) {
    if (!this.client) {
      return { success: false, error: "GROQ_API_KEY is missing. AI chat is unavailable." };
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: env.groqModel,
        messages: this.buildMessages(userMessage, profileSummary, chatHistory),
        temperature: 0.7,
        max_tokens: 600,
        stream: true,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const token = chunk.choices?.[0]?.delta?.content || "";
        if (token) {
          fullResponse += token;
          onToken(token);
        }
      }

      if (!fullResponse.trim()) {
        return { success: false, error: "The AI service returned an empty response." };
      }

      return { success: true, response: fullResponse.trim() };
    } catch (error) {
      return { success: false, error: error.message || "AI stream failed" };
    }
  }
}

export const llmService = new LlmService();
