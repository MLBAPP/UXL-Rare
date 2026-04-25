export interface Character {
  id: string;
  emoji: string;
  name: string;
  imageUrl?: string;
}

const CHARACTERS: Character[] = [
  { id: "parrot", emoji: "🦜", name: "Parrot" },
];

export function getAllCharacters(): Character[] {
  return CHARACTERS;
}

export function getRandomCharacter(): Character {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
}

export function getCharacterById(id: string): Character {
  return CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];
}

export function getDefaultCharacter(): Character {
  return CHARACTERS[0];
}
