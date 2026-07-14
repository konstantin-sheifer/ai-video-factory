import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

type Scene = {
  title?: string;
  sceneTitle?: string;
  description?: string;
  sceneDescription?: string;
  image?: string;
};

type Props = {
  title?: string;
  hook?: string;
  voiceover?: string;
  audioUrl?: string;
  scenes?: Scene[];
};

const SCENE_DURATION = 90;

export const AIShortVideo: React.FC<Props> = ({
  voiceover = "",
  audioUrl = "",
  scenes = [],
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: "black",
        fontFamily: "Arial, sans-serif",
        color: "white",
      }}
    >
      {/* Background music */}
      <Audio
        src={staticFile("music/background.mp3")}
        volume={0.12}
      />

      {/* Voiceover */}
      {audioUrl ? <Audio src={audioUrl} volume={1} /> : null}

      {scenes.map((scene, index) => (
        <Sequence
          key={index}
          from={index * SCENE_DURATION}
          durationInFrames={SCENE_DURATION}
        >
          <SceneBlock scene={scene} />
        </Sequence>
      ))}

      <SubtitleBlock voiceover={voiceover} frame={frame} />
    </AbsoluteFill>
  );
};

function SceneBlock({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();

  const zoom = interpolate(frame, [0, SCENE_DURATION], [1.04, 1.18]);

  const moveY = interpolate(frame, [0, SCENE_DURATION], [10, -18]);

  const moveX = interpolate(frame, [0, SCENE_DURATION], [-8, 8]);

  const imageSrc = scene.image?.startsWith("data:image")
    ? scene.image
    : `data:image/png;base64,${scene.image}`;

  return (
    <AbsoluteFill
      style={{
        background: "black",
        overflow: "hidden",
      }}
    >
      <Img
        src={imageSrc}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${zoom}) translate(${moveX}px, ${moveY}px)`,
        }}
      />

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.05), rgba(0,0,0,0.2))",
        }}
      />
    </AbsoluteFill>
  );
}

function SubtitleBlock({
  voiceover,
  frame,
}: {
  voiceover: string;
  frame: number;
}) {
  const words = voiceover
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (!words.length) return null;

  const wordsPerChunk = 5;
  const chunkDuration = 45;

  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
  }

  const currentChunkIndex = Math.min(
    Math.floor(frame / chunkDuration),
    chunks.length - 1
  );

  const text = chunks[currentChunkIndex];

  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: 80,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.72)",
          border: "3px solid rgba(34,211,238,0.9)",
          color: "white",
          fontSize: 44,
          lineHeight: 1.2,
          fontWeight: 900,
          textAlign: "center",
          padding: "20px 30px",
          borderRadius: 24,
          textShadow: "0 3px 12px rgba(0,0,0,0.9)",
          boxShadow: "0 0 30px rgba(34,211,238,0.25)",
          maxWidth: 900,
        }}
      >
        {text}
      </div>
    </div>
  );
}