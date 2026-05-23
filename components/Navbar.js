"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  readStudyStreak,
  readStudyTimerState,
  updateStudyTimerSnapshot,
  writeStudyStreak,
} from "@/lib/dailyChallenge";
import { readStudyStreakRemote } from "@/lib/storage";

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [timerState, setTimerState] = useState({
    dateKey: null,
    todayTime: 0,
    elapsedTime: 0,
    isRunning: false,
  });

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(secs).padStart(2, "0")}`;
  };

  useEffect(() => {
    const syncStreak = () => {
      const streakData = readStudyStreak();
      setStreak(streakData.count || 0);
    };

    const syncTimer = () => {
      const state = readStudyTimerState();
      setTimerState(state);
    };

    syncStreak();
    syncTimer();

    // If user logs in, try to fetch their remote streak and apply locally
    const tryRemote = async () => {
      if (user?.uid) {
        const remote = await readStudyStreakRemote(user.uid);
        if (remote) {
          writeStudyStreak(remote.count, remote.lastDate, user.uid);
          setStreak(remote.count || 0);
        }
      }
    };

    tryRemote();

    window.addEventListener("storage", syncStreak);
    window.addEventListener("focus", syncStreak);
    window.addEventListener("study-streak-updated", syncStreak);
    window.addEventListener("storage", syncTimer);
    window.addEventListener("focus", syncTimer);
    window.addEventListener("study-timer-updated", syncTimer);

    return () => {
      window.removeEventListener("storage", syncStreak);
      window.removeEventListener("focus", syncStreak);
      window.removeEventListener("study-streak-updated", syncStreak);
      window.removeEventListener("storage", syncTimer);
      window.removeEventListener("focus", syncTimer);
      window.removeEventListener("study-timer-updated", syncTimer);
    };
  }, []);

  // Navigation links based on auth status
  const navLinks = user
    ? [
        { label: "Dashboard", href: "/" },
        { label: "Study Timer", href: "/study-timer" },
        { label: "Subjects", href: "/subjects" },
        { label: "Challenge History", href: "/challenge-history" },
      ]
    : [
        { label: "Home", href: "/" },
        { label: "Features", href: "/#features" },
      ];

  const isActivePage = (href) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const showTimerBadge = timerState.isRunning || timerState.elapsedTime > 0;

  const handleToggleTimer = () => {
    const nextRunningState = !timerState.isRunning;
    const nextState = {
      ...timerState,
      isRunning: nextRunningState,
    };

    setTimerState(nextState);
    updateStudyTimerSnapshot(nextState);
  };

  const handleResetTimer = () => {
    const nextState = {
      ...timerState,
      elapsedTime: 0,
      isRunning: false,
    };

    setTimerState(nextState);
    updateStudyTimerSnapshot(nextState);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-indigo-700 transition-all">
              CEE Tracker
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = isActivePage(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right Side - Auth Buttons or User Menu */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  {showTimerBadge ? (
                    <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <span>⏱️</span>
                      <span>{formatTime(timerState.todayTime)}</span>
                      <button
                        type="button"
                        onClick={handleToggleTimer}
                        className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-extrabold text-emerald-700 hover:bg-white dark:bg-gray-900/60 dark:text-emerald-300"
                      >
                        {timerState.isRunning ? "Pause" : "Resume"}
                      </button>
                      <button
                        type="button"
                        onClick={handleResetTimer}
                        className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-extrabold text-rose-700 hover:bg-white dark:bg-gray-900/60 dark:text-rose-300"
                      >
                        Reset
                      </button>
                    </div>
                  ) : null}

                  {streak > 0 ? (
                    <div className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-bold text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300">
                      <span>🔥</span>
                      <span>{streak}</span>
                    </div>
                  ) : null}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {user.email}
                </span>
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-sm font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all text-sm font-medium shadow-lg shadow-blue-500/30"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  mobileMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-4 px-4">
          <div className="space-y-4">
            {navLinks.map((link) => {
              const isActive = isActivePage(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block text-sm font-medium transition-colors ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              {user ? (
                <>
                  {showTimerBadge ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                      <div className="mb-2 flex items-center justify-between gap-2 text-emerald-700 dark:text-emerald-300">
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <span>⏱️</span>
                          <span>{formatTime(timerState.todayTime)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleToggleTimer();
                            setMobileMenuOpen(false);
                          }}
                          className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-emerald-700 dark:bg-gray-900/70 dark:text-emerald-300"
                        >
                          {timerState.isRunning ? "Pause" : "Resume"}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleResetTimer();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-rose-700 dark:bg-gray-900/70 dark:text-rose-300"
                      >
                        Reset timer
                      </button>
                    </div>
                  ) : null}

                  {streak > 0 ? (
                    <div className="flex items-center gap-2 px-2 text-orange-600 dark:text-orange-300">
                      <span>🔥</span>
                      <span className="text-sm font-bold">{streak}</span>
                    </div>
                  ) : null}
                  <Link
                    href="/study-timer"
                    className="block text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 px-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Study Timer
                  </Link>
                  <p className="text-xs text-gray-500 dark:text-gray-400 px-2">
                    {user.email}
                  </p>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-sm font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block text-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/login"
                    className="block text-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
