import { forwardRef } from "react";
import type { ButtonHTMLAttributes, Ref } from "react";
import { RiCloseLine } from "@remixicon/react";
import { cx, sortCx } from "@/utils/cx";

type CloseButtonSize = "2xs" | "xs" | "sm" | "md";

export interface CloseButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  size?: CloseButtonSize;
  "aria-label": string;
  ref?: Ref<HTMLButtonElement>;
}

const styles = sortCx({
  base: [
    "dshModalCloseButton inline-flex shrink-0 items-center justify-center rounded-full",
    "bg-background-tertiary-default text-foreground-icon-secondary",
    "select-none cursor-pointer transition-colors duration-150 ease hover:bg-background-tertiary-hover",
    "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
  ].join(" "),
  container: {
    "2xs": "size-4",
    xs: "size-5",
    sm: "size-6",
    md: "size-8",
  },
  glyph: {
    "2xs": "size-3",
    xs: "size-3.5",
    sm: "size-4",
    md: "size-5",
  },
});

export const CloseButton = forwardRef<HTMLButtonElement, CloseButtonProps>(function CloseButton({
  size = "xs",
  className,
  type = "button",
  ...props
}, ref) {
  return (
    <button ref={ref} type={type} className={cx(styles.base, styles.container[size], className)} {...props}>
      <RiCloseLine className={styles.glyph[size]} aria-hidden />
    </button>
  );
});
