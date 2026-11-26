"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "@pa/ui/lib/utils";

/**
 * A menu that opens from a button: arrow keys move through it, Enter chooses, Escape closes and
 * gives focus back to the button (Base UI). The lab's Switch practical menu uses it (LabOpen board).
 * Square corners (Lyra), tokens only.
 */
function Menu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="menu" {...props} />;
}

function MenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />;
}

function MenuContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  children,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "anchor" | "side" | "sideOffset"
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <MenuPrimitive.Popup
          data-slot="menu-content"
          className={cn(
            "z-50 flex max-w-[calc(100vw-2rem)] origin-(--transform-origin) flex-col rounded-none border border-[var(--pa-line-strong)] bg-surface p-1.5 text-sm text-foreground shadow-lg outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

/** A menu item that is a link: pass `render` to make it the app's own link component. */
function MenuLinkItem({ className, ...props }: MenuPrimitive.LinkItem.Props) {
  return (
    <MenuPrimitive.LinkItem
      data-slot="menu-link-item"
      className={cn(
        "flex items-center gap-2.5 rounded-none border-l-2 border-transparent p-2.5 text-foreground no-underline outline-none data-highlighted:bg-raised",
        className,
      )}
      {...props}
    />
  );
}

export { Menu, MenuContent, MenuLinkItem, MenuTrigger };
