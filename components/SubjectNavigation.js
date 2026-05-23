"use client";

import Link from "next/link";
import { getSubjectDisplayName } from "@/data";

const subjectIcons = {
  physics: "⚛️",
  chemistry: "🧪",
  zoology: "🦁",
  botany: "🌿",
  "mental-ability-test": "🧠",
};

export function SubjectNavigation({ currentSubject, subjects }) {
  return (
    <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
      {subjects.map((subject) => {
        const isActive = subject === currentSubject;
        const displayName = getSubjectDisplayName(subject);
        return (
          <Link
            key={subject}
            href={`/subject/${subject}`}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 border
              ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm dark:bg-blue-500 dark:border-blue-500"
                  : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
              }
            `}
          >
            <span className="text-lg">{subjectIcons[subject]}</span>
            {displayName}
          </Link>
        );
      })}
    </div>
  );
}
