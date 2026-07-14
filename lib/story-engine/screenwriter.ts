import type {
  CreativeDirection,
  StoryTimeline,
  VoiceoverScript,
} from "./types";

type StoryLineSet = {
  hook: string;
  mystery: string;
  escalation: string;
  reversal: string;
  reveal: string;
  payoff: string;
};

export function createVoiceoverScript(
  creativeDirection: CreativeDirection,
  timeline: StoryTimeline
): VoiceoverScript {
  const lines = createStoryLines(creativeDirection);
  const selectedLines =
    timeline.duration <= 10
      ? [lines.hook, lines.mystery, lines.escalation, lines.reveal, lines.payoff]
      : [
          lines.hook,
          lines.mystery,
          lines.escalation,
          lines.reversal,
          lines.reveal,
          lines.payoff,
        ];

  return {
    estimatedDuration: timeline.duration,
    fullText: selectedLines.map(cleanLine).filter(Boolean).join(" "),
  };
}

function createStoryLines(direction: CreativeDirection): StoryLineSet {
  const idea = direction.idea.toLowerCase();

  if (
    idea.includes("painting") ||
    idea.includes("museum") ||
    idea.includes("gallery") ||
    idea.includes("portrait")
  ) {
    return {
      hook: "The painting was different every night.",
      mystery: "At first, I thought my eyes were tired.",
      escalation: "Then one painted figure turned its head.",
      reversal: "I stepped closer, and the whole room went quiet.",
      reveal: "The people inside the frame were watching me.",
      payoff: "By morning, one of them was standing somewhere new.",
    };
  }

  if (
    idea.includes("freeze time") ||
    idea.includes("stop time") ||
    idea.includes("time stopped") ||
    idea.includes("time freeze")
  ) {
    return {
      hook: "The office froze in the middle of a normal day.",
      mystery: "The clock stopped, but I could still move.",
      escalation: "Coffee hung in the air beside my desk.",
      reversal: "I looked outside, and even the street was still.",
      reveal: "Everyone was trapped in the same exact second.",
      payoff: "I was the only person time forgot.",
    };
  }

  if (
    idea.includes("locksmith") ||
    idea.includes("key") ||
    idea.includes("lock")
  ) {
    return {
      hook: "The first lock opened too easily.",
      mystery: "Then the second one opened with the same key.",
      escalation: "I tried every lock in the workshop.",
      reversal: "By the fourth one, I stopped smiling.",
      reveal: "Every key had become the right key.",
      payoff: "Then the oldest cabinet opened before I touched it.",
    };
  }

  if (
    idea.includes("dog") ||
    idea.includes("cat") ||
    idea.includes("puppy") ||
    idea.includes("kitten") ||
    idea.includes("animal")
  ) {
    return {
      hook: "It noticed the object before anyone else did.",
      mystery: "One tiny touch made it react.",
      escalation: "The room changed in a way it could understand.",
      reversal: "For a second, even the animal froze.",
      reveal: "Then it realized it had caused everything.",
      payoff: "Its final reaction said more than words could.",
    };
  }

  if (
    idea.includes("ghost") ||
    idea.includes("horror") ||
    idea.includes("scary") ||
    idea.includes("haunted")
  ) {
    return {
      hook: "The room was quiet for too long.",
      mystery: "Then one small detail moved by itself.",
      escalation: "I told myself it was nothing.",
      reversal: "But the movement happened again.",
      reveal: "Something in the room knew I was watching.",
      payoff: "The final shadow proved I was not alone.",
    };
  }

  if (
    idea.includes("space") ||
    idea.includes("mars") ||
    idea.includes("robot") ||
    idea.includes("future") ||
    idea.includes("device")
  ) {
    return {
      hook: "The device woke up without warning.",
      mystery: "It reacted before anyone touched it.",
      escalation: "The lights answered like it understood us.",
      reversal: "Then the whole room changed direction.",
      reveal: "The system was not waiting for a command.",
      payoff: "It had already chosen who to follow.",
    };
  }

  return {
    hook: "Something was wrong in the first second.",
    mystery: direction.emotionalTrigger,
    escalation: direction.coreConflict,
    reversal: "The closer I looked, the less normal it became.",
    reveal: "Then the proof appeared right in front of me.",
    payoff: direction.payoff,
  };
}

function cleanLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}
