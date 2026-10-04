import type { CSSProperties } from "react";

export type IconName =
  | "grid"
  | "plus"
  | "search"
  | "bookmark"
  | "arrow"
  | "back"
  | "chevron"
  | "download"
  | "close"
  | "folder"
  | "check"
  | "filter"
  | "check-circle"
  | "clock"
  | "pause"
  | "file-search"
  | "users"
  | "arrow-up-right";
const paths: Record<IconName, string> = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  plus: "M12 5v14 M5 12h14",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  bookmark: "M6 3h12v18l-6-4-6 4z",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  back: "M19 12H5 M11 6l-6 6 6 6",
  chevron: "M8 10l4 4 4-4",
  download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
  close: "M6 6l12 12 M6 18L18 6",
  folder: "M3 7V4h7l2 3h9v13H3z",
  check: "M5 12l4 4L19 6",
  filter: "M4 6h16 M7 12h10 M10 18h4",
  "check-circle": "M22 11.1V12a10 10 0 1 1-5.9-9.1 M22 4L12 14l-3-3",
  clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 6v6l4 2",
  pause: "M8 5v14 M16 5v14",
  "file-search":
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8 M14 2v6h6 M14 2l6 6v3 M21 16a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M20 19l3 3",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8",
  "arrow-up-right": "M7 17L17 7 M7 7h10v10",
};

export function Icon({
  name,
  size = 18,
  filled = false,
  style,
}: {
  name: IconName;
  size?: number;
  filled?: boolean;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
