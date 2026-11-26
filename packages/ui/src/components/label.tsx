"use client";

import * as React from "react";
import { labelIdFor } from "@pa/ui/lib/label-id";
import { cn } from "@pa/ui/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      // Names a Base UI control with the same id in the server HTML (see lib/label-id).
      id={props.id ?? (props.htmlFor ? labelIdFor(props.htmlFor) : undefined)}
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-xs leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
