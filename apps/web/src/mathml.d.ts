import type { Attributes, HTMLAttributes, ReactNode } from "react";

/**
 * MathML elements the formula cards use. Browsers draw them natively, but React's types do not
 * list them, so they are declared here.
 */
type MathMLProps = Attributes & HTMLAttributes<HTMLElement> & { children?: ReactNode };

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      math: MathMLProps & { display?: "block" | "inline" };
      mi: MathMLProps;
      mn: MathMLProps;
      mo: MathMLProps;
      mrow: MathMLProps;
      mfrac: MathMLProps;
      msqrt: MathMLProps;
      msup: MathMLProps;
    }
  }
}
