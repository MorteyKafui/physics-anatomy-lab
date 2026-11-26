// Base UI draws checkboxes, switches and radios as a <span role=…> beside a hidden <input>. A
// <label htmlFor> names the hidden input, and Base UI only copies that name onto the span in an
// effect after hydration, so the page's first HTML has controls with no accessible name. Both
// sides here agree on Base UI's own id, `${id}-label`, so the name is in the server HTML too.

/** The id a control's `<Label htmlFor={id}>` carries. */
export const labelIdFor = (id: string) => `${id}-label`;

/**
 * `aria-labelledby` for a control with an `id`, unless it is named another way already.
 * An empty `aria-label` does not count, as Base UI ignores it too.
 */
export function labelledBy(props: {
  id?: string | undefined;
  "aria-label"?: string | undefined;
  "aria-labelledby"?: string | undefined;
}): string | undefined {
  if (props["aria-labelledby"] !== undefined) return props["aria-labelledby"];
  if (props["aria-label"]?.trim() || !props.id) return undefined;
  return labelIdFor(props.id);
}
