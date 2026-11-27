"use client";

import { RiCollapseDiagonalLine, RiExpandDiagonalSLine } from "@remixicon/react";
import { Focusable } from "react-aria-components";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { useTemplateCopy } from "@/components/foundations/template-copy/template-copy";

type PanelActionProps = {
  icon: typeof RiExpandDiagonalSLine;
  label: string;
  onClick?: () => void;
  pressed?: boolean;
};

export function PanelAction({ icon: Icon, label, onClick, pressed }: PanelActionProps) {
  const localize = useTemplateCopy();
  return localize(
    <TooltipTrigger delay={200}>
      <Focusable>
        <button
          type="button"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
          className="group flex cursor-pointer items-center rounded-md p-0.5 outline-none transition-colors duration-150 ease hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          <Icon aria-hidden className="size-[18px] text-foreground-icon-secondary transition-colors duration-150 ease group-hover:text-foreground-icon-primary" />
        </button>
      </Focusable>
      <Tooltip size="sm">{label}</Tooltip>
    </TooltipTrigger>
  );
}

export type PanelExpandProps = { isExpanded: boolean; onToggleExpand: () => void };

export function PanelExpandButton({ isExpanded, onToggleExpand }: PanelExpandProps) {
  return (
    <PanelAction
      icon={isExpanded ? RiCollapseDiagonalLine : RiExpandDiagonalSLine}
      label={isExpanded ? "收缩面板" : "展开面板"}
      pressed={isExpanded}
      onClick={onToggleExpand}
    />
  );
}
