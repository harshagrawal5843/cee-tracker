"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { neetData, neetSubjects, getSubjectDisplayName } from "@/data";
import { readCompletions, writeCompletions } from "@/lib/storage";
import { ProgressBar } from "@/components/ProgressBar";
import { CircularProgress } from "@/components/CircularProgress";
import { SubjectNavigation } from "@/components/SubjectNavigation";
import { ChapterAccordion } from "@/components/ChapterAccordion";

function calculateSubjectProgress(chapters, completions, subject) {
  if (!chapters || chapters.length === 0) return { percentage: 0, totalChapters: 0, completedChapters: 0 };

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
    percentage: totalChapters === 0 ? 0 : (completedChapters / totalChapters) * 100,
    totalChapters,
    completedChapters,
  };
}

export default function SubjectPage() {
  const params = useParams();
  const subject = params.name;
  const { user, loading: authLoading } = useAuth();

  const [completions, setCompletions] = useState({});
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");

  useEffect(() => {
    const loadCompletions = async () => {
      if (authLoading) return;
      
      if (user) {
        const data = await readCompletions(user.uid);
        setCompletions(data);
      } else {
        const data = readCompletions();
        setCompletions(data);
      }
      setReady(true);
    };

    loadCompletions();
  }, [user, authLoading]);

  const handleCompletionChange = async (newCompletions) => {
    setCompletions(newCompletions);
    if (user) {
      await writeCompletions(newCompletions, user.uid);
    } else {
      writeCompletions(newCompletions);
    }
  };

  const chapters = neetData[subject] || [];
  const isValidSubject = neetSubjects.includes(subject);

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
    [chapters, completions, subject]
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
    const unitOrder = ["Physical Chemistry", "Organic Chemistry", "Inorganic Chemistry", "Applied Chemistry"];
    return unitArray.sort((a, b) => unitOrder.indexOf(a) - unitOrder.indexOf(b));
  }, [chapters, subject]);

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
    <div>
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {subjectLabel}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your progress across chapters and problems
        </p>
      </div>

      {/* Statistics Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {/* Progress Circle */}
        <div className="flex justify-center lg:justify-start">
          <div className="relative w-32 h-32">
            <CircularProgress percentage={progressData.percentage} size={140} />
          </div>
        </div>

        {/* Stats */}
        <div className="lg:col-span-2 space-y-4">
          {/* Chapters */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Chapters Completed
            </p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {progressData.totalChapters} Total
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {Math.round(progressData.percentage)}% overall progress
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                📚 Total Chapters
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {progressData.totalChapters}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                ✅ Completed
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {progressData.completedChapters}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-12 p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
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

      {/* Subject Navigation */}
      <div className="mb-12">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Quick Navigation
        </p>
        <SubjectNavigation currentSubject={subject} subjects={neetSubjects} />
      </div>

      {/* Chapters Section */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Chapters
          </h2>
          
          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Search chapters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("completed")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === "completed"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                ✅ Completed
              </button>
              <button
                onClick={() => setFilter("pending")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === "pending"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                ⏳ Pending
              </button>
            </div>
          </div>

          {/* Chemistry Unit Filters */}
          {subject === "chemistry" && chemistryUnits.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Filter by Unit:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setUnitFilter("all")}
                  className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                    unitFilter === "all"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  All Units
                </button>
                {chemistryUnits.map((unit) => (
                  <button
                    key={unit}
                    onClick={() => setUnitFilter(unit)}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                      unitFilter === unit
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {chapters.length > 0 ? (
          <div className="space-y-6">
            {subject === "chemistry" ? (
              // Chemistry: Group by unit sections
              chemistryUnits.length > 0 ? (
                chemistryUnits.map((unit) => {
                  if (unitFilter !== "all" && unit !== unitFilter) return null;
                  
                  const unitChapters = chapters.filter(c => c.unit === unit);
                  if (unitChapters.length === 0) return null;

                  return (
                    <div key={unit} className="space-y-3">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 border-l-4 border-blue-600 pl-3">
                        {unit}
                      </h3>
                      <div className="space-y-2 ml-2">
                        {unitChapters.map((chapter, index) => {
                          const chapterNum = chapters.indexOf(chapter) + 1;
                          const displayName = `Chapter ${chapterNum} - ${chapter.chapterName}`;
                          const isChapterCompleted = completions[`${subject}-${chapter.id}`];
                          const hasSubtopics = chapter.subtopics && chapter.subtopics.length > 0;
                          
                          // Apply search filter
                          if (searchTerm && !displayName.toLowerCase().includes(searchTerm.toLowerCase())) {
                            return null;
                          }
                          
                          // Apply completion filter
                          if (filter === "completed" && !isChapterCompleted) return null;
                          if (filter === "pending" && isChapterCompleted) return null;

                          const allSubtopicsCompleted = hasSubtopics && chapter.subtopics.every(
                            st => completions[`${subject}-${st.id}`]
                          );
                          
                          return (
                            <div key={chapter.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                              <div className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                                <input
                                  type="checkbox"
                                  checked={hasSubtopics ? allSubtopicsCompleted : isChapterCompleted}
                                  onChange={(e) => {
                                    const newCompletions = { ...completions };
                                    const isChecked = e.target.checked;
                                    
                                    const chapterKey = `${subject}-${chapter.id}`;
                                    if (hasSubtopics) {
                                      // Check/uncheck all subtopics AND the chapter itself
                                      chapter.subtopics.forEach(st => {
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
                                <p className={`flex-1 font-medium ${
                                  (hasSubtopics ? allSubtopicsCompleted : isChapterCompleted)
                                    ? "line-through text-gray-500 dark:text-gray-400"
                                    : "text-gray-900 dark:text-gray-100"
                                }`}>
                                  {displayName}
                                </p>
                              </div>
                              
                              {/* Subtopics */}
                              {hasSubtopics && (
                                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                  {chapter.subtopics.map(subtopic => {
                                    const stKey = `${subject}-${subtopic.id}`;
                                    const isStCompleted = completions[stKey];
                                    
                                    return (
                                      <div key={subtopic.id} className="flex items-center gap-3 p-3 pl-12 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                        <input
                                          type="checkbox"
                                          checked={isStCompleted || false}
                                          onChange={(e) => {
                                            const newCompletions = { ...completions };
                                            if (e.target.checked) {
                                              newCompletions[stKey] = true;
                                            } else {
                                              delete newCompletions[stKey];
                                            }
                                            handleCompletionChange(newCompletions);
                                          }}
                                          className="w-4 h-4 cursor-pointer accent-green-600 dark:accent-green-500"
                                        />
                                        <p className={`text-sm ${
                                          isStCompleted
                                            ? "line-through text-gray-500 dark:text-gray-400"
                                            : "text-gray-700 dark:text-gray-300"
                                        }`}>
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
                <p className="text-gray-600 dark:text-gray-400">No chapters available</p>
              )
            ) : (
              // Non-chemistry subjects: Use original grouping logic
              groupedChapters.map((group) => {
                const chapterNumbers = group.chapters.map(c => c.index + 1);
                
                // For grouped chapters (multiple same-name chapters)
                if (chapterNumbers.length > 1) {
                  const firstNum = chapterNumbers[0];
                  const lastNum = chapterNumbers[chapterNumbers.length - 1];
                  const displayName = `Chapter ${firstNum} to ${lastNum} - ${group.name}`;
                  
                  // Apply search filter
                  if (searchTerm && !displayName.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return null;
                  }
                  
                  // For grouped items, mark as complete if ANY chapter is complete
                  const anyCompleted = group.chapters.some(
                    c => completions[`${subject}-${c.chapter.id}`]
                  );
                  
                  // Apply filter
                  if (filter === "completed" && !anyCompleted) return null;
                  if (filter === "pending" && anyCompleted) return null;

                  return (
                    <div key={`group-${group.chapters[0].chapter.id}`} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all">
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
                      <p className={`flex-1 font-medium ${
                        anyCompleted
                          ? "line-through text-gray-500 dark:text-gray-400"
                          : "text-gray-900 dark:text-gray-100"
                      }`}>
                        {displayName}
                      </p>
                    </div>
                  );
                }
                
                // For single chapters (not grouped)
                const chapter = group.chapters[0];
                const index = chapter.index;
                const isCompleted = completions[`${subject}-${chapter.chapter.id}`];
                const chapterNumber = index + 1;
                const displayName = `Chapter ${chapterNumber} - ${group.name}`;
                
                // Apply filter
                if (filter === "completed" && !isCompleted) return null;
                if (filter === "pending" && isCompleted) return null;
                
                // Apply search filter (case-insensitive)
                if (searchTerm && !displayName.toLowerCase().includes(searchTerm.toLowerCase())) {
                  return null;
                }

                const chapterWithNumber = {
                  ...chapter.chapter,
                  chapterName: displayName
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
          <p className="text-gray-600 dark:text-gray-400">No chapters available</p>
        )}
      </div>
    </div>
  );
}
