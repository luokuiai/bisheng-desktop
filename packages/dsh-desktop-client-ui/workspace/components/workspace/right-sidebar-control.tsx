"use client";

import { createContext, forwardRef, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RiSideBarFill } from "@remixicon/react";
import { IconButton, type IconButtonProps } from "@/components/base/buttons/icon-button";

type ToolbarHost = {
  slot: HTMLSpanElement | null;
  setSlot: (node: HTMLSpanElement | null) => void;
};

const ToolbarContext = createContext<ToolbarHost | null>(null);
const slotReady = "luokui:workspace-right-sidebar-slot-ready";

export function RightSidebarToolbarProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLSpanElement | null>(null);
  return <ToolbarContext.Provider value={{ slot, setSlot }}>{children}</ToolbarContext.Provider>;
}

export function RightSidebarToolbarSlot() {
  const host = useContext(ToolbarContext);
  return <span ref={host?.setSlot} data-workspace-web-right-sidebar-slot className="inline-flex shrink-0 items-center empty:hidden" />;
}

function subscribeToNativeToolbar(onReady: () => void) {
  document.addEventListener(slotReady, onReady);
  return () => document.removeEventListener(slotReady, onReady);
}

const getNativeSlot = () => document.querySelector<HTMLElement>("[data-workspace-right-sidebar-slot]");
const getServerSlot = () => null;

/** A component preview keeps its local trigger. A workspace page owns a single
 * trigger in its toolbar, with Electron's native window taking precedence. */
export function RightSidebarControl({ children }: { children: ReactNode }) {
  const host = useContext(ToolbarContext);
  const nativeSlot = useSyncExternalStore(subscribeToNativeToolbar, getNativeSlot, getServerSlot);
  if (!host) return children;
  if (!host.slot) return null;
  return createPortal(children, nativeSlot ?? host.slot);
}

type RightSidebarButtonProps = Omit<IconButtonProps, "icon" | "aria-label"> & {
  label: string;
  expanded: boolean;
  controls?: string;
};

export const RightSidebarButton = forwardRef<HTMLButtonElement, RightSidebarButtonProps>(function RightSidebarButton({ label, expanded, controls, ...props }, ref) {
  return (
    <IconButton
      ref={ref}
      icon={RiSideBarFill}
      className="sidebar-tool-button"
      data-workspace-right-sidebar-toggle
      title={label}
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={controls}
      {...props}
    />
  );
})
