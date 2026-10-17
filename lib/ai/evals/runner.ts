import { runFinanceDecisionLoop } from "../decisionLoop";
import { testCases } from "./testCases";
import { generateAIResponse } from "../aiClient";
import { buildPrompt } from "../promptBuilder";
import { evaluateWithGemini } from "./evalGrading";

async function runEvaluations() {
  console.log("Starting AI Decision Loop Evaluations...\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("\x1b[33m[WARN]\x1b[0m GEMINI_API_KEY is missing. Running internal deterministic tests with verbose output.");
    console.warn("To run the multi-layer LLM evaluation: GEMINI_API_KEY=your_key pnpm run eval\n");
    runDeterministicTests();
    return;
  }

  let totalScore = 0;
  let testCount = 0;

  for (const tc of testCases) {
    testCount++;
    console.log(`\nEvaluating Test ${tc.id} (${tc.difficulty}): ${tc.description}`);

    try {
      const built = buildPrompt({
        intent: "GENERAL",
        dataSlice: tc.input.dataSlice,
        question: tc.input.question,
      });

      const fullPrompt = `${built.system}\n\n${built.user}`;
      const aiResponse = await generateAIResponse(fullPrompt, "gemini", apiKey, "gemini-2.5-flash");

      const grade = await evaluateWithGemini(
        apiKey,
        tc.input.question,
        JSON.stringify(tc.input.dataSlice, null, 2),
        tc.expected.mode,
        aiResponse.text
      );

      totalScore += grade.score;
      const color = grade.score >= 80 ? "\x1b[32m" : grade.score >= 50 ? "\x1b[33m" : "\x1b[31m";
      console.log(`   ${color}Score: ${grade.score}/100\x1b[0m`);
      console.log(`   Reasoning: ${grade.reasoning}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.log(`\x1b[31m[ERROR]\x1b[0m Exception running Test ${tc.id}: ${e.message}`);
    }
  }

  console.log("\n========================================");
  console.log(`Total Cases: ${testCount}`);
  console.log(`Average Multi-Layer Score: ${(totalScore / testCount).toFixed(2)}/100`);
  console.log("========================================\n");
}

function runDeterministicTests() {
  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    try {
      const result = runFinanceDecisionLoop(tc.input);
      let isPass = true;
      const failReasons: string[] = [];

      if (result.mode !== tc.expected.mode) {
        isPass = false;
        failReasons.push(`Expected mode '${tc.expected.mode}', got '${result.mode}'`);
      }

      if (tc.expected.hasConstraints !== undefined) {
        const hasConstraints = result.constraints && result.constraints.length > 0;
        if (hasConstraints !== tc.expected.hasConstraints) {
          isPass = false;
          failReasons.push(`Expected hasConstraints=${tc.expected.hasConstraints}, got ${hasConstraints}`);
        }
      }

      if (tc.expected.hasQuestions !== undefined) {
        const hasQuestions = result.questions && result.questions.length > 0;
        if (hasQuestions !== tc.expected.hasQuestions) {
          isPass = false;
          failReasons.push(`Expected hasQuestions=${tc.expected.hasQuestions}, got ${hasQuestions} (${result.questions.join(", ")})`);
        }
      }

      if (isPass) {
        passed++;
        console.log(`\n\x1b[32m[PASS]\x1b[0m Test ${tc.id} (${tc.difficulty}): ${tc.description}`);
      } else {
        failed++;
        console.log(`\n\x1b[31m[FAIL]\x1b[0m Test ${tc.id} (${tc.difficulty}): ${tc.description}`);
        console.log(`       Reasons: ${failReasons.join(" | ")}`);
      }

      // Print Verbose Outputs
      console.log(`  --> Question: "${tc.input.question}"`);
      console.log(`  --> AI Mode: ${result.mode}`);
      if (result.questions.length > 0) {
        console.log(`  --> AI Clarification Questions:`, result.questions);
      }
      if (result.constraints.length > 0) {
        console.log(`  --> AI Detected Constraints:`, result.constraints);
      }
      console.log(`  --> AI Recommendation/Response:\n      "${result.recommendation}"`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      failed++;
      console.log(`\x1b[31m[ERROR]\x1b[0m Test ${tc.id} (${tc.difficulty}): ${tc.description}`);
      console.log(`        Exception: ${e.message}`);
    }
  }

  console.log("\n========================================");
  console.log(`Total: ${testCases.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(2)}%`);
  console.log("========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runEvaluations();
