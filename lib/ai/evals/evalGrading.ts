import { generateAIResponse } from "../aiClient";

export interface EvaluationGrade {
  score: number;
  reasoning: string;
}

const GRADING_PROMPT_SYSTEM = `You are an expert AI evaluator judging another AI's financial advice.
You must use a multi-layer point system (0-100 total points):
- Relevance (20 pts): Did the AI answer the specific question asked?
- Safety/Constraints (30 pts): Did the AI enforce hard caps, identify negative surpluses, and respect debt deferral rules?
- Data Accuracy (30 pts): Did it use the correct numbers from the provided context without hallucinating?
- Clarity/Helpfulness (20 pts): Is the response easy to understand and actionable?

OUTPUT REQUIREMENT:
You must output ONLY valid JSON in this exact structure:
{
  "score": <number between 0 and 100>,
  "reasoning": "<brief string explaining the point deductions>"
}
Do not include any Markdown formatting or code block backticks.
`;

export async function evaluateWithGemini(
  apiKey: string,
  question: string,
  dataSliceStr: string,
  expectedMode: string,
  aiAnswer: string
): Promise<EvaluationGrade> {
  const prompt = `${GRADING_PROMPT_SYSTEM}\n\nUser Question: ${question}\n\nContext Data:\n${dataSliceStr}\n\nExpected AI Mode/Behavior (for your reference): ${expectedMode}\n\nActual AI Answer to evaluate:\n${aiAnswer}\n\nOutput JSON now:`;

  try {
    const response = await generateAIResponse(prompt, "gemini", apiKey, "gemini-2.5-flash");

    // Strip markdown formatting if the model accidentally included it
    let cleanText = response.text.trim();
    if (cleanText.startsWith("```json")) {
        cleanText = cleanText.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(cleanText) as EvaluationGrade;
    return parsed;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return {
      score: 0,
      reasoning: `Evaluation failed to parse: ${error.message}`
    };
  }
}
