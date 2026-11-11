import type { Finding, Rule } from "@pa/analysis";

/**
 * Wiring the Ohm's law circuit (step 3). Every part has terminals, and the student joins them
 * with leads. A circuit is right when its nets (groups of terminals joined by leads) match the
 * circuit diagram's, however the leads are routed; harvested from Physics Bench's set-up check
 * (docs/planning/harvest-review.md).
 *
 * The lab lets a wrong circuit through (except one the safety check blocks) and the solver gives
 * its real readings. When the nets are wrong, the classifier names the mistake from the catalogue
 * by finding the one change that would put them right.
 */

export const TERMINALS = [
  "cell+",
  "cell-",
  "key.1",
  "key.2",
  "R.1",
  "R.2",
  "A+",
  "A-",
  "V+",
  "V-",
  "wire.P",
  "wire.Q",
  "jockey",
] as const;
export type Terminal = (typeof TERMINALS)[number];
export type Lead = readonly [Terminal, Terminal];

/**
 * The circuit diagram: the cell's + to R, R to the ammeter's +, the ammeter's − to Q; the
 * jockey's lead to P; P through the key to the cell's −; the voltmeter across the cell.
 */
export const CORRECT_LEADS: readonly Lead[] = [
  ["cell+", "R.1"],
  ["R.2", "A+"],
  ["A-", "wire.Q"],
  ["jockey", "wire.P"],
  ["wire.P", "key.1"],
  ["key.2", "cell-"],
  ["V+", "cell+"],
  ["V-", "cell-"],
];

/** Each terminal's net: a name shared by every terminal joined to it by leads. */
export function netsOf(leads: readonly Lead[]): (t: Terminal) => string {
  const parent = new Map<string, string>(TERMINALS.map((t) => [t, t]));
  const find = (t: string): string => {
    let r = t;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(t, r);
    return r;
  };
  for (const [a, b] of leads) {
    const x = find(a);
    const y = find(b);
    if (x !== y) parent.set(x, y);
  }
  return (t) => `net:${find(t)}`;
}

/** The nets as sorted groups of terminals, so two wirings can be compared. */
function groups(leads: readonly Lead[]): string {
  const net = netsOf(leads);
  const by = new Map<string, Terminal[]>();
  for (const t of TERMINALS) by.set(net(t), [...(by.get(net(t)) ?? []), t]);
  return [...by.values()]
    .map((g) => g.sort().join(","))
    .sort()
    .join("|");
}

const RIGHT = groups(CORRECT_LEADS);

/** Whether a wiring has the circuit diagram's nets. */
export function wiredRight(leads: readonly Lead[]): boolean {
  return groups(leads) === RIGHT;
}

/** The terminals whose net differs from the diagram's: what the screen marks. */
export function wrongTerminals(leads: readonly Lead[]): Terminal[] {
  const want = netsOf(CORRECT_LEADS);
  const have = netsOf(leads);
  const members = (net: (t: Terminal) => string, t: Terminal) =>
    TERMINALS.filter((x) => net(x) === net(t)).join(",");
  return TERMINALS.filter((t) => members(want, t) !== members(have, t));
}

/** The mistakes the classifier can name, each the one change that would make the circuit right. */
export const WIRING_MISTAKES = [
  "ammeter-reversed",
  "voltmeter-reversed",
  "meters-swapped",
  "voltmeter-across-resistor",
  "jockey-to-q",
] as const;
export type WiringMistake = (typeof WIRING_MISTAKES)[number];

const rename =
  (map: Partial<Record<Terminal, Terminal>>) =>
  (leads: readonly Lead[]): Lead[] =>
    leads.map(([a, b]) => [map[a] ?? a, map[b] ?? b] as const);

/**
 * Each mistake as a change to the student's leads that undoes it. Moving the voltmeter's leads
 * from R's terminals to the cell's is done net-wise: the lead to a terminal in R.1's net goes to
 * cell+ instead (R.1 is joined to cell+ in the diagram, so only V's own leads change).
 */
const UNDO: Record<WiringMistake, (leads: readonly Lead[]) => Lead[]> = {
  "ammeter-reversed": rename({ "A+": "A-", "A-": "A+" }),
  "voltmeter-reversed": rename({ "V+": "V-", "V-": "V+" }),
  // A voltmeter in series and an ammeter across the cell: the two meters in each other's places.
  "meters-swapped": rename({ "A+": "V+", "A-": "V-", "V+": "A+", "V-": "A-" }),
  "voltmeter-across-resistor": (leads) => {
    const net = netsOf(leads);
    const toCell = (other: Terminal): Terminal | undefined => {
      if (net(other) === net("R.1")) return "cell+";
      if (net(other) === net("R.2")) return "cell-";
      return undefined;
    };
    return leads.map(([a, b]) => {
      if (a === "V+" || a === "V-") return [a, toCell(b) ?? b] as const;
      if (b === "V+" || b === "V-") return [toCell(a) ?? a, b] as const;
      return [a, b] as const;
    });
  },
  // The jockey's lead taken to Q, where the ammeter joins, so it cuts out JQ instead of PJ.
  "jockey-to-q": (leads) =>
    leads.map(([a, b]) => {
      if (a === "jockey" && b === "wire.Q") return ["jockey", "wire.P"] as const;
      if (b === "jockey" && a === "wire.Q") return ["wire.P", "jockey"] as const;
      return [a, b] as const;
    }),
};

/** The named mistake, if one change puts the circuit right; undefined for a right or unrecognised circuit. */
export function classifyWiring(leads: readonly Lead[]): WiringMistake | undefined {
  if (wiredRight(leads)) return undefined;
  return WIRING_MISTAKES.find((m) => wiredRight(UNDO[m](leads)));
}

// Written as `key: "…"` so the message-file test finds every key the rules can raise.
const MESSAGE: Record<WiringMistake, { key: string }> = {
  "ammeter-reversed": { key: "findings.ohmsLaw.ammeterReversed" },
  "voltmeter-reversed": { key: "findings.ohmsLaw.voltmeterReversed" },
  "meters-swapped": { key: "findings.ohmsLaw.metersSwapped" },
  "voltmeter-across-resistor": { key: "findings.ohmsLaw.voltmeterAcrossResistor" },
  "jockey-to-q": { key: "findings.ohmsLaw.jockeyToQ" },
};
const UNRECOGNISED = { key: "findings.ohmsLaw.wiringWrong" };

/** Checked when the student finishes wiring (step 4, Check). */
export const wiring: Rule<{ leads: readonly Lead[] }> = {
  id: "ohms-law-wiring",
  skill: "apparatus",
  check: ({ leads }): Finding[] => {
    if (wiredRight(leads)) return [];
    const mistake = classifyWiring(leads);
    return [
      {
        rule: "ohms-law-wiring",
        severity: "error",
        skill: "apparatus",
        key: (mistake ? MESSAGE[mistake] : UNRECOGNISED).key,
        params: { terminals: wrongTerminals(leads).length },
      },
    ];
  },
};

export const WIRING_RULES: Rule<{ leads: readonly Lead[] }>[] = [wiring];
