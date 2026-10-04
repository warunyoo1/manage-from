"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { paymentStatuses, type StatusFilter } from "@/lib/payment-status";
import styles from "./status-select.module.css";

export function StatusSelect({
  value,
  onChange,
  label,
  allowAll = false,
  disabled = false,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  label: string;
  allowAll?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    container: HTMLElement;
  } | null>(null);
  const selected = paymentStatuses.find((status) => status.value === value);
  const options = allowAll
    ? [
        { value: "all", label: "ทุกสถานะ", tone: "all" } as const,
        ...paymentStatuses,
      ]
    : paymentStatuses;

  function open() {
    const rect = trigger.current!.getBoundingClientRect();
    const height = options.length * 40 + 16;
    setPosition({
      container: trigger.current?.closest("dialog") ?? document.body,
      top:
        rect.bottom + height > window.innerHeight
          ? Math.max(8, rect.top - height - 6)
          : rect.bottom + 6,
      left: Math.max(
        8,
        Math.min(rect.left, document.documentElement.clientWidth - 232),
      ),
    });
  }

  useEffect(() => {
    if (!position) return;
    menu.current
      ?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
      ?.focus();
    function outside(event: PointerEvent) {
      if (
        !menu.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setPosition(null);
    }
    function closeOnLayout(event: Event) {
      if (!menu.current?.contains(event.target as Node)) setPosition(null);
    }
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", closeOnLayout);
    window.addEventListener("scroll", closeOnLayout, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", closeOnLayout);
      window.removeEventListener("scroll", closeOnLayout, true);
    };
  }, [position]);

  return (
    <>
      <button
        disabled={disabled}
        ref={trigger}
        type="button"
        className={`${styles.trigger} ${styles[selected?.tone ?? "all"]}`}
        aria-label={`${label}: ${selected?.label ?? "ทุกสถานะ"}`}
        aria-haspopup="menu"
        aria-expanded={!!position}
        aria-controls={position ? id : undefined}
        onClick={() => (position ? setPosition(null) : open())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            open();
          }
        }}
      >
        <span className={styles.dot} />
        {selected?.label ?? "ทุกสถานะ"}
        <span className={styles.chevron} aria-hidden="true">
          ⌄
        </span>
      </button>
      {position &&
        createPortal(
          <div
            ref={menu}
            id={id}
            role="menu"
            aria-label={label}
            className={styles.menu}
            style={{ top: position.top, left: position.left }}
            onKeyDown={(event) => {
              const buttons = Array.from(
                menu.current!.querySelectorAll<HTMLButtonElement>("button"),
              );
              const index = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? buttons.length - 1
                      : (index +
                          (event.key === "ArrowDown" ? 1 : -1) +
                          buttons.length) %
                        buttons.length;
                buttons[next].focus();
              } else if (event.key === "Escape") {
                event.preventDefault();
                setPosition(null);
                trigger.current?.focus();
              } else if (event.key === "Tab") {
                // Return focus before the normal Tab traversal leaves the control.
                setPosition(null);
                trigger.current?.focus();
              }
            }}
          >
            {options.map((option) => (
              <button
                disabled={disabled}
                type="button"
                key={option.value}
                role="menuitemradio"
                aria-checked={value === option.value}
                onClick={() => {
                  onChange(option.value);
                  setPosition(null);
                  trigger.current?.focus();
                }}
              >
                <span className={`${styles.badge} ${styles[option.tone]}`}>
                  <i />
                  {option.label}
                </span>
                {value === option.value && (
                  <span className={styles.check} aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>,
          position.container,
        )}
    </>
  );
}
