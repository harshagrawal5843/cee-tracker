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
      <div className="group cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900 hover:border-blue-400 dark:hover:border-blue-600">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{subjectIcons[subject]}</span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {subjectLabel}
            </h3>
          </div>
          <div className="text-2xl text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors">
            →
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <ProgressBar percentage={percentage} size="md" />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {chaptersCompleted} of {chaptersTotal} chapters
          </p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {Math.round(percentage)}%
          </p>
        </div>
      </div>
    </Link>
  );
}
