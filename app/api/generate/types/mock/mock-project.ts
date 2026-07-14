export const mockProject = {
  id: "project_001",

  userId: "user_demo_001",

  title: "The Last Lightkeeper",

  idea:
    "A cinematic short about a lonely lighthouse keeper who discovers a mysterious light in the ocean.",

  mode: "custom",

  status: "preview",

  durationTarget: 30,

  aspectRatio: "9:16",

  createdAt: new Date().toISOString(),

  updatedAt: new Date().toISOString(),

  characters: [
    {
      id: "character_001",

      projectId: "project_001",

      name: "Elias",

      role: "Main character",

      age: "late 50s",

      appearance:
        "Weathered face, gray beard, tired blue eyes, strong hands, calm but haunted expression.",

      outfit:
        "Old dark wool coat, fisherman sweater, worn boots, brass pocket watch.",

      personality:
        "Quiet, patient, lonely, deeply observant, carries old grief but remains kind.",

      voiceStyle:
        "Low, warm, slightly rough male voice with a slow cinematic delivery.",

      consistencyPrompt:
        "Elias must always appear as the same older lighthouse keeper with a gray beard, tired blue eyes, dark wool coat, fisherman sweater, worn boots, and a calm haunted expression.",
    },
  ],

  scenes: [
    {
      id: "scene_001",

      projectId: "project_001",

      sceneNumber: 1,

      title: "The Storm Approaches",

      narrationText:
        "For forty years, Elias kept the lighthouse alive through every storm.",

      visualDescription:
        "A lonely lighthouse stands on black cliffs as massive waves crash below.",

      cameraDirection:
        "Slow cinematic push-in toward the lighthouse through heavy rain and fog.",

      mood: "lonely, dramatic, mysterious",

      location: "remote lighthouse on black ocean cliffs",

      charactersInScene: ["character_001"],

      continuityNotes:
        "Keep Elias wearing the same dark wool coat and fisherman sweater.",

      prompt:
        "Cinematic vertical 9:16 shot of a remote lighthouse during a violent storm, realistic film look.",

      durationSeconds: 8,

      status: "preview",
    },
  ],

  styleBibleId: "style_001",

  voiceover: {
    id: "voiceover_001",

    projectId: "project_001",

    provider: "mock",

    script:
      "For forty years, Elias kept the lighthouse alive through every storm.",

    durationSeconds: 30,
  },

  subtitles: {
    id: "subtitles_001",

    projectId: "project_001",

    language: "en",
  },

  hashtags: {
    id: "hashtags_001",

    projectId: "project_001",

    hashtags: [
      "#AIVideo",
      "#CinematicShorts",
      "#Storytelling",
    ],
  },
};