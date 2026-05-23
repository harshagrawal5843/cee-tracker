"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { ceeData, ceeSubjects } from "@/data";
import { readCompletions } from "@/lib/storage";
import { SubjectCard } from "@/components/SubjectCard";
import { ProgressBar } from "@/components/ProgressBar";
import { StudyTimer } from "@/components/StudyTimer";
import { TodaysPlan } from "@/components/TodaysPlan";
import { StreakTracker } from "@/components/StreakTracker";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";

function calculateSubjectProgress(chapters, completions, subject) {
  if (!chapters || chapters.length === 0) return 0;

  let totalChapters = 0;
  let completedChapters = 0;

  chapters.forEach((chapter) => {
    totalChapters++;
    const key = `${subject}-${chapter.id}`;
    if (completions[key]) {
      completedChapters++;
    }
  });

  return totalChapters === 0 ? 0 : (completedChapters / totalChapters) * 100;
}

function calculateGlobalProgress(completions) {
  let totalChapters = 0;
  let completedChapters = 0;

  ceeSubjects.forEach((subject) => {
    const chapters = ceeData[subject];
    chapters.forEach((chapter) => {
      totalChapters++;
      const key = `${subject}-${chapter.id}`;
      if (completions[key]) {
        completedChapters++;
      }
    });
  });

  return totalChapters === 0 ? 0 : (completedChapters / totalChapters) * 100;
}

function getSubjectChapterStats(subject, completions) {
  const chapters = ceeData[subject];
  let totalChapters = 0;
  let completedChapters = 0;

  chapters.forEach((chapter) => {
    totalChapters++;
    const key = `${subject}-${chapter.id}`;
    if (completions[key]) {
      completedChapters++;
    }
  });

  return { totalChapters, completedChapters };
}

// Dashboard Component
function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [completions, setCompletions] = useState({});
  const [ready, setReady] = useState(false);

  // Load local completions immediately so the dashboard doesn't stall while auth initializes
  useEffect(() => {
    const loadLocal = async () => {
      try {
        const data = await readCompletions();
        setCompletions(data);
      } catch (err) {
        console.error("Error loading local completions:", err);
      } finally {
        setReady(true);
      }
    };

    loadLocal();
  }, []);

  // If a user is present (logged in), load their completions and override local data
  useEffect(() => {
    const loadUser = async () => {
      if (user) {
        const data = await readCompletions(user.uid);
        setCompletions(data);
      } else {
        const data = await readCompletions();
        setCompletions(data);
      }
    };

    loadUser();
  }, [user]);

  const globalProgress = useMemo(
    () => calculateGlobalProgress(completions),
    [completions],
  );

  const subjectProgressData = useMemo(() => {
    return ceeSubjects.reduce((acc, subject) => {
      const percentage = calculateSubjectProgress(
        ceeData[subject],
        completions,
        subject,
      );
      const { totalChapters, completedChapters } = getSubjectChapterStats(
        subject,
        completions,
      );

      acc[subject] = {
        percentage,
        totalChapters,
        completedChapters,
      };
      return acc;
    }, {});
  }, [completions]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-2">
                Welcome Back! 👋
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                You're on track. Keep pushing to achieve your goals.
              </p>
            </div>
          </div>
        </div>

        {/* TOP SECTION: Study Timer + Today's Global Challenge (2 column layout) */}
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Study Timer - Takes 2 columns */}
            <div className="lg:col-span-2">
              <StudyTimer />
            </div>

            {/* Today's Plan - Takes 3 columns */}
            <div className="lg:col-span-3">
              <TodaysPlan />
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: Streak Tracker + Global Progress (2 column layout) */}
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Streak Tracker - Takes 2 columns */}
            <div className="lg:col-span-2">
              <StreakTracker />
            </div>

            {/* Global Progress Card - Takes 3 columns */}
            <div className="lg:col-span-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-3xl">📊</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Overall Progress
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Across all subjects
                  </p>
                </div>
              </div>

              <div className="mt-6 mb-6">
                <ProgressBar percentage={globalProgress} size="lg" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/20 p-4 text-center border border-blue-200 dark:border-blue-700/50">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">
                    Complete
                  </p>
                  <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
                    {Math.round(globalProgress)}%
                  </p>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-900/20 p-4 text-center border border-purple-200 dark:border-purple-700/50">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">
                    Subjects
                  </p>
                  <p className="text-3xl font-black text-purple-600 dark:text-purple-400">
                    {ceeSubjects.length}
                  </p>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/20 p-4 text-center border border-green-200 dark:border-green-700/50">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">
                    Chapters
                  </p>
                  <p className="text-3xl font-black text-green-600 dark:text-green-400">
                    {Object.values(subjectProgressData).reduce(
                      (sum, data) => sum + data.totalChapters,
                      0,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Subject Cards */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-3xl">🎯</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Your Subjects
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                Track progress across all CEE subjects
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ceeSubjects.map((subject) => (
              <SubjectCard
                key={subject}
                subject={subject}
                chaptersCompleted={
                  subjectProgressData[subject].completedChapters
                }
                chaptersTotal={subjectProgressData[subject].totalChapters}
                percentage={subjectProgressData[subject].percentage}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Landing Page Component
function LandingPage() {
  const features = [
    {
      icon: "📊",
      title: "Real-Time Progress",
      description:
        "Watch your progress grow instantly. See completion percentage for each subject and get visual feedback that motivates.",
    },
    {
      icon: "📋",
      title: "Smart Daily Plans",
      description:
        "AI-powered task prioritization shows you exactly what to study today. No more guessing or wasting time deciding.",
    },
    {
      icon: "⏱️",
      title: "Study Timer",
      description:
        "Track every minute. See daily totals, session durations, and analyze your study patterns for better time management.",
    },
    {
      icon: "🔥",
      title: "Streak Motivation",
      description:
        "Build unbreakable study chains. Visually track your streaks, unlock achievements, and stay motivated daily.",
    },
  ];

  const steps = [
    {
      number: "1",
      title: "Choose Your Exam",
      description:
        "Select CEE exam and your relevant subjects (Physics, Chemistry, Biology, etc.)",
    },
    {
      number: "2",
      title: "Track Progress",
      description:
        "Mark chapters, lectures, and problems as complete. Watch your progress grow daily.",
    },
    {
      number: "3",
      title: "Study Consistently",
      description:
        "Use our daily planner and timer to build a consistent study habit. Maintain your streak!",
    },
    {
      number: "4",
      title: "Crush Your Exam",
      description:
        "Stay organized, maintain consistency, and achieve your CEE goals.",
    },
  ];

  return (
    <main className="overflow-hidden">
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-4 py-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 dark:bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 dark:bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 dark:bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Floating Badge */}
          <div className="inline-block mb-8 px-5 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 text-sm font-bold tracking-wide">
            ⭐ Trusted by CEE Students
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black mb-6 text-gray-900 dark:text-white leading-tight tracking-tight">
            Stop Guessing.
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Get a Clear Daily Plan.
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed font-medium">
            CEE Tracker helps you organize your exam prep into bite-sized daily
            tasks. Track progress, build streaks, and stay motivated. No
            confusion. No procrastination. Just results.
          </p>

          {/* Social Proof */}
          <div className="mb-12 flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-xs font-bold"
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Trusted by{" "}
                <span className="text-blue-600 dark:text-blue-400">
                  100+ students
                </span>
              </span>
            </div>
            <div className="hidden sm:block text-gray-400">•</div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              ⭐ 4.9/5 Rating
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/login"
              className="group px-8 sm:px-10 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all text-lg font-bold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:-translate-y-0.5"
            >
              Get Started Free
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </Link>
            <a
              href="#features"
              className="px-8 sm:px-10 py-4 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all text-lg font-semibold"
            >
              See How It Works
            </a>
          </div>

          {/* Hero Image/Demo */}
          <div className="rounded-2xl border border-white/50 dark:border-gray-700 overflow-hidden shadow-2xl bg-white dark:bg-gray-800 p-6 sm:p-8 backdrop-blur-sm">
            <div className="aspect-video bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-6xl hover:scale-105 transition-transform duration-300 group cursor-pointer">
              <span className="group-hover:animate-bounce">📊</span>
            </div>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
              Your personalized dashboard updates in real-time
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="py-24 px-4 bg-white dark:bg-gray-900 relative"
      >
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-block mb-4 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-sm font-bold">
              ⚡ POWERFUL FEATURES
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-6 text-gray-900 dark:text-white">
              Everything You Need to
              <br />
              Succeed
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Built specifically for CEE exam preparation. Clean, powerful, and
              designed to keep you focused and motivated.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative p-8 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 bg-white dark:bg-gray-800 overflow-hidden"
              >
                {/* Background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                <div className="relative z-10">
                  <div className="text-5xl mb-4 group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Get started in just a few simple steps.
            </p>
          </div>

          {/* Steps Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step Card */}
                <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-full">
                  {/* Step Number */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg mb-4">
                    {step.number}
                  </div>

                  <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Arrow between steps (hidden on mobile) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                    <div className="text-2xl text-gray-300 dark:text-gray-600">
                      →
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                5+
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Subjects Covered
              </p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                200+
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Chapters to Track
              </p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                100%
              </p>
              <p className="text-gray-600 dark:text-gray-400">Free & Offline</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.05)_25%,rgba(255,255,255,.05)_50%,transparent_50%,transparent_75%,rgba(255,255,255,.05)_75%,rgba(255,255,255,.05))] bg-[length:40px_40px]"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
            Ready to Master Your
            <br />
            CEE Preparation?
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join hundreds of students already tracking their progress and
            crushing their goals. Start your free trial today. No credit card
            required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link
              href="/login"
              className="group px-8 sm:px-12 py-4 rounded-lg bg-white text-blue-600 hover:bg-gray-100 active:scale-95 transition-all text-lg font-bold shadow-lg hover:shadow-2xl transform hover:-translate-y-1"
            >
              Get Started Free
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </Link>
            <a
              href="#features"
              className="px-6 sm:px-8 py-4 rounded-lg border-2 border-white text-white hover:bg-white/10 transition-all text-lg font-semibold"
            >
              Learn More
            </a>
          </div>

          <p className="text-sm text-blue-100">
            ✨ No signup required. Free forever. Always online.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 dark:bg-gray-950 text-white border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            {/* Brand */}
            <div>
              <h3 className="text-2xl font-bold mb-2">CEE Tracker</h3>
              <p className="text-gray-400">
                Your companion in CEE exam preparation. Track, practice, and
                succeed.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="/" className="hover:text-white transition-colors">
                    Home
                  </a>
                </li>
                <li>
                  <a
                    href="#features"
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </a>
                </li>
              </ul>
            </div>

            {/* About */}
            <div>
              <h4 className="font-semibold mb-4">About</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                CEE Tracker is built with Next.js 14, React 18, and Tailwind CSS
                to help students prepare for their Common Entrance Exam
                efficiently.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800 pt-8">
            <div className="text-center text-gray-400 text-sm">
              <p>
                © {new Date().getFullYear()} CEE Tracker. Built with ❤️ for
                aspiring students.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      {user ? <Dashboard /> : <LandingPage />}
    </>
  );
}
