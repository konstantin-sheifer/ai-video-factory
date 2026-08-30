export type StarterConcept = {
  title: string;
  hook: string;
  script: string;
  visual: string;
};

const categoryConcepts: Record<string, StarterConcept[]> = {
  Animals: [
    concept("Why octopuses can solve puzzles", "They are smarter than most people think", "Octopus opening a jar underwater with dramatic close-ups"),
    concept("The animal that survives space-like conditions", "This tiny creature is almost impossible to kill", "A tardigrade crossing cinematic extreme environments"),
    concept("Why cats chirp at birds", "That strange sound is not random", "Cat watching birds through a window in slow motion"),
    concept("The bird that imitates chainsaws", "This sound feels impossible", "A lyrebird performing in a cinematic forest"),
    concept("The strangest migration on Earth", "Millions move together for one reason", "A vast animal migration across dramatic landscapes"),
  ],
};

const fallbackConcepts = [
  concept("A surprising fact most people never notice", "One detail changes the entire story", "A fast cinematic reveal around one clear subject"),
  concept("The biggest myth about this topic", "The truth is completely different", "A striking before-and-after visual story"),
  concept("A hidden detail that changes everything", "Most people miss it the first time", "A close-up expanding into a dramatic wide shot"),
  concept("Why this topic keeps people watching", "One emotional trigger drives the attention", "A short cinematic transformation sequence"),
  concept("The simple story behind a viral short", "A small moment can create a powerful payoff", "Vertical storytelling with dramatic lighting"),
];

export function getMockStarterConcepts(category: string): StarterConcept[] {
  return categoryConcepts[category.trim()] ?? fallbackConcepts;
}

export function shouldUseMockStarterQueue(
  environment: Record<string, string | undefined>
) {
  return environment.AI_BRAIN_LIVE !== "true" || !environment.OPENAI_API_KEY;
}

function concept(title: string, hook: string, visual: string): StarterConcept {
  return {
    title,
    hook,
    script: `${hook}. ${title}. End with a clear visual payoff.`,
    visual,
  };
}
