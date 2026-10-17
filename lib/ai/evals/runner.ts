import { runFinanceDecisionLoop } from "../decisionLoop";
import { testCases } from "./testCases";

function runEvaluations() {
  console.log("Starting AI Decision Loop Evaluations...\n");

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    try {
      const result = runFinanceDecisionLoop(tc.input);
      let isPass = true;
      const failReasons: string[] = [];

      // Validate mode
      if (result.mode !== tc.expected.mode) {
        isPass = false;
        failReasons.push(`Expected mode '${tc.expected.mode}', got '${result.mode}'`);
      }

      // Validate constraints
      if (tc.expected.hasConstraints !== undefined) {
        const hasConstraints = result.constraints && result.constraints.length > 0;
        if (hasConstraints !== tc.expected.hasConstraints) {
          isPass = false;
          failReasons.push(`Expected hasConstraints=${tc.expected.hasConstraints}, got ${hasConstraints}`);
        }
      }

      // Validate questions
      if (tc.expected.hasQuestions !== undefined) {
        const hasQuestions = result.questions && result.questions.length > 0;
        if (hasQuestions !== tc.expected.hasQuestions) {
          isPass = false;
          failReasons.push(`Expected hasQuestions=${tc.expected.hasQuestions}, got ${hasQuestions} (${result.questions.join(", ")})`);
        }
      }

      if (isPass) {
        passed++;
        console.log(`\x1b[32m[PASS]\x1b[0m Test ${tc.id} (${tc.difficulty}): ${tc.description}`);
      } else {
        failed++;
        console.log(`\x1b[31m[FAIL]\x1b[0m Test ${tc.id} (${tc.difficulty}): ${tc.description}`);
        console.log(`       Reasons: ${failReasons.join(" | ")}`);
      }
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
