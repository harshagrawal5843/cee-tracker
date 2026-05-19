"use client";

export function ChapterAccordion({
  chapter,
  subject,
  completions,
  onCompletionChange,
}) {
  const chapterKey = `${subject}-${chapter.id}`;
  const isChapterCompleted = completions[chapterKey] || false;

  const handleChapterToggle = () => {
    const newCompletions = { ...completions };
    if (isChapterCompleted) {
      delete newCompletions[chapterKey];
    } else {
      newCompletions[chapterKey] = true;
    }
    onCompletionChange(newCompletions);
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors mb-3">
      <input
        type="checkbox"
        checked={isChapterCompleted}
        onChange={handleChapterToggle}
        className="w-6 h-6 rounded accent-blue-600 cursor-pointer flex-shrink-0"
      />
      <p className={`font-medium text-lg flex-1 ${
        isChapterCompleted
          ? "line-through text-gray-500 dark:text-gray-500"
          : "text-gray-900 dark:text-gray-100"
      }`}>
        {chapter.chapterName}
      </p>
    </div>
  );
}
