export interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  emoji: string;
}

export const QUESTIONS: Question[] = [
  {
    question: "What is the fastest animal on land?",
    options: ["Lion", "Cheetah", "Greyhound", "Pronghorn"],
    correctIndex: 1,
    emoji: "🐆",
  },
  {
    question: "How many sides does a hexagon have?",
    options: ["5", "6", "7", "8"],
    correctIndex: 1,
    emoji: "⬡",
  },
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Jupiter", "Mars", "Saturn"],
    correctIndex: 2,
    emoji: "🔴",
  },
  {
    question: "What gas do plants absorb from the air?",
    options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
    correctIndex: 2,
    emoji: "🌿",
  },
  {
    question: "Who painted the Mona Lisa?",
    options: ["Michelangelo", "Raphael", "Leonardo da Vinci", "Donatello"],
    correctIndex: 2,
    emoji: "🎨",
  },
  {
    question: "What is the capital of Japan?",
    options: ["Seoul", "Beijing", "Shanghai", "Tokyo"],
    correctIndex: 3,
    emoji: "🗾",
  },
  {
    question: "How many bones are in the adult human body?",
    options: ["196", "206", "216", "226"],
    correctIndex: 1,
    emoji: "💀",
  },
  {
    question: "What does 'www' stand for in a website address?",
    options: ["World Wide Web", "Wide World Web", "World Web Wide", "Web World Wide"],
    correctIndex: 0,
    emoji: "🌐",
  },
];

export const BONUS_SECONDS_PER_CORRECT = 2;
export const BASE_SURVIVAL_TIME = 15;
