import type {
  CreativeDirection,
  StoryTimeline,
  VisualDirection,
} from "./types";

type ShotPlan = {
  hook: string;
  discovery: string;
  action: string;
  reveal: string;
  payoff: string;
};

export function createVisualDirection(
  creativeDirection: CreativeDirection,
  timeline: StoryTimeline
): VisualDirection {
  const idea = creativeDirection.idea.toLowerCase();

  if (isMuseumPaintingIdea(idea)) {
    return {
      visualStyle:
        "ultra-realistic cinematic museum thriller, premium realistic lighting, detailed painting texture, subtle eerie atmosphere, high-end commercial look",
      mainSubject:
        "one realistic museum security guard, adult human, dark security uniform, flashlight in hand, cautious posture, same face, same uniform, same body proportions throughout",
      environment:
        "one quiet museum gallery at night, large framed classical painting on the wall, polished floor, dim warm spotlights, soft shadows, empty hallway depth, realistic museum details",
      camera:
        "slow controlled push-in from behind the guard toward the painting, stable camera, no fast cuts, no montage",
      lighting:
        "dim museum night lighting, warm spotlights on the painting, soft shadows, clear subject visibility, realistic reflections on polished floor",
      colorPalette:
        "deep navy shadows, warm gold spotlight, muted museum wall tones, realistic skin tones",
      continuityRules: [
        "one security guard only",
        "one painting only as the central visual event",
        "same museum gallery for the entire clip",
        "the painting must become the focus of the final seconds",
        "movement inside the painting must be subtle but visible",
        "no random visitors, no monsters, no text overlays, no logos",
      ],
    };
  }

  if (isTimeFreezeIdea(idea)) {
    return {
      visualStyle:
        "ultra-realistic cinematic commercial style, sharp detail, natural office lighting, subtle slow-motion realism, high production quality",
      mainSubject:
        "one tired realistic office worker, adult human, neat dark hair, slightly exhausted face, business-casual shirt, same face and outfit throughout",
      environment:
        "one modern glass office with desks, laptop, coffee mug, wall clock, papers, soft screens, panoramic windows, warm daylight, realistic corporate depth",
      camera:
        "slow controlled cinematic push-in from the desk toward the worker, stable camera, subject centered, no fast cuts",
      lighting:
        "clean realistic commercial office lighting, warm daylight, soft highlights, clear subject visibility",
      colorPalette:
        "neutral office tones, soft blue screen glow, warm daylight, realistic skin tones",
      continuityRules: [
        "same office worker from first frame to last frame",
        "same face, outfit, body proportions, and scale",
        "same office location for the entire clip",
        "coffee droplets, papers, wall clock, and outside street must stay visually connected to the time-freeze idea",
        "no cuts, no scene changes, no random objects, no text overlays, no logos",
      ],
    };
  }

  if (isLocksmithIdea(idea)) {
    return {
      visualStyle:
        "ultra-realistic cinematic workshop mystery, tactile metal detail, premium dramatic lighting, realistic hand motion",
      mainSubject:
        "one realistic locksmith, adult human, work apron, slightly worn hands, focused expression, holding a brass key, same face and outfit throughout",
      environment:
        "one old locksmith workshop, wall of keys, wooden workbench, brass locks, metal tools, warm lamp light, shallow depth of field",
      camera:
        "slow close tracking shot across the workbench to the locksmith's hands, stable cinematic framing, no cuts",
      lighting:
        "warm practical workshop lamp, soft shadows, golden reflections on brass keys, clear hand visibility",
      colorPalette:
        "warm brass, dark wood, muted green walls, amber light, realistic skin tones",
      continuityRules: [
        "one locksmith only",
        "same workshop for the entire clip",
        "keys and locks must remain the central visual elements",
        "the final opening lock must be clear and physical",
        "no magic glow, no fantasy castle, no random objects, no text overlays",
      ],
    };
  }

  if (isSubwayPhoneIdea(idea)) {
    return {
      visualStyle:
        "ultra-realistic cinematic urban mystery, moody subway lighting, grounded realistic detail, premium thriller atmosphere",
      mainSubject:
        "one realistic subway cleaner, adult human, work uniform, cleaning gloves, holding a smartphone, cautious expression, same face and outfit throughout",
      environment:
        "one empty subway platform late at night, tiled walls, fluorescent lights, cleaning cart, wet floor reflections, benches, tunnel darkness in the background",
      camera:
        "slow controlled push-in from the cleaning cart toward the phone in the cleaner's hand, stable camera, no fast cuts",
      lighting:
        "cool fluorescent subway lighting, soft reflections on wet floor, clear face visibility, subtle tunnel shadows",
      colorPalette:
        "cool blue-green subway tones, white fluorescent highlights, dark tunnel shadows, realistic skin tones",
      continuityRules: [
        "one subway cleaner only",
        "same subway platform for the entire clip",
        "smartphone must remain the central object",
        "phone screen must visibly display a future warning without readable text dependency",
        "no forest, no office, no random laptop, no random glowing sci-fi orb",
        "no cuts, no scene changes, no text overlays, no logos",
      ],
    };
  }

  if (isMannequinIdea(idea)) {
    return {
      visualStyle:
        "ultra-realistic cinematic shopping mall thriller, empty mall atmosphere, premium realistic lighting, subtle suspense",
      mainSubject:
        "one realistic night janitor, adult human, janitor uniform, cleaning cart, cautious posture, same face and outfit throughout",
      environment:
        "one closed shopping mall corridor at night, clothing store windows, mannequins behind glass, polished floor reflections, dim security lights, empty storefronts",
      camera:
        "slow tracking shot beside the janitor and cleaning cart, stable camera, no fast cuts",
      lighting:
        "dim mall security lighting, storefront glow, soft reflections on polished floor, clear subject visibility",
      colorPalette:
        "cool blue mall shadows, muted storefront lights, pale mannequin tones, realistic skin tones",
      continuityRules: [
        "one janitor only",
        "same shopping mall corridor for the entire clip",
        "mannequins must be visible and change position between moments",
        "no forest, no road, no running athlete, no daylight outdoor scene",
        "no random shoppers, no monsters, no text overlays, no logos",
      ],
    };
  }

  return {
    visualStyle:
      "ultra-realistic cinematic short-form video, polished commercial look, sharp realistic detail, premium lighting, coherent production design",
    mainSubject:
      "one specific stable main subject from the user's idea, clear silhouette, same colors, same proportions, same design throughout",
    environment:
      "one specific cinematic location directly matching the user's idea, stable background, clear lighting, controlled atmosphere, visible depth",
    camera:
      "slow cinematic push-in or gentle tracking movement, stable camera, no fast cuts, no montage",
    lighting:
      "polished cinematic lighting with clear subject visibility, realistic contrast, professional commercial look",
    colorPalette:
      "realistic cinematic colors, clean contrast, premium commercial look",
    continuityRules: [
      "same subject from first frame to last frame",
      "same environment for the entire clip",
      "one continuous shot only",
      "one clear visible event",
      "no cuts, no scene changes, no unrelated background, no text overlays, no logos",
    ],
  };
}

export function createRunwayPrompt(input: {
  creativeDirection: CreativeDirection;
  timeline: StoryTimeline;
  visualDirection: VisualDirection;
}) {
  const { creativeDirection, timeline, visualDirection } = input;
  const shotPlan = createShotPlan(creativeDirection);

  return [
    `Vertical 9:16 ${timeline.duration}-second ultra-realistic AI video.`,
    "IMPORTANT: create a visual scene, not a narration video.",
    "One continuous shot only. No cuts. No montage. No scene changes.",
    "Do not show subtitles, captions, readable overlays, watermarks, or logos.",
    "Do not create a random generic stock video. Follow the exact user idea.",
    `USER IDEA: ${creativeDirection.idea}.`,
    `GENRE: ${creativeDirection.genre}.`,
    `MAIN SUBJECT LOCK: ${visualDirection.mainSubject}.`,
    `LOCATION LOCK: ${visualDirection.environment}.`,
    `VISUAL STYLE: ${visualDirection.visualStyle}.`,
    `CAMERA: ${visualDirection.camera}.`,
    `LIGHTING: ${visualDirection.lighting}.`,
    `COLOR PALETTE: ${visualDirection.colorPalette}.`,
    `CONTINUITY RULES: ${visualDirection.continuityRules.join("; ")}.`,
    "SHOT PLAN:",
    `0-2s: ${shotPlan.hook}`,
    `2-4s: ${shotPlan.discovery}`,
    `4-6s: ${shotPlan.action}`,
    `6-8s: ${shotPlan.reveal}`,
    `8-10s: ${shotPlan.payoff}`,
    "The final seconds must clearly prove the impossible event through visible physical evidence.",
    "The important object must stay visible and drive the action.",
    "Avoid generic hand waving, sitting, posing, walking, running, or looking around unless it directly reveals the event.",
    "Absolutely avoid: random forest, road, athlete, generic woman at desk, unrelated glowing orb, distorted face, extra limbs, duplicated character, random visitors, random monsters, scene transition, location change.",
  ].join(" ");
}

function createShotPlan(creativeDirection: CreativeDirection): ShotPlan {
  const idea = creativeDirection.idea.toLowerCase();

  if (isSubwayPhoneIdea(idea)) {
    return {
      hook:
        "An empty subway platform at night; a cleaner finds a smartphone glowing on the wet floor beside the cleaning cart.",
      discovery:
        "The cleaner picks up the phone and sees the screen flash a future warning; their face changes from confusion to fear.",
      action:
        "The cleaner slowly turns toward the dark tunnel as the phone vibrates again in their hand.",
      reveal:
        "The platform lights flicker in the exact pattern predicted by the phone; the cleaner steps back.",
      payoff:
        "The phone shows one final warning as the tunnel lights switch on behind them, proving it receives messages from tomorrow.",
    };
  }

  if (isMannequinIdea(idea)) {
    return {
      hook:
        "A closed shopping mall corridor at night; a janitor pushes a cleaning cart past a clothing store window full of mannequins.",
      discovery:
        "The janitor looks away for one second, then turns back and notices one mannequin has changed position.",
      action:
        "The janitor freezes, slowly raises a flashlight, and checks the store window again.",
      reveal:
        "Several mannequins are now closer to the glass, facing the janitor in new poses.",
      payoff:
        "The final mannequin places one hand against the glass while the janitor stands motionless in the empty mall.",
    };
  }

  if (isMuseumPaintingIdea(idea)) {
    return {
      hook:
        "A quiet museum gallery at night; a security guard stands in front of one large classical painting.",
      discovery:
        "The guard shines a flashlight on the painting and notices one painted figure has turned its head.",
      action:
        "The guard steps closer, keeping the flashlight fixed on the painted figures inside the frame.",
      reveal:
        "The figures inside the painting subtly shift positions while the frame and gallery remain still.",
      payoff:
        "One painted figure looks directly at the guard from a new position, proving the painting moved.",
    };
  }

  if (isTimeFreezeIdea(idea)) {
    return {
      hook:
        "A modern office freezes mid-moment; coffee droplets hang in the air beside a tired worker's desk.",
      discovery:
        "The worker looks at the frozen wall clock and realizes only they can still move.",
      action:
        "The worker slowly reaches toward the suspended coffee droplets without disturbing them.",
      reveal:
        "Papers, screen reflections, and people outside the window remain perfectly motionless.",
      payoff:
        "The worker stands alone in the frozen office while everything else stays trapped in the same second.",
    };
  }

  if (isLocksmithIdea(idea)) {
    return {
      hook:
        "Inside an old locksmith workshop, one brass key turns in a lock it should not open.",
      discovery:
        "The locksmith stares at the open lock, then grabs a different locked box from the workbench.",
      action:
        "The locksmith tries the same key again and the second lock opens instantly.",
      reveal:
        "Several locks on the workbench click open one after another as the key passes over them.",
      payoff:
        "The oldest locked cabinet opens before the key touches it, proving every key now opens every lock.",
    };
  }

  return {
    hook: `Show the user's exact idea clearly in one matching location: ${creativeDirection.viralMechanism}.`,
    discovery: `The main subject notices the central problem: ${creativeDirection.coreConflict}.`,
    action: "The subject performs one specific physical action that tests the impossible event.",
    reveal: "The environment responds in a clear visible way, proving the event is real.",
    payoff: creativeDirection.payoff,
  };
}

function isMuseumPaintingIdea(idea: string) {
  return (
    idea.includes("painting") ||
    idea.includes("museum") ||
    idea.includes("gallery") ||
    idea.includes("portrait")
  );
}

function isTimeFreezeIdea(idea: string) {
  return (
    idea.includes("freeze time") ||
    idea.includes("stop time") ||
    idea.includes("time stopped") ||
    idea.includes("time freeze")
  );
}

function isLocksmithIdea(idea: string) {
  return idea.includes("locksmith") || idea.includes("key") || idea.includes("lock");
}

function isSubwayPhoneIdea(idea: string) {
  return (
    idea.includes("subway") ||
    idea.includes("phone") ||
    idea.includes("future message") ||
    idea.includes("24 hours in the future")
  );
}

function isMannequinIdea(idea: string) {
  return (
    idea.includes("mannequin") ||
    idea.includes("shopping mall") ||
    idea.includes("closed mall") ||
    idea.includes("janitor")
  );
}
