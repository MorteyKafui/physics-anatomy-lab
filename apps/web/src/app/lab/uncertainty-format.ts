import { quotedUncertainty } from "@pa/analysis";

/** An uncertainty as it is shown: rounded as it is quoted, "± 0.008" (the uncertainty brief). */
export const showUncertainty = (u: number) => {
  const q = quotedUncertainty(u);
  return `± ${q.value.toFixed(q.decimals)}`;
};
