// The pendulum stand, assembled, as the practicals board draws it (design/mockups/Practicals.dc.html,
// the same drawing as the landing page's "Every part has a job", with every part in place). Its
// viewBox is PENDULUM_STAND_VIEWBOX.

/** The stand drawing's own units, as an SVG viewBox. */
export const PENDULUM_STAND_VIEWBOX = "90 -10 400 350";

const EDGE = { stroke: "#2A2928", strokeWidth: 1, strokeLinejoin: "round" } as const;
const INK = "#141414";

/** Base plate, rod, boss and clamp, split cork, thread, bob and stopwatch. */
export function PendulumStandStage() {
  return (
    <>
      <g {...EDGE}>
        <polygon points="166.5,253.0 279.1,318.0 279.1,308.0 166.5,243.0" fill="#E3DFD3" />
        <polygon points="353.5,275.0 279.1,318.0 279.1,308.0 353.5,265.0" fill="#D3CEC0" />
        <polygon points="240.9,200.0 353.5,265.0 279.1,308.0 166.5,243.0" fill="#F7F5EF" />
      </g>
      <g {...EDGE}>
        <polygon points="221.0,233.5 227.1,237.0 227.1,47.0 221.0,43.5" fill="#E4E2DB" />
        <polygon points="233.2,233.5 227.1,237.0 227.1,47.0 233.2,43.5" fill="#CFCCC4" />
        <polygon points="227.1,40.0 233.2,43.5 227.1,47.0 221.0,43.5" fill="#FFFFFF" />
      </g>
      <g {...EDGE}>
        <polygon points="212.4,83.5 227.1,92.0 227.1,76.0 212.4,67.5" fill="#A9A69E" />
        <polygon points="241.8,83.5 227.1,92.0 227.1,76.0 241.8,67.5" fill="#8F8C86" />
        <polygon points="227.1,59.0 241.8,67.5 227.1,76.0 212.4,67.5" fill="#D9D6CE" />
        <polygon points="232.3,84.0 292.9,119.0 292.9,113.0 232.3,78.0" fill="#BDBAB2" />
        <polygon points="297.2,116.5 292.9,119.0 292.9,113.0 297.2,110.5" fill="#A9A69E" />
        <polygon points="236.6,75.5 297.2,110.5 292.9,113.0 232.3,78.0" fill="#E9E7E1" />
      </g>
      <g {...EDGE}>
        <polygon points="286.8,131.5 295.5,136.5 295.5,118.5 286.8,113.5" fill="#C99A68" />
        <polygon points="305.9,130.5 295.5,136.5 295.5,118.5 305.9,112.5" fill="#B3854F" />
        <polygon points="297.2,107.5 305.9,112.5 295.5,118.5 286.8,113.5" fill="#E4BC8E" />
      </g>
      <polyline points="296.4,131.0 296.4,221.0" fill="none" stroke={INK} strokeWidth="1.6" />
      <circle cx="296.4" cy="233.0" r="13" fill="#F0482A" stroke={INK} strokeWidth="1.2" />
      <circle cx="292.4" cy="229.0" r="4" fill="#FFB3A1" />
      <line
        x1="278.4"
        y1="233.0"
        x2="314.4"
        y2="233.0"
        stroke={INK}
        strokeWidth="1"
        strokeDasharray="2 2"
      />
      <path
        d="M133.0 285.0 L133.0 295.0 A30 15 0 0 0 193.0 295.0 L193.0 285.0 Z"
        fill="#2B2A28"
        stroke={INK}
        strokeWidth="1"
      />
      <ellipse
        cx="163.0"
        cy="285.0"
        rx="30"
        ry="15"
        fill="#FFFFFF"
        stroke={INK}
        strokeWidth="1.2"
      />
      <ellipse
        cx="163.0"
        cy="285.0"
        rx="23"
        ry="11.5"
        fill="#F7F5EE"
        stroke={INK}
        strokeWidth="0.8"
      />
      <line x1="163.0" y1="285.0" x2="175.0" y2="280.0" stroke="#F0482A" strokeWidth="2" />
      <line x1="163.0" y1="285.0" x2="157.0" y2="278.0" stroke={INK} strokeWidth="1.6" />
      <rect x="159.0" y="264.0" width="8" height="8" fill={INK} />
    </>
  );
}
