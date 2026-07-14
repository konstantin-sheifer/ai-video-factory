export type EnvironmentDesignInput = {
  idea: string;
  genre: string;
};

export type EnvironmentDesignResult = {
  location: string;
  timeOfDay: string;
  lighting: string;
  keyProps: string[];
  atmosphere: string;
  backgroundDetails: string;
  continuityRules: string[];
};

export function designEnvironment(
  input: EnvironmentDesignInput
): EnvironmentDesignResult {
  const idea = input.idea.toLowerCase();

  if (idea.includes("mannequin") || idea.includes("mall")) {
    return {
      location:
        "one closed shopping mall corridor at night with clothing store windows and mannequins behind glass",
      timeOfDay: "midnight, after closing",
      lighting:
        "dim mall security lighting, storefront glow, soft reflections on polished floor",
      keyProps: [
        "cleaning cart",
        "glass storefront",
        "lifelike mannequins",
        "closed metal shutters",
        "wet polished floor",
      ],
      atmosphere:
        "empty, quiet, eerie, realistic, slightly threatening",
      backgroundDetails:
        "dark empty storefronts, distant escalator, muted emergency lights, no shoppers",
      continuityRules: [
        "same mall corridor for entire clip",
        "no forest",
        "no road",
        "no daylight",
        "no outdoor location",
        "no random crowd",
      ],
    };
  }

  if (idea.includes("subway") || idea.includes("phone")) {
    return {
      location:
        "one empty subway platform late at night with a cleaning cart and tunnel darkness behind",
      timeOfDay: "late night",
      lighting:
        "cold fluorescent subway lights with wet floor reflections and dark tunnel shadows",
      keyProps: [
        "smartphone",
        "cleaning cart",
        "wet floor",
        "subway bench",
        "dark tunnel",
      ],
      atmosphere:
        "lonely, tense, urban, mysterious, realistic",
      backgroundDetails:
        "tiled walls, warning lines on platform edge, flickering tunnel lights, no passengers",
      continuityRules: [
        "same subway platform for entire clip",
        "phone must remain visible",
        "no office",
        "no forest",
        "no random desk",
        "no daylight scene",
      ],
    };
  }

  return {
    location:
      "one specific cinematic location directly matching the user's idea",
    timeOfDay: "time of day that best supports the story",
    lighting:
      "cinematic lighting with clear subject visibility and realistic contrast",
    keyProps: ["one key object that proves the idea"],
    atmosphere:
      "cinematic, focused, realistic, emotionally clear",
    backgroundDetails:
      "stable background details that support the story without distracting from the main event",
    continuityRules: [
      "same location for entire clip",
      "no unrelated environment",
      "no random background",
      "no scene changes",
    ],
  };
}