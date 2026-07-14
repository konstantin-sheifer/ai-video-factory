export type CharacterDesignInput = {
  idea: string;
  genre: string;
};

export type CharacterDesignResult = {
  mainCharacter: string;
  identityLock: string[];
  wardrobe: string;
  physicalDetails: string;
  emotionalState: string;
  movementStyle: string;
  continuityRules: string[];
};

export function designCharacter(
  input: CharacterDesignInput
): CharacterDesignResult {
  const idea = input.idea.toLowerCase();

  if (idea.includes("mannequin") || idea.includes("mall")) {
    return {
      mainCharacter:
        "one realistic night janitor, adult human, slightly tired face, cautious body language",
      identityLock: [
        "same janitor from first frame to last frame",
        "same face",
        "same body proportions",
        "same uniform",
      ],
      wardrobe:
        "dark blue janitor uniform, work shoes, cleaning gloves, small name badge",
      physicalDetails:
        "adult human, practical build, tired eyes, realistic skin texture, natural posture",
      emotionalState:
        "quiet concern slowly turning into fear",
      movementStyle:
        "slow cautious movement, small realistic reactions, no running, no exaggerated gestures",
      continuityRules: [
        "do not change gender",
        "do not change outfit",
        "do not replace with athlete",
        "do not replace with random woman",
        "do not add extra main characters",
      ],
    };
  }

  if (idea.includes("subway") || idea.includes("phone")) {
    return {
      mainCharacter:
        "one realistic subway cleaner, adult human, cautious expression, holding a smartphone",
      identityLock: [
        "same subway cleaner throughout",
        "same uniform",
        "same face",
        "same smartphone in hand",
      ],
      wardrobe:
        "dark work uniform, reflective safety vest, cleaning gloves",
      physicalDetails:
        "adult human, tired realistic face, practical posture, natural proportions",
      emotionalState:
        "confusion turning into alarm",
      movementStyle:
        "slow careful movement, focused attention on the phone, no running",
      continuityRules: [
        "do not replace with office worker",
        "do not replace with generic woman at desk",
        "do not remove the phone",
        "do not change location",
      ],
    };
  }

  return {
    mainCharacter:
      "one realistic main character clearly matching the user idea",
    identityLock: [
      "same character throughout",
      "same face",
      "same outfit",
      "same body proportions",
    ],
    wardrobe:
      "simple realistic clothing that matches the role and location",
    physicalDetails:
      "realistic human proportions, natural face, believable posture",
    emotionalState:
      "curiosity turning into realization",
    movementStyle:
      "small purposeful movements that reveal the story",
    continuityRules: [
      "do not change character identity",
      "do not add extra main characters",
      "do not use random stock-video people",
    ],
  };
}