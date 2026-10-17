import { DecisionLoopResult } from "../decisionLoop";

export interface TestCase {
  id: number;
  difficulty: "easy" | "medium" | "complex";
  description: string;
  input: {
    question: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataSlice: Record<string, any[]>;
    history?: unknown[];
  };
  expected: {
    mode: DecisionLoopResult["mode"];
    hasConstraints?: boolean;
    hasQuestions?: boolean;
    containsRecommendationKeywords?: string[];
  };
}

export const testCases: TestCase[] = [
  // --- EASY (10% = 5 questions) ---
  // Simple fetch, get, write, update
  {
    id: 1,
    difficulty: "easy",
    description: "Fetch total monthly income",
    input: {
      question: "What is my total monthly income?",
      dataSlice: { income: [{ amount: 50000, frequency: "Monthly" }] },
    },
    expected: { mode: "recommendation", hasQuestions: false },
  },
  {
    id: 2,
    difficulty: "easy",
    description: "Fetch total tracked expenses",
    input: {
      question: "How much are my tracked expenses?",
      dataSlice: { expenses: [{ amount: 20000 }, { amount: 5000 }] },
    },
    // No income means surplus < 0, triggers safe-default
    expected: { mode: "safe-default" },
  },
  {
    id: 3,
    difficulty: "easy",
    description: "Fetch active SIPs",
    input: {
      question: "What are my active SIPs?",
      dataSlice: { sips: [{ amount: 5000, sipStatus: "Active" }] },
    },
    expected: { mode: "safe-default" },
  },
  {
    id: 4,
    difficulty: "easy",
    description: "Fetch total debt payable",
    input: {
      question: "What is my outstanding debt?",
      dataSlice: { debts: [{ amount: 150000 }] },
    },
    expected: { mode: "clarify", hasQuestions: true },
  },
  {
    id: 5,
    difficulty: "easy",
    description: "Fetch goals summary",
    input: {
      question: "How much have I funded towards my goals?",
      dataSlice: { goals: [{ target: 100000, current: 40000 }] },
    },
    expected: { mode: "safe-default" },
  },

  // --- MEDIUM (50% = 25 questions) ---
  // One or more data sources, clear decision
  ...Array.from({ length: 25 }).map((_, i) => ({
    id: i + 6,
    difficulty: "medium" as const,
    description: `Medium scenario ${i + 1}: simple affordability check`,
    input: {
      question: `Can I afford a new expense of ${2000 + i * 500}?`,
      dataSlice: {
        income: [{ amount: 60000, frequency: "Monthly" }],
        expenses: [{ amount: 30000 }],
        sips: [{ amount: 5000, sipStatus: "Active" }],
        debts: [],
        goals: [{ target: 100000, current: 20000 }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as Record<string, any[]>,
    },
    // Because question includes "can I afford", and has no constraints, detectQuestions adds "What is the max additional cash..."
    expected: { mode: "clarify" as const, hasQuestions: true },
  })),

  // --- COMPLEX (40% = 20 questions) ---
  // Multiple data sources, hard caps, deferral, high debt, multiple goals
  ...Array.from({ length: 20 }).map((_, i) => {
    const scenarioType = i % 4;

    if (scenarioType === 0) {
      return {
        id: i + 31,
        difficulty: "complex" as const,
        description: `Complex scenario ${i + 1}: High debt requires clarification on deferral`,
        input: {
          question: "Should I buy a new phone for 50000?",
          dataSlice: {
            income: [{ amount: 80000, frequency: "Monthly" }],
            expenses: [{ amount: 30000 }],
            debts: [{ amount: 200000 }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as Record<string, any[]>,
        },
        expected: { mode: "clarify" as const, hasQuestions: true },
      };
    } else if (scenarioType === 1) {
      return {
        id: i + 31,
        difficulty: "complex" as const,
        description: `Complex scenario ${i + 1}: Multiple goals requires priority clarification`,
        input: {
          question: "Can I increase my SIPs by 5000?",
          dataSlice: {
            income: [{ amount: 80000, frequency: "Monthly" }],
            expenses: [{ amount: 30000 }],
            goals: [
               { target: 500000, current: 100000, name: "Wedding" },
               { target: 200000, current: 50000, name: "Emergency" }
            ],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as Record<string, any[]>,
        },
        expected: { mode: "clarify" as const, hasQuestions: true },
      };
    } else if (scenarioType === 2) {
      return {
        id: i + 31,
        difficulty: "complex" as const,
        description: `Complex scenario ${i + 1}: Constraint given with debt deferral`,
        input: {
          question: "I want to buy a laptop, max 40000. I can defer my debts.",
          dataSlice: {
            income: [{ amount: 100000, frequency: "Monthly" }],
            expenses: [{ amount: 40000 }],
            debts: [{ amount: 150000 }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as Record<string, any[]>,
        },
        expected: { mode: "recommendation" as const, hasConstraints: true, hasQuestions: false },
      };
    } else {
      return {
        id: i + 31,
        difficulty: "complex" as const,
        description: `Complex scenario ${i + 1}: Negative surplus`,
        input: {
          question: "I want to take a vacation.",
          dataSlice: {
            income: [{ amount: 50000, frequency: "Monthly" }],
            expenses: [{ amount: 55000 }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as Record<string, any[]>,
        },
        expected: { mode: "safe-default" as const },
      };
    }
  }),
];
