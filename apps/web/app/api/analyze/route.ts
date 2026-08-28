import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type BoundingBox = {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
};

type AnswerRegion = {
  page: number;
  box: BoundingBox;
};

type Question = {
  id: string;
  number: string;
  questionText: string;
  questionPage: number;
  maxMarks: number;
  awardedMarks: number;
  status: "answered" | "unanswered";
  mappingMethod: "explicit_label" | "content" | null;
  answerSummary: string | null;
  regions: AnswerRegion[];
  gradingConfidence: "high" | "medium" | "low";
  strengths: string[];
  improvements: string[];
  feedback: string;
};

type UnmatchedAnswer = {
  page?: number;
  detectedNumber?: string | null;
  summary?: string;
  reason?: string;
  regions?: AnswerRegion[];
};

type AnalysisResult = {
  documentType: string;
  totalQuestions: number;
  totalMaximumMarks: number;
  totalAwardedMarks: number;
  questions: Question[];
  unmatchedAnswers: UnmatchedAnswer[];
};

const MODEL = "gemini-3.6-flash";

const COMMON_RULES = `
You are analyzing an educational assessment.

IMPORTANT OUTPUT RULES
- Return valid JSON only.
- Bounding boxes use normalized integer coordinates from 0 to 1000:
  { "ymin": 0..1000, "xmin": 0..1000, "ymax": 0..1000, "xmax": 0..1000 }.
- A region must tightly cover the student's handwritten answer content, including diagrams/tables that belong to it.
- Do NOT include printed question text in answer regions.
- If an answer spans multiple pages, return one region per page.
- Preserve question numbering exactly. Treat explicitly labeled subparts separately if they are separate assessable items.
- Prefer English question text when the paper is bilingual.
- Do not force-map ambiguous handwriting to a question.
- An unlabeled answer CAN be mapped if its semantic content clearly identifies the corresponding question.
- For every answered question, set mappingMethod:
  - "explicit_label" when the answer has a reliable handwritten question number/label that identifies the question.
  - "content" when the answer has no reliable label and was matched primarily by semantic content.
- For unanswered questions, set mappingMethod to null.
- If handwriting cannot be confidently matched to any question, put it in unmatchedAnswers.
- EVERY unmatched answer MUST include its own exact regions so the UI can locate and highlight that handwriting.
- For each unmatched answer, also include page, detectedNumber (or null), summary, and reason.
`;

const QUESTION_SCHEMA = `
Each question object must contain:
{
  "id": "string",
  "number": "string",
  "questionText": "string",
  "questionPage": number,
  "maxMarks": number,
  "awardedMarks": number,
  "status": "answered" | "unanswered",
  "mappingMethod": "explicit_label" | "content" | null,
  "answerSummary": string | null,
  "regions": [
    {
      "page": number,
      "box": {
        "ymin": number,
        "xmin": number,
        "ymax": number,
        "xmax": number
      }
    }
  ],
  "gradingConfidence": "high" | "medium" | "low",
  "strengths": ["string"],
  "improvements": ["string"],
  "feedback": "string"
}
`;

const UNMATCHED_SCHEMA = `
Each unmatchedAnswers item must contain:
{
  "page": number,
  "detectedNumber": string | null,
  "summary": "short description of the handwriting",
  "reason": "why it cannot be confidently mapped to any question",
  "regions": [
    {
      "page": number,
      "box": {
        "ymin": number,
        "xmin": number,
        "ymax": number,
        "xmax": number
      }
    }
  ]
}

CRITICAL:
- Do not return an unmatched answer without regions.
- If there are two separate unrelated handwritten blocks, return two separate unmatchedAnswers items with separate regions.
`;

function normalizeBox(box: BoundingBox): BoundingBox {
  const clamp = (value: unknown) =>
    Math.max(
      0,
      Math.min(
        1000,
        Number.isFinite(Number(value))
          ? Number(value)
          : 0
      )
    );

  const ymin = clamp(box?.ymin);
  const xmin = clamp(box?.xmin);
  const ymax = clamp(box?.ymax);
  const xmax = clamp(box?.xmax);

  return {
    ymin: Math.min(ymin, ymax),
    xmin: Math.min(xmin, xmax),
    ymax: Math.max(ymin, ymax),
    xmax: Math.max(xmin, xmax),
  };
}

function normalizeRegions(
  regions: unknown
): AnswerRegion[] {
  if (!Array.isArray(regions)) {
    return [];
  }

  return regions
    .map((region) => {
      const item =
        region as Partial<AnswerRegion>;

      const page = Math.max(
        1,
        Math.round(Number(item.page) || 1)
      );

      if (!item.box) {
        return null;
      }

      return {
        page,
        box: normalizeBox(item.box),
      };
    })
    .filter(
      (
        item
      ): item is AnswerRegion =>
        item !== null
    );
}

function normalizeAnalysis(
  input: Partial<AnalysisResult>,
  documentType: string
): AnalysisResult {
  const questions = Array.isArray(
    input.questions
  )
    ? input.questions.map((raw, index) => {
        const question =
          raw as Partial<Question>;

        const maxMarks = Math.max(
          0,
          Number(question.maxMarks) || 0
        );

        let awardedMarks = Math.max(
          0,
          Number(question.awardedMarks) || 0
        );

        awardedMarks =
          Math.round(awardedMarks * 2) / 2;

        awardedMarks = Math.min(
          awardedMarks,
          maxMarks
        );

        const status =
          question.status === "answered"
            ? "answered"
            : "unanswered";

        if (status === "unanswered") {
          awardedMarks = 0;
        }

        return {
          id:
            String(
              question.id ??
                question.number ??
                index + 1
            ),
          number: String(
            question.number ?? index + 1
          ),
          questionText:
            question.questionText || "",
          questionPage: Math.max(
            1,
            Math.round(
              Number(question.questionPage) ||
                1
            )
          ),
          maxMarks,
          awardedMarks,
          status,
          mappingMethod:
            status === "unanswered"
              ? null
              : question.mappingMethod === "content"
                ? "content"
                : "explicit_label",
          answerSummary:
            status === "answered"
              ? question.answerSummary || null
              : null,
          regions:
            status === "answered"
              ? normalizeRegions(
                  question.regions
                )
              : [],
          gradingConfidence:
            question.gradingConfidence ===
              "medium" ||
            question.gradingConfidence ===
              "low"
              ? question.gradingConfidence
              : "high",
          strengths: Array.isArray(
            question.strengths
          )
            ? question.strengths.map(String)
            : [],
          improvements: Array.isArray(
            question.improvements
          )
            ? question.improvements.map(
                String
              )
            : [],
          feedback:
            question.feedback ||
            (status === "unanswered"
              ? "No answer was provided."
              : ""),
        } satisfies Question;
      })
    : [];

  const unmatchedAnswers =
    Array.isArray(input.unmatchedAnswers)
      ? input.unmatchedAnswers.map(
          (raw) => {
            const item =
              raw as Partial<UnmatchedAnswer>;

            const regions =
              normalizeRegions(
                item.regions
              );

            return {
              page:
                item.page ??
                regions[0]?.page ??
                1,
              detectedNumber:
                item.detectedNumber ??
                null,
              summary:
                item.summary || "",
              reason:
                item.reason || "",
              regions,
            } satisfies UnmatchedAnswer;
          }
        )
      : [];

  const totalMaximumMarks =
    questions.reduce(
      (sum, question) =>
        sum + question.maxMarks,
      0
    );

  const totalAwardedMarks =
    questions.reduce(
      (sum, question) =>
        sum + question.awardedMarks,
      0
    );

  return {
    documentType,
    totalQuestions:
      questions.length,
    totalMaximumMarks,
    totalAwardedMarks:
      Math.round(totalAwardedMarks * 2) /
      2,
    questions,
    unmatchedAnswers,
  };
}

async function fileToInlineData(file: File) {
  const buffer = Buffer.from(
    await file.arrayBuffer()
  );

  return {
    inlineData: {
      mimeType:
        file.type ||
        "application/octet-stream",
      data: buffer.toString("base64"),
    },
  };
}

async function analyzeCombined(
  ai: GoogleGenAI,
  file: File
) {
  const prompt = `
${COMMON_RULES}

DOCUMENT:
This is a combined question-cum-answer booklet. Printed questions and student handwriting may appear in the same document.

TASKS
1. Extract every printed question in printed order.
2. Determine which student handwriting answers which question.
3. Detect exact answer regions.
4. Identify unanswered questions.
5. Identify any handwriting that cannot be confidently mapped and put it in unmatchedAnswers WITH exact regions.
6. Grade each mapped answer.

GRADING
- Use the printed maximum marks.
- Award marks conservatively using relevance, accuracy, coverage, analysis, structure, supporting material, and clarity.
- awardedMarks must be between 0 and maxMarks in increments of 0.5.
- For unanswered questions: awardedMarks=0, gradingConfidence="high", strengths=[], improvements=["No answer was provided."], feedback="No answer was provided."

${QUESTION_SCHEMA}
${UNMATCHED_SCHEMA}

Top-level JSON:
{
  "documentType": "combined_booklet",
  "totalQuestions": number,
  "totalMaximumMarks": number,
  "totalAwardedMarks": number,
  "questions": [...],
  "unmatchedAnswers": [...]
}
`;

  const response =
    await ai.models.generateContent({
      model: MODEL,
      contents: [
        await fileToInlineData(file),
        { text: prompt },
      ],
      config: {
        responseMimeType:
          "application/json",
        temperature: 0.1,
      },
    });

  const rawText = response.text || "{}";
  const parsed = JSON.parse(rawText);

  return normalizeAnalysis(
    parsed,
    "combined_booklet"
  );
}

async function analyzeSeparate(
  ai: GoogleGenAI,
  questionPaper: File,
  answerSheet: File
) {
  const prompt = `
${COMMON_RULES}

DOCUMENT 1 is the QUESTION PAPER.
DOCUMENT 2 is the STUDENT ANSWER SHEET.

TASKS
1. Extract every printed question ONLY from Document 1, in printed order.
2. Read handwriting ONLY from Document 2.
3. Map each answer to the correct question even if:
   - answers are out of order,
   - handwritten question numbers are missing,
   - labels are incomplete,
   - content must be matched semantically.
4. Do NOT rely only on answer-sheet page order.
5. Mark a question unanswered only when no sufficiently matching answer exists.
6. Any handwriting that does not confidently correspond to a question MUST be returned in unmatchedAnswers.
7. For every matched answer AND every unmatched answer, detect exact regions on Document 2.
8. Grade mapped answers.

UNMATCHED ANSWERS ARE IMPORTANT:
If the answer sheet contains unrelated text such as a definition of a topic that no question asks about, do not force-map it. Return it as unmatched with a tight bounding region around that exact handwriting.

GRADING
- Use the printed maximum marks from Document 1.
- Award marks conservatively using relevance, accuracy, coverage, analysis, structure, supporting material, and clarity.
- awardedMarks must be between 0 and maxMarks in increments of 0.5.
- For unanswered questions: awardedMarks=0, gradingConfidence="high", strengths=[], improvements=["No answer was provided."], feedback="No answer was provided."

${QUESTION_SCHEMA}
${UNMATCHED_SCHEMA}

Top-level JSON:
{
  "documentType": "separate_files",
  "totalQuestions": number,
  "totalMaximumMarks": number,
  "totalAwardedMarks": number,
  "questions": [...],
  "unmatchedAnswers": [...]
}
`;

  const response =
    await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          text:
            "DOCUMENT 1: QUESTION PAPER",
        },
        await fileToInlineData(
          questionPaper
        ),
        {
          text:
            "DOCUMENT 2: STUDENT ANSWER SHEET",
        },
        await fileToInlineData(
          answerSheet
        ),
        { text: prompt },
      ],
      config: {
        responseMimeType:
          "application/json",
        temperature: 0.1,
      },
    });

  const rawText = response.text || "{}";
  const parsed = JSON.parse(rawText);

  return normalizeAnalysis(
    parsed,
    "separate_files"
  );
}

export async function POST(
  request: Request
) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is missing.",
        },
        { status: 500 }
      );
    }

    const formData =
      await request.formData();

    const mode = String(
      formData.get("mode") ||
        "separate"
    );

    const ai = new GoogleGenAI({
      apiKey,
    });

    if (mode === "combined") {
      const combinedBooklet =
        formData.get(
          "combinedBooklet"
        );

      if (
        !(combinedBooklet instanceof File)
      ) {
        return NextResponse.json(
          {
            error:
              "Combined booklet is required.",
          },
          { status: 400 }
        );
      }

      const analysis =
        await analyzeCombined(
          ai,
          combinedBooklet
        );

      console.log(
        "Combined analysis:\n",
        JSON.stringify(
          analysis,
          null,
          2
        )
      );

      return NextResponse.json({
        success: true,
        mode: "combined",
        analysis,
      });
    }

    const questionPaper =
      formData.get(
        "questionPaper"
      );

    const answerSheet =
      formData.get("answerSheet");

    if (
      !(questionPaper instanceof File) ||
      !(answerSheet instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "Question paper and answer sheet are required.",
        },
        { status: 400 }
      );
    }

    const analysis =
      await analyzeSeparate(
        ai,
        questionPaper,
        answerSheet
      );

    console.log(
      "Separate-files analysis:\n",
      JSON.stringify(
        analysis,
        null,
        2
      )
    );

    return NextResponse.json({
      success: true,
      mode: "separate",
      analysis,
    });
  } catch (error) {
    console.error(
      "Analyze route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Analysis failed.",
      },
      { status: 500 }
    );
  }
}
