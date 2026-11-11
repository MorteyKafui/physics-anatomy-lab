import { R3fBench } from "@/spikes/3d-bench/r3f/bench";
import { SpikeFrame } from "@/spikes/3d-bench/frame";

export default function R3fBenchPage() {
  return (
    <SpikeFrame title="React Three Fiber" note="Real 3D meshes, drawn with WebGL.">
      <R3fBench />
    </SpikeFrame>
  );
}
