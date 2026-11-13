import { quotedUncertainty } from "@pa/analysis";

/** An uncertainty as it is shown: rounded as it is quoted, "± 0.008" (the uncertainty brief). */
export const showUncertainty = (u: number) => {
  const q = quotedUncertainty(u);
  return `± ${q.value.toFixed(q.decimals)}`;
};

/**
 * A result with its uncertainty as a report writes it: the uncertainty rounded as it is quoted,
 * the value to the same decimal place, a true minus sign: "−54.1 ± 0.6".
 */
export const quoteWithUncertainty = (value: number, u: number) => {
  const q = quotedUncertainty(u);
  return `${value.toFixed(q.decimals).replace("-", "−")} ± ${q.value.toFixed(q.decimals)}`;
};
