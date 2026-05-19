"use client";

export function ProgressBar({ percentage = 0, size = "md" }) {
  const heightClass =
    size === "sm"
      ? "h-2"
      : size === "md"
        ? "h-3"
        : size === "lg"
          ? "h-4"
          : "h-3";

  const displayPercentage = Math.min(Math.max(percentage, 0), 100);

  return (
    <div
      className={`${heightClass} w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden`}
    >
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
        style={{ width: `${displayPercentage}%` }}
      />
    </div>
  );
}
