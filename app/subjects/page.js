"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Navbar } from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { ceeData, ceeSubjects } from "@/data";
import { readCompletions } from "@/lib/storage";
import { SubjectCard } from "@/components/SubjectCard";

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

function getSubjectChapterStats(subject, completions) {
  const chapters = ceeData[subject] || [];
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

export default function SubjectsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [completions, setCompletions] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const loadCompletions = async () => {
      if (loading) return;

      try {
        const data = user
          ? await readCompletions(user.uid)
          : await readCompletions();
        setCompletions(data || {});
      } catch (error) {
        console.error("Error loading subject completions:", error);
        setCompletions({});
      } finally {
        setReady(true);
      }
    };

    loadCompletions();
  }, [user, loading]);

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

  if (loading) {
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-gray-100 mb-3">
              All Subjects
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
              Browse every subject and open any one to continue exactly where
              you left off.
            </p>
          </div>

          {!ready ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">
                  Loading subjects...
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
          )}
        </div>
      </div>
    </>
  );
}
