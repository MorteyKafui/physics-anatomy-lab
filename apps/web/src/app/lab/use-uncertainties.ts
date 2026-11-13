"use client";

import { useEffect, useState } from "react";

/**
 * Whether the advanced uncertainty layer is on (docs/content/uncertainty-brief.md, decision 1):
 * off by default, and remembered on this device. A page whose report is in the university format
 * may start it on; the student's own choice, once made, wins.
 */
const KEY = "pa.uncertainties";

export function useUncertainties(startOn = false): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(startOn);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once, after mount
      if (saved !== null) setOn(saved === "on");
    } catch {
      // No storage here (a private window): the default stands.
    }
  }, []);
  const set = (next: boolean) => {
    setOn(next);
    try {
      localStorage.setItem(KEY, next ? "on" : "off");
    } catch {
      // As above.
    }
  };
  return [on, set];
}
