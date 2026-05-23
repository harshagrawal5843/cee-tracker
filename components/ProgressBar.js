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

  // Dynamic gradient based on progress
  const gradientClass =
    displayPercentage >= 75
      ? "from-green-500 to-emerald-500"
      : displayPercentage >= 50
        ? "from-blue-500 to-cyan-500"
        : displayPercentage >= 25
          ? "from-yellow-500 to-orange-500"
          : "from-gray-400 to-gray-500";

  return (
    <div
      className={`${heightClass} w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shadow-inner`}
    >
      <div
        className={`h-full bg-gradient-to-r ${gradientClass} rounded-full transition-all duration-700 ease-out shadow-lg`}
        style={{ width: `${displayPercentage}%` }}
      />
    </div>
  );
}
