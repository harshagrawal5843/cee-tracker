"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { ceeData, ceeSubjects, getSubjectDisplayName } from "@/data";
import { readCompletions, writeCompletions } from "@/lib/storage";
import { ProgressBar } from "@/components/ProgressBar";
import { CircularProgress } from "@/components/CircularProgress";
import { SubjectNavigation } from "@/components/SubjectNavigation";
import { ChapterAccordion } from "@/components/ChapterAccordion";

function calculateSubjectProgress(chapters, completions, subject) {
  if (!chapters || chapters.length === 0)
    return { percentage: 0, totalChapters: 0, completedChapters: 0 };

  let totalChapters = 0;
  let completedChapters = 0;

  chapters.forEach((chapter) => {
    totalChapters++;
    const key = `${subject}-${chapter.id}`;
    if (completions[key]) {
      completedChapters++;
    }
  });

  return {
    percentage:
      totalChapters === 0 ? 0 : (completedChapters / totalChapters) * 100,
    totalChapters,
    completedChapters,
  };
}

export default function SubjectPage() {
  const params = useParams();
  const subject = params.name;
  const { user, loading: authLoading } = useAuth();

  // Debug: log params/subject to help trace 404 issues
  if (typeof window !== "undefined") {
    console.debug("[SubjectPage] params:", params, "subject:", subject);
  }

  const [completions, setCompletions] = useState({});
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");

  useEffect(() => {
    // Load local completions immediately so UI doesn't stall while auth initializes.
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

  // When user becomes available (login), load user-specific completions and override local data.
  useEffect(() => {
    const loadUserCompletions = async () => {
      if (user) {
        const data = await readCompletions(user.uid);
        setCompletions(data);
      } else {
        // If user logged out, fallback to local storage
        const data = await readCompletions();
        setCompletions(data);
      }
    };

    loadUserCompletions();
  }, [user]);

  const handleCompletionChange = async (newCompletions) => {
    setCompletions(newCompletions);
    if (user) {
      await writeCompletions(newCompletions, user.uid);
    } else {
      writeCompletions(newCompletions);
    }
  };

  const chapters = ceeData[subject] || [];
  const isValidSubject = ceeSubjects.includes(subject);

  // Group consecutive chapters with the same name
  const groupedChapters = useMemo(() => {
    const groups = [];
    let currentGroup = [];
    let currentName = null;

    chapters.forEach((chapter, index) => {
      const chapterName = chapter.chapterName;

      if (chapterName === currentName) {
        // Same name as previous, add to current group
        currentGroup.push({ chapter, index });
      } else {
        // Different name, save previous group and start new one
        if (currentGroup.length > 0) {
          groups.push({ name: currentName, chapters: currentGroup });
        }
        currentGroup = [{ chapter, index }];
        currentName = chapterName;
      }
    });

    // Don't forget the last group
    if (currentGroup.length > 0) {
      groups.push({ name: currentName, chapters: currentGroup });
    }

    return groups;
  }, [chapters]);

  const progressData = useMemo(
    () => calculateSubjectProgress(chapters, completions, subject),
    [chapters, completions, subject],
  );

  // Get unique units for chemistry
  const chemistryUnits = useMemo(() => {
    if (subject !== "chemistry") return [];
    const units = new Set();
    chapters.forEach((chapter) => {
      if (chapter.unit) units.add(chapter.unit);
    });
    const unitArray = Array.from(units);
    // Sort in custom order: Physical, Organic, Inorganic, Applied
    const unitOrder = [
      "Physical Chemistry",
      "Organic Chemistry",
      "Inorganic Chemistry",
      "Applied Chemistry",
    ];
    return unitArray.sort(
      (a, b) => unitOrder.indexOf(a) - unitOrder.indexOf(b),
    );
  }, [chapters, subject]);

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

  if (!isValidSubject) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Subject not found
        </h1>
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const subjectLabel = getSubjectDisplayName(subject);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/60 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm backdrop-blur-sm transition-all hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 p-6 sm:p-8 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-2">
                Subject Overview
              </p>
              <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-gray-100 mb-3">
                {subjectLabel}
              </h1>
              <p className="max-w-2xl text-gray-600 dark:text-gray-400 leading-relaxed">
                Track your progress across chapters and problems with a cleaner,
                calmer study layout.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:min-w-[360px]">
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300 mb-1">
                  Progress
                </p>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {Math.round(progressData.percentage)}%
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-1">
                  Done
                </p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {progressData.completedChapters}
                </p>
              </div>
              <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300 mb-1">
                  Total
                </p>
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {progressData.totalChapters}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Header */}
        <div className="grid grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)] gap-6 mb-8">
          {/* Progress Circle */}
          <div className="flex justify-center lg:justify-start rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 p-6 shadow-sm">
            <CircularProgress percentage={progressData.percentage} size={140} />
          </div>

          {/* Stats */}
          <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 p-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                  Chapters
                </p>
                <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
                  {progressData.totalChapters}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                  Completed
                </p>
                <p className="text-2xl font-black text-green-600 dark:text-green-400">
                  {progressData.completedChapters}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                  Remaining
                </p>
                <p className="text-2xl font-black text-orange-600 dark:text-orange-400">
                  {progressData.totalChapters - progressData.completedChapters}
                </p>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-800/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  Overall Progress
                </p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {Math.round(progressData.percentage)}%
                </p>
              </div>
              <ProgressBar percentage={progressData.percentage} size="lg" />
            </div>
          </div>
        </div>

        {/* Subject Navigation */}
        <div className="mb-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Quick Navigation
          </p>
          <SubjectNavigation currentSubject={subject} subjects={ceeSubjects} />
        </div>

        {/* Chapters Section */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 p-6 shadow-sm">
          <div className="mb-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-5">
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-1">
                  Chapters
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Search, filter, and mark progress without losing the page
                  rhythm.
                </p>
              </div>

              <div className="w-full lg:max-w-md">
                <input
                  type="text"
                  placeholder="🔍 Search chapters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    filter === "all"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter("completed")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    filter === "completed"
                      ? "bg-green-600 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  ✅ Completed
                </button>
                <button
                  onClick={() => setFilter("pending")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    filter === "pending"
                      ? "bg-orange-600 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  ⏳ Pending
                </button>
              </div>
            </div>
          </div>

          {/* Chemistry Unit Filters */}
          {subject === "chemistry" && chemistryUnits.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Filter by Unit:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setUnitFilter("all")}
                  className={`px-3 py-2 rounded-full font-semibold text-sm transition-all ${
                    unitFilter === "all"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  All Units
                </button>
                {chemistryUnits.map((unit) => (
                  <button
                    key={unit}
                    onClick={() => setUnitFilter(unit)}
                    className={`px-3 py-2 rounded-full font-semibold text-sm transition-all ${
                      unitFilter === unit
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chapters.length > 0 ? (
            <div className="mt-4 space-y-6">
              {subject === "chemistry" ? (
                // Chemistry: Group by unit sections
                chemistryUnits.length > 0 ? (
                  chemistryUnits.map((unit) => {
                    if (unitFilter !== "all" && unit !== unitFilter)
                      return null;

                    const unitChapters = chapters.filter(
                      (c) => c.unit === unit,
                    );
                    if (unitChapters.length === 0) return null;

                    return (
                      <div key={unit} className="space-y-3">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 border-l-4 border-blue-600 pl-3">
                          {unit}
                        </h3>
                        <div className="space-y-3 ml-2">
                          {unitChapters.map((chapter, index) => {
                            const chapterNum = chapters.indexOf(chapter) + 1;
                            const displayName = `Chapter ${chapterNum} - ${chapter.chapterName}`;
                            const isChapterCompleted =
                              completions[`${subject}-${chapter.id}`];
                            const hasSubtopics =
                              chapter.subtopics && chapter.subtopics.length > 0;

                            // Apply search filter
                            if (
                              searchTerm &&
                              !displayName
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase())
                            ) {
                              return null;
                            }

                            // Apply completion filter
                            if (filter === "completed" && !isChapterCompleted)
                              return null;
                            if (filter === "pending" && isChapterCompleted)
                              return null;

                            const allSubtopicsCompleted =
                              hasSubtopics &&
                              chapter.subtopics.every(
                                (st) => completions[`${subject}-${st.id}`],
                              );

                            return (
                              <div
                                key={chapter.id}
                                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 overflow-hidden transition-all hover:border-blue-300 dark:hover:border-blue-600"
                              >
                                <div className="flex items-center gap-3 px-4 py-4 hover:bg-white dark:hover:bg-gray-800 transition-all">
                                  <input
                                    type="checkbox"
                                    checked={
                                      hasSubtopics
                                        ? allSubtopicsCompleted
                                        : isChapterCompleted
                                    }
                                    onChange={(e) => {
                                      const newCompletions = { ...completions };
                                      const isChecked = e.target.checked;

                                      const chapterKey = `${subject}-${chapter.id}`;
                                      if (hasSubtopics) {
                                        // Check/uncheck all subtopics AND the chapter itself
                                        chapter.subtopics.forEach((st) => {
                                          const stKey = `${subject}-${st.id}`;
                                          if (isChecked) {
                                            newCompletions[stKey] = true;
                                          } else {
                                            delete newCompletions[stKey];
                                          }
                                        });
                                        // Also set/delete the chapter key
                                        if (isChecked) {
                                          newCompletions[chapterKey] = true;
                                        } else {
                                          delete newCompletions[chapterKey];
                                        }
                                      } else {
                                        // Simple chapter without subtopics
                                        if (isChecked) {
                                          newCompletions[chapterKey] = true;
                                        } else {
                                          delete newCompletions[chapterKey];
                                        }
                                      }

                                      handleCompletionChange(newCompletions);
                                    }}
                                    className="w-5 h-5 cursor-pointer accent-blue-600 dark:accent-blue-500"
                                  />
                                  <p
                                    className={`flex-1 text-[15px] font-medium leading-relaxed ${
                                      (
                                        hasSubtopics
                                          ? allSubtopicsCompleted
                                          : isChapterCompleted
                                      )
                                        ? "line-through text-gray-500 dark:text-gray-400"
                                        : "text-gray-900 dark:text-gray-100"
                                    }`}
                                  >
                                    {displayName}
                                  </p>
                                </div>

                                {/* Subtopics */}
                                {hasSubtopics && (
                                  <div className="border-t border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60">
                                    {chapter.subtopics.map((subtopic) => {
                                      const stKey = `${subject}-${subtopic.id}`;
                                      const isStCompleted = completions[stKey];

                                      return (
                                        <div
                                          key={subtopic.id}
                                          className="flex items-center gap-3 px-4 py-3 pl-12 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isStCompleted || false}
                                            onChange={(e) => {
                                              const newCompletions = {
                                                ...completions,
                                              };
                                              if (e.target.checked) {
                                                newCompletions[stKey] = true;
                                              } else {
                                                delete newCompletions[stKey];
                                              }
                                              handleCompletionChange(
                                                newCompletions,
                                              );
                                            }}
                                            className="w-4 h-4 cursor-pointer accent-green-600 dark:accent-green-500"
                                          />
                                          <p
                                            className={`text-sm ${
                                              isStCompleted
                                                ? "line-through text-gray-500 dark:text-gray-400"
                                                : "text-gray-700 dark:text-gray-300"
                                            }`}
                                          >
                                            {subtopic.name}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">
                    No chapters available
                  </p>
                )
              ) : (
                // Non-chemistry subjects: Use original grouping logic
                groupedChapters.map((group) => {
                  const chapterNumbers = group.chapters.map((c) => c.index + 1);

                  // For grouped chapters (multiple same-name chapters)
                  if (chapterNumbers.length > 1) {
                    const firstNum = chapterNumbers[0];
                    const lastNum = chapterNumbers[chapterNumbers.length - 1];
                    const displayName = `Chapter ${firstNum} to ${lastNum} - ${group.name}`;

                    // Apply search filter
                    if (
                      searchTerm &&
                      !displayName
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                    ) {
                      return null;
                    }

                    // For grouped items, mark as complete if ANY chapter is complete
                    const anyCompleted = group.chapters.some(
                      (c) => completions[`${subject}-${c.chapter.id}`],
                    );

                    // Apply filter
                    if (filter === "completed" && !anyCompleted) return null;
                    if (filter === "pending" && anyCompleted) return null;

                    return (
                      <div
                        key={`group-${group.chapters[0].chapter.id}`}
                        className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 px-4 py-4 transition-all hover:border-blue-300 dark:hover:border-blue-600"
                      >
                        <input
                          type="checkbox"
                          checked={anyCompleted}
                          onChange={(e) => {
                            const newCompletions = { ...completions };
                            const isChecked = e.target.checked;

                            // Toggle all chapters in the group
                            group.chapters.forEach(({ chapter }) => {
                              const key = `${subject}-${chapter.id}`;
                              if (isChecked) {
                                newCompletions[key] = true;
                              } else {
                                delete newCompletions[key];
                              }
                            });

                            handleCompletionChange(newCompletions);
                          }}
                          className="mt-1 w-5 h-5 cursor-pointer accent-blue-600 dark:accent-blue-500"
                        />
                        <p
                          className={`flex-1 text-[15px] font-medium leading-relaxed ${
                            anyCompleted
                              ? "line-through text-gray-500 dark:text-gray-400"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          {displayName}
                        </p>
                      </div>
                    );
                  }

                  // For single chapters (not grouped)
                  const chapter = group.chapters[0];
                  const index = chapter.index;
                  const isCompleted =
                    completions[`${subject}-${chapter.chapter.id}`];
                  const chapterNumber = index + 1;
                  const displayName = `Chapter ${chapterNumber} - ${group.name}`;

                  // Apply filter
                  if (filter === "completed" && !isCompleted) return null;
                  if (filter === "pending" && isCompleted) return null;

                  // Apply search filter (case-insensitive)
                  if (
                    searchTerm &&
                    !displayName
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())
                  ) {
                    return null;
                  }

                  const chapterWithNumber = {
                    ...chapter.chapter,
                    chapterName: displayName,
                  };

                  return (
                    <ChapterAccordion
                      key={chapter.chapter.id}
                      chapter={chapterWithNumber}
                      subject={subject}
                      completions={completions}
                      onCompletionChange={handleCompletionChange}
                    />
                  );
                })
              )}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              No chapters available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
