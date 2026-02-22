import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getStockSentiment(symbol: string, news: string[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the sentiment for stock ${symbol} based on these news headlines: ${news.join(". ")}. Return a JSON object with: sentiment_score (-1 to 1), reason_tags (array of strings), and a brief summary.`,
    config: {
      responseMimeType: "application/json",
    }
  });
  return JSON.parse(response.text || "{}");
}

export async function validateTag(tag: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Check if the following tag is appropriate for a stock sentiment platform. It should not be illegal, advertising, spam, or contain personal contact info. Tag: "${tag}". Return a JSON object with: is_valid (boolean) and reason (string).`,
    config: {
      responseMimeType: "application/json",
    }
  });
  return JSON.parse(response.text || "{}");
}

export async function suggestStockTags(symbol: string, name: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Predict the industry, theme, and concept tags for the stock ${name} (${symbol}) based on market consensus. Return a JSON object with: tags (array of strings, max 5).`,
    config: {
      responseMimeType: "application/json",
    }
  });
  return JSON.parse(response.text || "{}");
}
