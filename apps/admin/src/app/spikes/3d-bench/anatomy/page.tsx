import { buildPendulum } from "@/spikes/3d-bench/anatomy/scene.mjs";
import { AnatomyLive } from "@/spikes/3d-bench/anatomy/live";
import { SpikeFrame } from "@/spikes/3d-bench/frame";

export const dynamic = "force-static";

// The scene is solved once, at build time, on the server: the browser gets the drawn rest pose
// and the runtime's data, and no geometry builder.
const scene = buildPendulum();

export default function AnatomyBench() {
  return (
    <SpikeFrame
      title="Anatomy 3D"
      note={`${scene.report.parts} parts, drawn as SVG by the kit's own rules every frame.`}
    >
      <AnatomyLive stage={scene.stage} data={scene.data} css={scene.css} />
    </SpikeFrame>
  );
}
