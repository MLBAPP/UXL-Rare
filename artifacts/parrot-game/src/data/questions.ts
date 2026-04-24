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

export const BONUS_POINTS_PER_CORRECT = 25;

export const FRUIT_POINTS: { emoji: string; points: number }[] = [
  { emoji: "🍒", points: 5 },
  { emoji: "🍎", points: 10 },
  { emoji: "🍌", points: 15 },
  { emoji: "🍓", points: 20 },
  { emoji: "🍇", points: 25 },
  { emoji: "🥝", points: 30 },
  { emoji: "🥭", points: 40 },
  { emoji: "🍉", points: 50 },
];
