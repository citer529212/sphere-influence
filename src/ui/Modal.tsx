import { ReactNode, useEffect, useRef } from "react";
export function Modal({
  titleId,
  onClose,
  children,
  className = "",
}: {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current
      ?.querySelector<HTMLElement>("[data-autofocus],button,a[href],textarea")
      ?.focus();
    const overlay = panel.current?.parentElement;
    const siblings = Array.from(overlay?.parentElement?.children ?? []).filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node !== overlay,
    );
    const previousInert = siblings.map((node) => node.inert);
    siblings.forEach((node) => (node.inert = true));
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href],textarea,input,select,summary",
        ) ?? [],
      ).filter((node) => node.getClientRects().length > 0);
      const first = nodes[0],
        last = nodes.at(-1);
      if (!first) return;
      if (
        !panel.current?.contains(document.activeElement) ||
        document.activeElement?.hasAttribute("data-autofocus")
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      siblings.forEach((node, i) => (node.inert = previousInert[i]));
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="result-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div ref={panel} className={`result-box ${className}`}>
        {children}
      </div>
    </div>
  );
}
