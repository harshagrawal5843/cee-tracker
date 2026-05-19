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
    <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
      {subjects.map((subject) => {
        const isActive = subject === currentSubject;
        const displayName = getSubjectDisplayName(subject);
        return (
          <Link
            key={subject}
            href={`/subject/${subject}`}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
              ${
                isActive
                  ? "bg-blue-600 text-white dark:bg-blue-500"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
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
