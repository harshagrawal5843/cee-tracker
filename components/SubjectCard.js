"use client";

import Link from "next/link";
import { ProgressBar } from "./ProgressBar";
import { getSubjectDisplayName } from "@/data";

const subjectColors = {
  physics: "from-blue-500 to-blue-600",
  chemistry: "from-green-500 to-green-600",
  zoology: "from-purple-500 to-purple-600",
  botany: "from-orange-500 to-orange-600",
  "mental-ability-test": "from-red-500 to-red-600",
};

const subjectIcons = {
  physics: "⚛️",
  chemistry: "🧪",
  zoology: "🦁",
  botany: "🌿",
  "mental-ability-test": "🧠",
};

export function SubjectCard({
  subject,
  chaptersCompleted,
  chaptersTotal,
  percentage,
}) {
  const subjectLabel = getSubjectDisplayName(subject);

  return (
    <Link href={`/subject/${subject}`}>
      <div className="group cursor-pointer rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-900/30 overflow-hidden relative">
        {/* Background gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className={`text-4xl group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300`}
              >
                {subjectIcons[subject]}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {subjectLabel}
                </h3>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {chaptersCompleted}/{chaptersTotal} chapters
                </p>
              </div>
            </div>
            <div className="text-2xl text-gray-300 dark:text-gray-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all">
              →
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <ProgressBar percentage={percentage} size="md" />
          </div>

          {/* Stats Footer */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              Progress
            </span>
            <span
              className={`text-2xl font-black ${
                percentage >= 75
                  ? "text-green-600 dark:text-green-400"
                  : percentage >= 50
                    ? "text-blue-600 dark:text-blue-400"
                    : percentage >= 25
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {Math.round(percentage)}%
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
