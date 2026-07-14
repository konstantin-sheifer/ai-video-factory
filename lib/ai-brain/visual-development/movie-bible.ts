import type { CreativeBrief } from "../creative-brief";

export type ProductionFormat = "short" | "reel" | "long_video" | "movie";

export type ProductionPlatform =
  | "tiktok"
  | "youtube_shorts"
  | "instagram_reels"
  | "youtube"
  | "generic";

export type ProductionBibleInput = {
  idea: string;
  duration: number;
  format: ProductionFormat;
  platform: ProductionPlatform;
};

export type ProductionBible = {
  id: string;
  source: {
    originalIdea: string;
    improvedIdea: string;
    duration: number;
    format: ProductionFormat;
    platform: ProductionPlatform;
  };
  creative: {
    genre: string;
    tone: string;
    audience: string;
    emotionalTrigger: string;
    viralMechanism: string;
    coreConflict: string;
    finalPayoff: string;
  };
  story: {
    logline: string;
    hook: string;
    mystery: string;
    escalation: string;
    reveal: string;
    payoff: string;
  };
  characters: {
    mainCharacter: string;
    identityLock: string[];
    wardrobe: string;
    movementStyle: string;
    emotionalArc: string;
  };
  world: {
    primaryLocation: string;
    timeOfDay: string;
    lighting: string;
    atmosphere: string;
    keyProps: string[];
    forbiddenLocations: string[];
  };
  visualLanguage: {
    style: string;
    camera: string;
    colorPalette: string;
    compositionRules: string[];
    continuityRules: string[];
  };
  providerAgnosticRules: {
    mustShow: string[];
    mustAvoid: string[];
    providerReplaceability: string;
  };
};

type BriefSource = {
  idea: string;
  duration: number;
  format: ProductionFormat;
  platform: ProductionPlatform;
  brief?: CreativeBrief;
};

export function createProductionBible(
  input: ProductionBibleInput,
  creativeBrief?: CreativeBrief
): ProductionBible {
  const idea = cleanText(input.idea);
  const brief = creativeBrief;
  const lowerIdea = `${idea} ${brief?.productionIdea || ""}`.toLowerCase();

  const source: BriefSource = {
    idea,
    duration: input.duration,
    format: input.format,
    platform: input.platform,
    brief,
  };

  if (isMannequinMallIdea(lowerIdea)) {
    return createMannequinMallBible(source);
  }

  if (isSubwayFuturePhoneIdea(lowerIdea)) {
    return createSubwayFuturePhoneBible(source);
  }

  return createGenericBible(source);
}

function createMannequinMallBible(source: BriefSource): ProductionBible {
  const brief = source.brief;
  const forbiddenLocations = [
    "unrelated outdoor scene",
    "nature landscape",
    "road or highway",
    "office room",
    "daylight exterior",
  ];

  const improvedIdea =
    brief?.productionIdea ||
    "A night janitor in a closed shopping mall discovers that the mannequins behind the store glass move closer every time he looks away.";

  const payoff =
    brief?.creative.payoff ||
    "one mannequin presses its hand against the glass directly in front of the janitor";

  return {
    id: createBibleId(),
    source: {
      originalIdea: brief?.originalIdea || source.idea,
      improvedIdea,
      duration: source.duration,
      format: source.format,
      platform: source.platform,
    },
    creative: {
      genre: mapStyleToGenre(brief?.creative.style) || "closed mall supernatural thriller",
      tone: mapStyleToTone(brief?.creative.style) || "quiet, eerie, realistic, tense",
      audience:
        "short-form viewers who like creepy everyday places and clear visual payoffs",
      emotionalTrigger:
        brief?.creative.wowReason ||
        "fear from seeing lifeless human-shaped objects move when nobody is watching",
      viralMechanism:
        brief?.creative.escalation ||
        "each time the janitor looks away, the mannequins are visibly closer",
      coreConflict:
        brief?.creative.coreEvent ||
        "the janitor must prove whether the mannequins are moving without being seen",
      finalPayoff: payoff,
    },
    story: {
      logline:
        brief?.productionIdea ||
        "A night janitor cleaning a closed mall realizes the mannequins are moving whenever he looks away.",
      hook:
        brief?.creative.hook ||
        "The first frame shows an empty mall corridor and mannequins already facing the janitor from behind glass.",
      mystery:
        brief?.creative.coreEvent ||
        "One mannequin has changed position after the janitor looks away for a moment.",
      escalation:
        brief?.creative.escalation ||
        "The mannequins behind the glass become closer and more directly focused on him.",
      reveal:
        brief?.creative.escalation ||
        "The janitor raises his flashlight and sees several mannequins now facing the glass.",
      payoff,
    },
    characters: {
      mainCharacter:
        "one realistic night janitor, adult human, tired face, cautious posture, cleaning cart beside him",
      identityLock: [
        "same janitor from first frame to last frame",
        "same face and body proportions",
        "same dark janitor uniform",
        "same cleaning gloves and work shoes",
      ],
      wardrobe:
        "dark blue janitor uniform, cleaning gloves, work shoes, small name badge",
      movementStyle:
        brief?.rules.actionPrinciple ||
        "slow cautious movements, small realistic reactions, no running, no exaggerated gestures",
      emotionalArc:
        "calm focus turns into confusion, then fear, then complete stillness",
    },
    world: {
      primaryLocation:
        "one closed shopping mall corridor at midnight with clothing store windows and mannequins behind glass",
      timeOfDay: "midnight after closing",
      lighting:
        "dim mall security lights, storefront glow, soft reflections on polished floor",
      atmosphere:
        "empty, quiet, realistic, slightly threatening, no crowds",
      keyProps: [
        "cleaning cart",
        "glass storefront",
        "lifelike mannequins",
        "flashlight",
        "wet polished floor",
      ],
      forbiddenLocations,
    },
    visualLanguage: {
      style: mapStyleToVisualStyle(brief?.creative.style) ||
        "ultra-realistic cinematic mall thriller, premium lighting, grounded suspense",
      camera: mapPacingToCamera(brief?.creative.pacing) ||
        "slow tracking shot beside the janitor and cleaning cart, stable camera, no fast cuts",
      colorPalette:
        "cool blue mall shadows, muted storefront glow, pale mannequin tones, realistic skin tones",
      compositionRules: [
        "janitor visible in foreground or midground",
        "storefront and mannequins always visible",
        "final frame must clearly show mannequin hand on glass",
      ],
      continuityRules: [
        "one continuous shot",
        "same mall corridor",
        "same janitor",
        "mannequins change position only between looks",
        "no random people or shoppers",
      ],
    },
    providerAgnosticRules: {
      mustShow: [
        "closed shopping mall",
        "night janitor",
        "mannequins behind glass",
        "mannequins changing position",
        "final mannequin hand against glass",
      ],
      mustAvoid: buildMustAvoid({
        forbiddenLocations,
        allowedLocationType: "indoor",
        allowedTimeOfDay: "night",
        allowCrowd: false,
        extraAvoid: brief?.rules.mustAvoid,
      }),
      providerReplaceability:
        "This bible is provider-agnostic and can be used by Runway, Veo, Kling, or future video models.",
    },
  };
}

function createSubwayFuturePhoneBible(source: BriefSource): ProductionBible {
  const brief = source.brief;
  const forbiddenLocations = [
    "office room",
    "home interior",
    "daylight exterior",
    "nature landscape",
    "random desk setup",
  ];

  const improvedIdea =
    brief?.productionIdea ||
    "A subway cleaner finds a phone on an empty platform that receives warnings from 24 hours in the future.";

  return {
    id: createBibleId(),
    source: {
      originalIdea: brief?.originalIdea || source.idea,
      improvedIdea,
      duration: source.duration,
      format: source.format,
      platform: source.platform,
    },
    creative: {
      genre: mapStyleToGenre(brief?.creative.style) || "urban sci-fi mystery thriller",
      tone: mapStyleToTone(brief?.creative.style) || "lonely, tense, grounded, cinematic",
      audience:
        "short-form viewers who like mysterious technology and future warnings",
      emotionalTrigger:
        brief?.creative.wowReason ||
        "fear from seeing proof that tomorrow already knows what will happen",
      viralMechanism:
        brief?.creative.escalation ||
        "the phone predicts physical events seconds before they happen",
      coreConflict:
        brief?.creative.coreEvent ||
        "a subway cleaner realizes the phone receives messages from 24 hours in the future",
      finalPayoff:
        brief?.creative.payoff ||
        "the tunnel lights turn on exactly like the phone predicted",
    },
    story: {
      logline: improvedIdea,
      hook:
        brief?.creative.hook ||
        "The first frame shows an empty subway platform and a glowing phone on the wet floor.",
      mystery:
        brief?.creative.coreEvent ||
        "The cleaner picks up the phone and sees a warning before anything happens.",
      escalation:
        brief?.creative.escalation ||
        "The platform lights flicker exactly as the phone predicted.",
      reveal:
        brief?.creative.escalation ||
        "The cleaner realizes the phone is not broken; it is receiving future messages.",
      payoff:
        brief?.creative.payoff ||
        "A final warning appears as the tunnel lights switch on behind the cleaner.",
    },
    characters: {
      mainCharacter:
        "one realistic subway cleaner, adult human, work uniform, reflective safety vest, cautious expression, holding a smartphone",
      identityLock: [
        "same cleaner throughout",
        "same uniform",
        "same face",
        "same smartphone in hand",
      ],
      wardrobe: "dark work uniform, reflective safety vest, cleaning gloves",
      movementStyle:
        brief?.rules.actionPrinciple ||
        "slow careful movements, focused attention on phone, no running",
      emotionalArc:
        "routine work turns into confusion, alarm, and realization",
    },
    world: {
      primaryLocation:
        "one empty subway platform late at night with tiled walls, cleaning cart, wet floor, benches, and dark tunnel",
      timeOfDay: "late night",
      lighting:
        "cold fluorescent subway lights, wet floor reflections, dark tunnel shadows",
      atmosphere:
        "lonely, tense, urban, realistic, mysterious",
      keyProps: [
        "smartphone",
        "cleaning cart",
        "wet floor",
        "subway bench",
        "dark tunnel",
      ],
      forbiddenLocations,
    },
    visualLanguage: {
      style:
        mapStyleToVisualStyle(brief?.creative.style) ||
        "ultra-realistic cinematic urban mystery, moody subway lighting, grounded realistic detail",
      camera:
        mapPacingToCamera(brief?.creative.pacing) ||
        "slow controlled push-in from the cleaning cart toward the phone in the cleaner's hand",
      colorPalette:
        "cool blue-green subway tones, white fluorescent highlights, dark tunnel shadows, realistic skin tones",
      compositionRules: [
        "phone must remain visible",
        "subway platform must be clear",
        "tunnel lights must be visible for final payoff",
      ],
      continuityRules: [
        "one continuous shot",
        "same subway platform",
        "same cleaner",
        "same phone",
        "no random desk or office",
      ],
    },
    providerAgnosticRules: {
      mustShow: [
        "empty subway platform",
        "subway cleaner",
        "smartphone",
        "future warning behavior",
        "tunnel lights final payoff",
      ],
      mustAvoid: buildMustAvoid({
        forbiddenLocations,
        allowedLocationType: "indoor",
        allowedTimeOfDay: "night",
        allowCrowd: false,
        extraAvoid: brief?.rules.mustAvoid,
      }),
      providerReplaceability:
        "This bible is provider-agnostic and can be used by Runway, Veo, Kling, or future video models.",
    },
  };
}

function createGenericBible(source: BriefSource): ProductionBible {
  const brief = source.brief;
  const forbiddenLocations = ["unrelated environment", "random background"];
  const improvedIdea = brief?.productionIdea || source.idea;

  return {
    id: createBibleId(),
    source: {
      originalIdea: brief?.originalIdea || source.idea,
      improvedIdea,
      duration: source.duration,
      format: source.format,
      platform: source.platform,
    },
    creative: {
      genre: mapStyleToGenre(brief?.creative.style) || "cinematic viral mystery short",
      tone: mapStyleToTone(brief?.creative.style) || "cinematic, focused, realistic",
      audience:
        "short-form viewers who want a fast mystery and a memorable visual payoff",
      emotionalTrigger:
        brief?.creative.wowReason ||
        "curiosity from seeing one ordinary detail break the rules of reality",
      viralMechanism:
        brief?.creative.escalation ||
        "a familiar situation turns strange in the first second and ends with visible proof",
      coreConflict:
        brief?.creative.coreEvent ||
        "the main subject realizes one rule of the world has suddenly broken",
      finalPayoff:
        brief?.creative.payoff ||
        "the final frame proves the impossible event through one strong physical detail",
    },
    story: {
      logline: improvedIdea,
      hook:
        brief?.creative.hook ||
        "Open with the unusual detail already visible in the first frame.",
      mystery:
        brief?.creative.coreEvent ||
        "The main subject notices that something in the scene is impossible.",
      escalation:
        brief?.creative.escalation ||
        "The impossible event becomes clearer through one physical action.",
      reveal:
        brief?.creative.escalation ||
        "The environment confirms the event is real.",
      payoff:
        brief?.creative.payoff ||
        "End with one clean visual proof of the idea.",
    },
    characters: {
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
      movementStyle:
        brief?.rules.actionPrinciple ||
        "small purposeful movements that reveal the story",
      emotionalArc: "curiosity turns into realization",
    },
    world: {
      primaryLocation:
        "one specific cinematic location directly matching the user's idea",
      timeOfDay: "time of day that supports the story",
      lighting: "cinematic lighting with clear subject visibility",
      atmosphere: "focused, realistic, emotionally clear",
      keyProps: ["one key object that proves the idea"],
      forbiddenLocations,
    },
    visualLanguage: {
      style:
        mapStyleToVisualStyle(brief?.creative.style) ||
        "ultra-realistic cinematic short-form video, polished commercial look",
      camera:
        mapPacingToCamera(brief?.creative.pacing) ||
        "slow cinematic push-in or gentle tracking movement, stable camera",
      colorPalette:
        "realistic cinematic colors, clean contrast, premium commercial look",
      compositionRules: [
        "subject and key object must be clearly visible",
        "final payoff must be readable without explanation",
      ],
      continuityRules: [
        "same subject",
        "same location",
        "one continuous shot",
        "no unrelated background",
      ],
    },
    providerAgnosticRules: {
      mustShow: [
        "main subject",
        "matching location",
        "key object",
        "visible event",
        "final payoff",
      ],
      mustAvoid: buildMustAvoid({
        forbiddenLocations,
        allowedLocationType: "unknown",
        allowedTimeOfDay: "unknown",
        allowCrowd: false,
        extraAvoid: brief?.rules.mustAvoid,
      }),
      providerReplaceability:
        "This bible is provider-agnostic and can be used by Runway, Veo, Kling, or future video models.",
    },
  };
}

function buildMustAvoid(input: {
  forbiddenLocations: string[];
  allowedLocationType: "indoor" | "outdoor" | "unknown";
  allowedTimeOfDay: "day" | "night" | "unknown";
  allowCrowd: boolean;
  extraAvoid?: string[];
}) {
  const avoid = new Set<string>();

  input.forbiddenLocations.forEach((item) => avoid.add(item));
  input.extraAvoid?.forEach((item) => avoid.add(item));

  avoid.add("unrelated location");
  avoid.add("unrelated character");
  avoid.add("random stock-video person");
  avoid.add("identity drift");
  avoid.add("changed outfit");
  avoid.add("duplicated main character");
  avoid.add("extra limbs");
  avoid.add("distorted face");
  avoid.add("scene change");
  avoid.add("montage");
  avoid.add("text overlay");
  avoid.add("watermark");
  avoid.add("logo");
  avoid.add("low quality");
  avoid.add("flicker");

  if (!input.allowCrowd) {
    avoid.add("random crowd");
    avoid.add("extra people");
  }

  if (input.allowedLocationType === "indoor") {
    avoid.add("unrelated outdoor scene");
  }

  if (input.allowedLocationType === "outdoor") {
    avoid.add("unrelated indoor scene");
  }

  if (input.allowedTimeOfDay === "night") {
    avoid.add("bright daylight scene");
  }

  if (input.allowedTimeOfDay === "day") {
    avoid.add("unmotivated night scene");
  }

  return Array.from(avoid);
}

function mapStyleToGenre(style?: string) {
  const map: Record<string, string> = {
    cinematic_horror: "cinematic supernatural thriller",
    sci_fi_thriller: "grounded cinematic sci-fi thriller",
    premium_3d_animation: "premium animated short",
    stylized_animation: "stylized cinematic animation",
    luxury_commercial: "luxury cinematic commercial",
    comedy_reaction: "cinematic comedy reaction short",
    cinematic_realism: "cinematic realistic mystery short",
  };

  return style ? map[style] : "";
}

function mapStyleToTone(style?: string) {
  const map: Record<string, string> = {
    cinematic_horror: "eerie, tense, grounded, suspenseful",
    sci_fi_thriller: "mysterious, futuristic, tense, cinematic",
    premium_3d_animation: "expressive, polished, charming, cinematic",
    stylized_animation: "stylized, vivid, cinematic, emotionally clear",
    luxury_commercial: "premium, elegant, slow, polished",
    comedy_reaction: "playful, surprising, expressive, fast-readable",
    cinematic_realism: "realistic, focused, cinematic, emotionally clear",
  };

  return style ? map[style] : "";
}

function mapStyleToVisualStyle(style?: string) {
  const map: Record<string, string> = {
    cinematic_horror:
      "ultra-realistic cinematic horror, premium suspense lighting, grounded physical details, strong final frame",
    sci_fi_thriller:
      "grounded cinematic sci-fi, realistic futuristic detail, controlled lighting, believable technology",
    premium_3d_animation:
      "premium 3D animated short, expressive character animation, polished cinematic lighting, high-end family-friendly look",
    stylized_animation:
      "stylized cinematic animation, clear shapes, expressive movement, polished art direction",
    luxury_commercial:
      "luxury commercial cinematography, premium lighting, slow elegant movement, polished product-level detail",
    comedy_reaction:
      "cinematic comedy short, expressive reactions, clear physical gag, polished readable staging",
    cinematic_realism:
      "ultra-realistic cinematic short-form video, polished commercial look, sharp realistic detail",
  };

  return style ? map[style] : "";
}

function mapPacingToCamera(pacing?: string) {
  const map: Record<string, string> = {
    slow_tension:
      "slow controlled push-in with visual tension in every beat, no empty waiting",
    mystery_reveal:
      "controlled reveal camera language, readable subject reaction, key object always visible",
    action_dense:
      "fast-readable cinematic movement with clear cause and effect, no confusing montage",
    comedy_reaction:
      "clean readable camera that protects the gag and reaction timing",
    premium_slow:
      "slow elegant camera movement, strong composition, premium commercial rhythm",
    cinematic_wonder:
      "smooth cinematic push-in with a sense of discovery and scale",
  };

  return pacing ? map[pacing] : "";
}

function isMannequinMallIdea(idea: string) {
  return (
    idea.includes("mannequin") ||
    idea.includes("shopping mall") ||
    idea.includes("closed mall") ||
    idea.includes("janitor")
  );
}

function isSubwayFuturePhoneIdea(idea: string) {
  return (
    idea.includes("subway") ||
    idea.includes("phone") ||
    idea.includes("future message") ||
    idea.includes("24 hours in the future") ||
    idea.includes("tomorrow")
  );
}

function createBibleId() {
  return `bible-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}
