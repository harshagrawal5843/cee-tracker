import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ceeData, ceeSubjects, getSubjectDisplayName } from "@/data";
import { getDailyDateKey } from "@/lib/dailyChallenge";

const MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

function hashString(value) {
  let hash = 0;
  const input = String(value || "");

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function uniqueCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${candidate.subject}::${candidate.chapter}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildDailyCandidates(dateKey) {
  const seed = hashString(dateKey);
  const candidates = [];

  ceeSubjects.forEach((subject, subjectIndex) => {
    const chapters = ceeData[subject] || [];
    if (!chapters.length) return;

    const firstIndex = (seed + subjectIndex * 7) % chapters.length;
    const secondIndex =
      (firstIndex + Math.max(1, Math.floor(chapters.length / 3))) %
      chapters.length;

    [firstIndex, secondIndex].forEach((chapterIndex) => {
      const chapter = chapters[chapterIndex];
      candidates.push({
        subjectKey: subject,
        subject: getSubjectDisplayName(subject),
        chapter: chapter.chapterName || chapter.name || chapter.id,
      });
    });
  });

  return uniqueCandidates(candidates);
}

function normalizeAnswer(answer, options) {
  const raw = String(answer || "").trim();
  if (!raw) return "";

  if (options.includes(raw)) {
    return raw;
  }

  const letter = raw.match(/^[A-D]$/i)?.[0]?.toUpperCase();
  if (letter) {
    const option = options[letter.charCodeAt(0) - 65];
    if (option) return option;
  }

  return options.find((option) => option === raw) || options[0] || raw;
}

function normalizePlan(rawPlan, dateKey) {
  const tasks = Array.isArray(rawPlan?.tasks) ? rawPlan.tasks : [];
  const normalizedTasks = [];

  tasks.forEach((task) => {
    const subject = String(task?.subject || "").trim();
    const chapter = String(task?.chapter || "").trim();
    const questions = Array.isArray(task?.questions) ? task.questions : [];

    if (!subject || !chapter) return;

    const normalizedQuestions = questions
      .map((question) => {
        const options = Array.isArray(question?.options)
          ? question.options
              .map((option) => String(option).trim())
              .filter(Boolean)
              .slice(0, 4)
          : [];

        if (options.length !== 4) return null;

        const questionText = String(question?.question || "").trim();
        if (!questionText) return null;

        return {
          question: questionText,
          options,
          answer: normalizeAnswer(question?.answer, options),
        };
      })
      .filter(Boolean)
      .slice(0, 5);

    if (normalizedQuestions.length < 3) return;

    normalizedTasks.push({
      subject,
      chapter,
      estimatedMinutes: 10,
      questions: normalizedQuestions,
    });
  });

  return {
    date: dateKey,
    tasks: normalizedTasks.slice(0, 6),
  };
}

function buildFallbackQuestions(subjectKey, chapter, dateKey) {
  const pools = {
    physics: [
      {
        question: `Which quantity is a vector in ${chapter}?`,
        options: ["Speed", "Distance", "Displacement", "Time"],
        answer: "Displacement",
      },
      {
        question: `The SI unit of force is related to ${chapter} and is called?`,
        options: ["Joule", "Newton", "Watt", "Pascal"],
        answer: "Newton",
      },
      {
        question: `Which law is most closely associated with inertia in ${chapter}?`,
        options: ["First law", "Second law", "Third law", "Law of gravitation"],
        answer: "First law",
      },
      {
        question: `In ${chapter}, what does acceleration measure?`,
        options: [
          "Change in velocity",
          "Distance covered",
          "Mass of body",
          "Time taken",
        ],
        answer: "Change in velocity",
      },
    ],
    chemistry: [
      {
        question: `In ${chapter}, which particle has a positive charge?`,
        options: ["Electron", "Neutron", "Proton", "Photon"],
        answer: "Proton",
      },
      {
        question: `What does the atomic number represent in ${chapter}?`,
        options: [
          "Number of neutrons",
          "Number of protons",
          "Number of electrons only",
          "Mass number",
        ],
        answer: "Number of protons",
      },
      {
        question: `A periodic table groups elements mainly by increasing?`,
        options: ["Mass number", "Atomic number", "Density", "Valency only"],
        answer: "Atomic number",
      },
      {
        question: `Which of these is a noble gas?`,
        options: ["Oxygen", "Nitrogen", "Neon", "Chlorine"],
        answer: "Neon",
      },
    ],
    zoology: [
      {
        question: `Which organ pumps blood in animals studied in ${chapter}?`,
        options: ["Lung", "Brain", "Heart", "Kidney"],
        answer: "Heart",
      },
      {
        question: `Which of these is a vertebrate?`,
        options: ["Earthworm", "Spider", "Frog", "Hydra"],
        answer: "Frog",
      },
      {
        question: `Mammals are characterized by`,
        options: ["Feathers", "Gills", "Milk production", "Exoskeleton"],
        answer: "Milk production",
      },
      {
        question: `Respiration is mainly used to`,
        options: ["Store food", "Release energy", "Make bones", "Pump blood"],
        answer: "Release energy",
      },
    ],
    botany: [
      {
        question: `In ${chapter}, where does photosynthesis mainly occur?`,
        options: ["Roots", "Leaves", "Flowers", "Seeds"],
        answer: "Leaves",
      },
      {
        question: `Which tissue transports water in plants?`,
        options: ["Phloem", "Xylem", "Cambium", "Epidermis"],
        answer: "Xylem",
      },
      {
        question: `Seeds usually germinate when they get`,
        options: [
          "Salt only",
          "Suitable moisture and warmth",
          "Only sunlight",
          "Only minerals",
        ],
        answer: "Suitable moisture and warmth",
      },
      {
        question: `Which pigment gives leaves their green color?`,
        options: ["Hemoglobin", "Chlorophyll", "Melanin", "Keratin"],
        answer: "Chlorophyll",
      },
    ],
    "mental-ability-test": [
      {
        question: `What is 25% of 200?`,
        options: ["20", "25", "50", "75"],
        answer: "50",
      },
      {
        question: `If the ratio is 2:3 and the total is 25, what is the larger part?`,
        options: ["10", "12", "15", "18"],
        answer: "15",
      },
      {
        question: `A train covers 60 km in 2 hours. Its speed is`,
        options: ["20 km/h", "25 km/h", "30 km/h", "40 km/h"],
        answer: "30 km/h",
      },
      {
        question: `Which number comes next: 2, 4, 8, 16, ?`,
        options: ["18", "24", "32", "36"],
        answer: "32",
      },
    ],
  };

  const seed = hashString(`${dateKey}-${subjectKey}-${chapter}`);
  const pool = pools[subjectKey] || pools.physics;
  return [0, 1, 2].map((offset) => {
    const template = pool[(seed + offset) % pool.length];
    return {
      question: template.question.replace(/${chapter}/g, chapter),
      options: template.options,
      answer: template.answer,
    };
  });
}

function buildFallbackPlan(dateKey) {
  const bySubject = new Map();
  buildDailyCandidates(dateKey).forEach((candidate) => {
    if (!bySubject.has(candidate.subjectKey)) {
      bySubject.set(candidate.subjectKey, candidate);
    }
  });

  const tasks = [];
  ceeSubjects.forEach((subjectKey) => {
    const candidate = bySubject.get(subjectKey);
    if (!candidate) return;

    tasks.push({
      subject: candidate.subject,
      chapter: candidate.chapter,
      estimatedMinutes: 10,
      questions: buildFallbackQuestions(subjectKey, candidate.chapter, dateKey),
    });
  });

  return {
    date: dateKey,
    tasks: tasks.slice(0, 6),
  };
}

async function generateWithGemini(dateKey) {
  const candidates = buildDailyCandidates(dateKey);
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const prompt = `You are a study planner for CEE Tracker.

Generate a daily challenge for students preparing for CEE.

Rules:
- Create 4 to 6 tasks
- Each task must be from subjects:
  Physics, Chemistry, Zoology, Botany, Mental Ability
- Keep tasks balanced across subjects
- Each task should be solvable in about 10 minutes

Task rules:
- Tasks must ONLY involve solving MCQs
- Do NOT include lectures or theory
- Each task must include:
  subject, chapter, estimatedMinutes, questions

MCQ rules:
- Each task must have 3 to 5 MCQs
- Each MCQ must include:
  question, options (4), correct answer
- Questions should be short and exam-style
- Difficulty: moderate (CEE level)

Use only the candidate chapters below. Do not invent chapters outside this list.

Candidate chapters:
${JSON.stringify(candidates, null, 2)}

Output JSON ONLY:

{
  "date": "YYYY-MM-DD",
  "tasks": [
    {
      "subject": "Physics",
      "chapter": "Laws of Motion",
      "estimatedMinutes": 10,
      "questions": [
        {
          "question": "Sample question?",
          "options": ["A", "B", "C", "D"],
          "answer": "A"
        }
      ]
    }
  ]
}`;

  for (const modelName of MODEL_CANDIDATES) {
    const model = ai.getGenerativeModel({ model: modelName });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            topP: 1,
            topK: 1,
            responseMimeType: "application/json",
          },
        });

        const text = result.response.text();
        const parsed = JSON.parse(text);
        const normalized = normalizePlan(parsed, dateKey);
        if (normalized.tasks.length >= 4) {
          return normalized;
        }
      } catch (error) {
        const message = String(error?.message || error || "");
        const isOverloaded =
          message.includes("503") || message.includes("high demand");
        if (!isOverloaded && attempt === 1) {
          throw error;
        }
        if (!isOverloaded && attempt === 0) {
          continue;
        }
        break;
      }
    }
  }

  throw new Error("Gemini returned an invalid daily plan.");
}

async function getOrCreateDailyPlan(dateKey) {
  const planRef = doc(db, "dailyPlans", dateKey);
  let planSnap = null;

  try {
    planSnap = await getDoc(planRef);
  } catch (error) {
    console.warn(
      "dailyPlans read failed, falling back to generation:",
      error?.message || error,
    );
  }

  if (planSnap?.exists()) {
    const data = planSnap.data();
    if (Array.isArray(data?.tasks) && data.tasks.length > 0) {
      return data;
    }
  }

  let generatedPlan = null;

  try {
    generatedPlan = await generateWithGemini(dateKey);
  } catch (error) {
    console.warn(
      "Gemini generation failed, using fallback plan:",
      error?.message || error,
    );
    generatedPlan = buildFallbackPlan(dateKey);
  }

  const payload = {
    ...generatedPlan,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: generatedPlan?.tasks?.length >= 4 ? "gemini" : "fallback",
  };

  try {
    await setDoc(planRef, payload, { merge: true });
  } catch (error) {
    console.warn(
      "dailyPlans write failed, returning generated plan only:",
      error?.message || error,
    );
  }
  return payload;
}

export async function GET() {
  try {
    const dateKey = getDailyDateKey();
    const plan = await getOrCreateDailyPlan(dateKey);
    return NextResponse.json(plan, { status: 200 });
  } catch (error) {
    console.error("generate-daily-plan error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to generate today's challenge.",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  return GET();
}

export const maxDuration = 60;