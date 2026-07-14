import type { CreativeDirection } from "./types";

type IdeaArchetype =
  | "TIME_FREEZE"
  | "HAUNTED_PAINTING"
  | "LOCKSMITH_KEYS"
  | "ANIMAL_SURPRISE"
  | "SCI_FI_DEVICE"
  | "HORROR_DETAIL"
  | "OFFICE_ANOMALY"
  | "SUBWAY_FUTURE_PHONE"
  | "MANNEQUIN_MALL"
  | "GENERAL";

export function createCreativeDirection(idea: string): CreativeDirection {
  const cleanIdea = cleanText(idea);
  const archetype = detectArchetype(cleanIdea);

  if (archetype === "TIME_FREEZE") {
    return {
      title: "Time Froze",
      idea: cleanIdea,
      genre: "realistic sci-fi mystery",
      audience:
        "short-form viewers who like impossible moments hidden inside ordinary life",
      emotionalTrigger:
        "the shock of seeing ordinary motion frozen in a normal place",
      viralMechanism:
        "the first frame already shows frozen coffee, frozen papers, and a stopped clock",
      coreConflict:
        "a tired office worker realizes the entire office and the street outside have stopped, but he can still move",
      payoff:
        "the worker stands alone in the frozen office while coffee droplets, papers, the wall clock, and the outside street remain perfectly still",
    };
  }

  if (archetype === "HAUNTED_PAINTING") {
    return {
      title: "The Painting Moved",
      idea: cleanIdea,
      genre: "premium museum mystery thriller",
      audience:
        "short-form viewers who like eerie mysteries, impossible details, and final-frame twists",
      emotionalTrigger:
        "the fear of realizing a painting is aware of the person watching it",
      viralMechanism:
        "the first frame shows a guard and one painting, then the painted figure subtly changes position",
      coreConflict:
        "a museum guard notices that the people inside one painting move only when nobody is looking",
      payoff:
        "the guard turns back and sees one painted figure staring directly at him from a new position inside the frame",
    };
  }

  if (archetype === "LOCKSMITH_KEYS") {
    return {
      title: "Every Key Worked",
      idea: cleanIdea,
      genre: "realistic supernatural workshop mystery",
      audience:
        "short-form viewers who enjoy ordinary objects suddenly breaking the rules",
      emotionalTrigger:
        "curiosity from watching a familiar tool become impossible",
      viralMechanism:
        "a locksmith tests the same brass key on several different locks and every lock opens",
      coreConflict:
        "a locksmith realizes every key in his workshop now opens every lock",
      payoff:
        "the oldest locked cabinet opens by itself after the final key barely touches it",
    };
  }

  if (archetype === "SUBWAY_FUTURE_PHONE") {
    return {
      title: "Tomorrow Called",
      idea: cleanIdea,
      genre: "urban sci-fi mystery thriller",
      audience:
        "short-form viewers who like future warnings, mysterious technology, and grounded city stories",
      emotionalTrigger:
        "the fear of receiving proof that tomorrow already knows what will happen",
      viralMechanism:
        "a cleaner finds a phone on an empty subway platform and the screen warns about events before they happen",
      coreConflict:
        "a subway cleaner realizes the phone only receives messages from 24 hours in the future",
      payoff:
        "the phone vibrates with one final future warning as the subway tunnel lights turn on exactly like the message predicted",
    };
  }

  if (archetype === "MANNEQUIN_MALL") {
    return {
      title: "They Moved",
      idea: cleanIdea,
      genre: "closed mall thriller",
      audience:
        "short-form viewers who like creepy everyday places, mannequins, and visual jump moments without monsters",
      emotionalTrigger:
        "the dread of seeing lifeless mannequins change position when nobody is watching",
      viralMechanism:
        "a janitor looks away for one second and the mannequins behind the store glass are suddenly closer",
      coreConflict:
        "a night janitor discovers that every mannequin in a closed shopping mall changes position whenever he looks away",
      payoff:
        "the final mannequin presses one hand against the glass while the janitor stands frozen in the empty mall corridor",
    };
  }

  if (archetype === "ANIMAL_SURPRISE") {
    return {
      title: buildTitle(cleanIdea),
      idea: cleanIdea,
      genre: "premium family-friendly animal short",
      audience:
        "short-form viewers who enjoy cute animals, expressive reactions, and simple visual surprises",
      emotionalTrigger:
        "delight from seeing an animal react to one impossible detail",
      viralMechanism:
        "a cute animal touches one ordinary object and triggers a funny visual result",
      coreConflict:
        "the animal discovers that one normal object behaves in an impossible way",
      payoff:
        "the final reaction clearly shows the animal understanding the impossible result",
    };
  }

  if (archetype === "SCI_FI_DEVICE") {
    return {
      title: buildTitle(cleanIdea),
      idea: cleanIdea,
      genre: "cinematic sci-fi discovery",
      audience:
        "short-form viewers who like futuristic devices, clean visuals, and quick reveals",
      emotionalTrigger:
        "wonder from watching technology wake up in a believable way",
      viralMechanism:
        "one small physical action activates a futuristic device and the room visibly reacts",
      coreConflict:
        "the subject realizes the device is responding to them directly",
      payoff:
        "the device produces one clear physical result that proves the future has arrived",
    };
  }

  if (archetype === "HORROR_DETAIL") {
    return {
      title: buildTitle(cleanIdea),
      idea: cleanIdea,
      genre: "realistic micro-horror",
      audience:
        "short-form viewers who like quiet fear, small details, and disturbing final reveals",
      emotionalTrigger:
        "slow dread from noticing one detail move when it should not",
      viralMechanism:
        "one tiny movement in a quiet room proves the subject is not alone",
      coreConflict:
        "the subject realizes something unseen is interacting with the room",
      payoff:
        "the final frame reveals the source through one clear physical detail, not a random monster",
    };
  }

  if (archetype === "OFFICE_ANOMALY") {
    return {
      title: buildTitle(cleanIdea),
      idea: cleanIdea,
      genre: "realistic office anomaly",
      audience:
        "short-form viewers who like strange things happening in everyday workplaces",
      emotionalTrigger:
        "surprise from watching a boring workday turn impossible",
      viralMechanism:
        "one office object breaks the rules and forces the worker to react",
      coreConflict:
        "an ordinary worker discovers that one normal workplace rule no longer applies",
      payoff:
        "the final frame proves the impossible event through a clear office object or reaction",
    };
  }

  return {
    title: buildTitle(cleanIdea),
    idea: cleanIdea,
    genre: "cinematic viral mystery short",
    audience:
      "short-form viewers who want a fast mystery, a visible event, and a memorable final image",
    emotionalTrigger:
      "curiosity from seeing one ordinary detail break the rules of reality",
    viralMechanism:
      "a familiar situation turns strange within the first second and ends with a clear visual proof",
    coreConflict:
      "the main subject realizes that one rule of the world has suddenly broken",
    payoff:
      "the final frame clearly proves the impossible event through one strong physical detail",
  };
}

function detectArchetype(idea: string): IdeaArchetype {
  const text = idea.toLowerCase();

  if (
    text.includes("freeze time") ||
    text.includes("stop time") ||
    text.includes("time stopped") ||
    text.includes("time freeze")
  ) {
    return "TIME_FREEZE";
  }

  if (
    text.includes("painting") ||
    text.includes("museum") ||
    text.includes("gallery") ||
    text.includes("portrait")
  ) {
    return "HAUNTED_PAINTING";
  }

  if (
    text.includes("locksmith") ||
    text.includes("key") ||
    text.includes("lock")
  ) {
    return "LOCKSMITH_KEYS";
  }

  if (
    text.includes("subway") ||
    text.includes("phone") ||
    text.includes("future message") ||
    text.includes("24 hours in the future") ||
    text.includes("tomorrow")
  ) {
    return "SUBWAY_FUTURE_PHONE";
  }

  if (
    text.includes("mannequin") ||
    text.includes("shopping mall") ||
    text.includes("closed mall") ||
    text.includes("janitor")
  ) {
    return "MANNEQUIN_MALL";
  }

  if (
    text.includes("dog") ||
    text.includes("cat") ||
    text.includes("puppy") ||
    text.includes("kitten") ||
    text.includes("parrot") ||
    text.includes("animal")
  ) {
    return "ANIMAL_SURPRISE";
  }

  if (
    text.includes("space") ||
    text.includes("mars") ||
    text.includes("robot") ||
    text.includes("future") ||
    text.includes("device") ||
    text.includes("astronaut")
  ) {
    return "SCI_FI_DEVICE";
  }

  if (
    text.includes("ghost") ||
    text.includes("horror") ||
    text.includes("scary") ||
    text.includes("haunted")
  ) {
    return "HORROR_DETAIL";
  }

  if (
    text.includes("office") ||
    text.includes("worker") ||
    text.includes("employee") ||
    text.includes("business") ||
    text.includes("desk")
  ) {
    return "OFFICE_ANOMALY";
  }

  return "GENERAL";
}

function buildTitle(idea: string) {
  const title = extractTitleFromIdea(idea);

  const words = title
    .replace(/[^\w\s-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !["a", "an", "the"].includes(word.toLowerCase()))
    .slice(0, 4);

  return (
    words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || "AI Video"
  );
}

function extractTitleFromIdea(idea: string) {
  const titleLine = idea.match(/Title:\s*(.*?)(?:\n|$)/i)?.[1]?.trim();

  if (titleLine) {
    return titleLine;
  }

  return idea.split(". Hook:")[0]?.trim() || idea.trim();
}

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}
