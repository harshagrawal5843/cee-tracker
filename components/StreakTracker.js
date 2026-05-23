"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { readStudyStreak, writeStudyStreak } from "@/lib/dailyChallenge";
import { readStudyStreakRemote } from "@/lib/storage";

export function StreakTracker() {
  const [streak, setStreak] = useState(0);
  const [lastActiveDate, setLastActiveDate] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [motivationMessage, setMotivationMessage] = useState("");

  const motivationalMessages = [
    { text: "🎯 You're on fire!", emoji: "🔥" },
    { text: "💪 Don't break the chain!", emoji: "⛓️" },
    { text: "🚀 Keep the momentum!", emoji: "🚀" },
    { text: "⭐ You're unstoppable!", emoji: "✨" },
    { text: "🏆 Consistency wins!", emoji: "🏆" },
    { text: "📈 Building greatness!", emoji: "📈" },
    { text: "💎 Stay determined!", emoji: "💎" },
    { text: "🌟 You got this!", emoji: "🌟" },
    { text: "🎖️ Legendary streak!", emoji: "🎖️" },
    { text: "⚡ Pure dedication!", emoji: "⚡" },
  ];

  const { user } = useAuth();

  useEffect(() => {
    setIsClient(true);

    const syncStreak = () => {
      const streakData = readStudyStreak();
      setStreak(streakData.count || 0);
      setLastActiveDate(
        streakData.lastDate ? new Date(streakData.lastDate) : null,
      );
    };

    // If user is signed in, try to fetch remote streak and update local
    const trySyncRemote = async () => {
      if (user?.uid) {
        const remote = await readStudyStreakRemote(user.uid);
        if (remote) {
          // update local and remote (idempotent)
          writeStudyStreak(remote.count, remote.lastDate, user.uid);
        }
      }
      syncStreak();
    };

    trySyncRemote();

    window.addEventListener("study-streak-updated", syncStreak);
    window.addEventListener("storage", syncStreak);

    // Set random motivational message
    const randomMessage =
      motivationalMessages[
        Math.floor(Math.random() * motivationalMessages.length)
      ];
    setMotivationMessage(randomMessage.text);

    return () => {
      window.removeEventListener("study-streak-updated", syncStreak);
      window.removeEventListener("storage", syncStreak);
    };
  }, [user]);

  if (!isClient) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border transition-all duration-500 p-6 shadow-lg relative overflow-hidden ${
        streak > 0
          ? "border-orange-400 dark:border-orange-600 bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50 dark:from-orange-950 dark:via-red-950 dark:to-yellow-950 shadow-orange-200 dark:shadow-orange-900/50"
          : "border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 shadow-gray-200 dark:shadow-gray-900"
      }`}
    >
      {/* Background glow effect when on streak */}
      {streak > 0 && (
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-red-400/10 dark:from-orange-500/10 dark:to-red-500/10 blur-2xl pointer-events-none"></div>
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`text-5xl ${streak > 0 ? "animate-pulse" : ""}`}>
              🔥
            </div>
            <div>
              <p className="text-xs uppercase font-bold tracking-widest text-gray-600 dark:text-gray-400">
                Current Streak
              </p>
              <p
                className={`text-5xl font-black mt-1 ${
                  streak > 0
                    ? "text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400"
                    : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {streak}
              </p>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">
                Day{streak !== 1 ? "s" : ""} of consistency
              </p>
            </div>
          </div>

          {/* Achievement Badge */}
          <div
            className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${
              streak >= 7 && streak < 30
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                : streak >= 30 && streak < 100
                  ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                  : streak >= 100
                    ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            {streak === 0 && "🌱 Get Started"}
            {streak > 0 && streak < 7 && "🚀 Building"}
            {streak >= 7 && streak < 30 && "⭐ Rising"}
            {streak >= 30 && streak < 100 && "🏆 Legendary"}
            {streak >= 100 && "👑 Unstoppable"}
          </div>
        </div>

        {/* Motivational Message */}
        <div className="rounded-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-4 mb-6 border border-orange-200 dark:border-orange-700/50 text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {motivationMessage}
          </p>
          {streak > 0 && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Don't break the chain! Study today to keep your streak alive.
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-4 border border-orange-100 dark:border-orange-700/30">
            <p className="text-xs uppercase font-bold tracking-wider text-gray-600 dark:text-gray-400 mb-2">
              Last Active
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {lastActiveDate
                ? lastActiveDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "—"}
            </p>
          </div>

          <div className="rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-4 border border-orange-100 dark:border-orange-700/30">
            <p className="text-xs uppercase font-bold tracking-wider text-gray-600 dark:text-gray-400 mb-2">
              Status
            </p>
            <p
              className={`text-lg font-bold ${
                streak > 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {streak > 0 ? "🔥 Active" : "⏸️ Paused"}
            </p>
          </div>
        </div>

        {/* Milestone Progress */}
        {streak > 0 && streak < 100 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Next Milestone
              </p>
              <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                {streak < 7
                  ? `${7 - streak} days to 🌟 Rising`
                  : streak < 30
                    ? `${30 - streak} days to 🏆 Legendary`
                    : `${100 - streak} days to 👑 Unstoppable`}
              </p>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-orange-500 to-red-500 h-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    streak < 7
                      ? (streak / 7) * 100
                      : streak < 30
                        ? (streak / 30) * 100
                        : (streak / 100) * 100,
                    100,
                  )}%`,
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Tips Section */}
        <div className="pt-4 border-t border-orange-200 dark:border-orange-700/50">
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            <span className="font-bold text-orange-600 dark:text-orange-400">
              💡 Pro Tip:
            </span>{" "}
            Sign in to sync your streak across devices. Complete at least one
            task every day to keep your streak alive — small, consistent wins
            add up.
          </p>
        </div>
      </div>
    </div>
  );
}
