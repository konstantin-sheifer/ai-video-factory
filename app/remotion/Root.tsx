import { Composition } from "remotion";
import { AIShortVideo } from "./AIShortVideo";

export default function Root() {
  return (
    <Composition
      id="AIShortVideo"
      component={AIShortVideo}
      durationInFrames={270}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        title: "AI Video",
        hook: "",
        scenes: [],
        voiceover: "",
        audioUrl: "",
      }}
    />
  );
}