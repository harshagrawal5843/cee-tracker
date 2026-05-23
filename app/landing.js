"use client";

import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

export default function LandingPage() {
  const { user } = useAuth();

  const features = [
    {
      icon: "📊",
      title: "Progress Tracking",
      description:
        "Visualize your learning journey with detailed progress bars for each subject and chapter.",
    },
    {
      icon: "📋",
      title: "Daily Study Plan",
      description:
        "Get smart task selection with 6 pending lectures and problems recommended for your day.",
    },
    {
      icon: "⏱️",
      title: "Study Timer",
      description:
        "Track time spent in study sessions and accumulate daily study hours automatically.",
    },
    {
      icon: "🔥",
      title: "Streak System",
      description:
        "Build consistency with a daily streak tracker to maintain your motivation and discipline.",
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
    <>
      <Navbar />

      <main className="overflow-hidden">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center px-4 py-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
          <div className="max-w-4xl mx-auto text-center">
            {/* Floating Badge */}
            <div className="inline-block mb-8 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-sm font-semibold">
              ✨ The Smart Way to Prepare for CEE
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
              Track Your CEE Preparation
            </h1>

            {/* Tagline */}
            <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              Stay consistent. Build your streak. Crack your Common Entrance
              Exam with confidence.
            </p>

            {/* Description */}
            <p className="text-lg text-gray-500 dark:text-gray-500 mb-12 max-w-xl mx-auto">
              A modern, intuitive tracker designed specifically for CEE students
              to monitor subjects, chapters, lectures, and problems—all in one
              place.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href={user ? "/dashboard" : "#get-started"}
                className="px-8 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all text-lg font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
              >
                {user ? "Go to Dashboard" : "Get Started Free"}
              </Link>
              <a
                href="#features"
                className="px-8 py-4 rounded-lg border-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-600 transition-all text-lg font-semibold"
              >
                Explore Features
              </a>
            </div>

            {/* Hero Image Placeholder */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 p-8 sm:p-12">
              <div className="aspect-video bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <span className="text-6xl">📚</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4 bg-white dark:bg-gray-900">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Powerful Features Built for CEE Students
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Everything you need to organize, track, and ace your exam
                preparation.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-lg hover:shadow-blue-500/10 bg-white dark:bg-gray-800"
                >
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
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
                <p className="text-gray-600 dark:text-gray-400">
                  Free & Offline
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section
          id="get-started"
          className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Ready to Ace Your CEE?
            </h2>
            <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto leading-relaxed">
              Join thousands of students who are tracking their progress and
              staying consistent with their exam preparation.
            </p>

            <Link
              href={user ? "/dashboard" : "#get-started"}
              className="inline-block px-8 py-4 rounded-lg bg-white text-blue-600 hover:bg-gray-100 transition-all text-lg font-semibold shadow-lg hover:shadow-xl"
            >
              {user ? "Go to Dashboard" : "Start Tracking Now"}
            </Link>
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
                  {user && (
                    <li>
                      <a
                        href="/dashboard"
                        className="hover:text-white transition-colors"
                      >
                        Dashboard
                      </a>
                    </li>
                  )}
                </ul>
              </div>

              {/* About */}
              <div>
                <h4 className="font-semibold mb-4">About</h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  CEE Tracker is built with Next.js 14, React 18, and Tailwind
                  CSS to help students prepare for their Common Entrance Exam
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
    </>
  );
}
