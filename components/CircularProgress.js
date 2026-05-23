"use client";

export function CircularProgress({ percentage = 0, size = 160 }) {
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const displayPercentage = Math.round(percentage);

  // Get color based on percentage
  const getColor = () => {
    if (displayPercentage < 33) return { start: "#ef4444", end: "#f97316" }; // Red to orange
    if (displayPercentage < 66) return { start: "#eab308", end: "#84cc16" }; // Yellow to lime
    return { start: "#10b981", end: "#06b6d4" }; // Green to cyan
  };

  const color = getColor();

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/20 to-cyan-400/20 dark:from-blue-500/20 dark:to-cyan-500/20 blur-lg" />

        {/* SVG Circle */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 drop-shadow-lg"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-gray-100 dark:text-gray-800"
          />

          {/* Progress circle with gradient */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out filter drop-shadow-md"
          />

          {/* Defs with gradient */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color.start} />
              <stop offset="100%" stopColor={color.end} />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center">
            <p className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
              {displayPercentage}
            </p>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-1 tracking-widest uppercase">
              Progress
            </p>
          </div>
        </div>
      </div>

      {/* Status text */}
      <div className="text-center">
        {displayPercentage === 100 ? (
          <p className="text-sm font-bold text-green-600 dark:text-green-400">
            ✅ Completed
          </p>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {displayPercentage}% of chapters done
          </p>
        )}
      </div>
    </div>
  );
}
