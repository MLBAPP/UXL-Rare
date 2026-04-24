export interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  emoji: string;
}

export const QUESTIONS: Question[] = [
  {
    question: "What is a true parrot goal?",
    options: ["Sleep", "Chaos", "Taxes", "Silence"],
    correctIndex: 1,
    emoji: "🦜",
  },
  {
    question: "Best Squad strategy?",
    options: ["Think carefully", "Panic", "Full send", "Log off"],
    correctIndex: 2,
    emoji: "💥",
  },
  {
    question: "What gives power?",
    options: ["Water", "$MON", "Homework", "Vegetables"],
    correctIndex: 1,
    emoji: "⚡",
  },
  {
    question: "Your parrot sees danger. What do you do?",
    options: ["Hide", "Analyze", "SCREAM AND RUN", "Ask for help"],
    correctIndex: 2,
    emoji: "😱",
  },
  {
    question: "Squad energy is:",
    options: ["Calm", "Predictable", "Chaotic", "Boring"],
    correctIndex: 2,
    emoji: "🔥",
  },
  {
    question: "Best upgrade?",
    options: ["Logic", "Speed", "More chaos", "Silence"],
    correctIndex: 2,
    emoji: "🚀",
  },
  {
    question: "Your parrot's weakness:",
    options: ["Fear", "Discipline", "None", "Rules"],
    correctIndex: 2,
    emoji: "💪",
  },
  {
    question: "Final question:",
    options: ["Win safely", "Don't play", "GO ALL IN", "Wait"],
    correctIndex: 2,
    emoji: "🏆",
  },
];

export const BONUS_SECONDS_PER_CORRECT = 2;
export const BASE_SURVIVAL_TIME = 15;
