import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RawQuestion = {
  id?: string;
  number?: string;
  questionText?: string;
  questionPage?: number;
  maxMarks?: number;
  awardedMarks?: number;
  status?: "answered" | "unanswered";
  answerSummary?: string | null;
  regions?: unknown[];
  gradingConfidence?: "high" | "medium" | "low";
  strengths?: string[];
  improvements?: string[];
  feedback?: string;
};

function normalizeAnalysis(analysis: any) {
  if (
    !analysis ||
    !Array.isArray(analysis.questions)
  ) {
    throw new Error(
      "Gemini response does not contain valid questions."
    );
  }

  let totalMaximumMarks = 0;
  let totalAwardedMarks = 0;

  const questions = analysis.questions.map(
    (question: RawQuestion, index: number) => {
      const maxMarks =
        typeof question.maxMarks === "number"
          ? question.maxMarks
          : 0;

      let awardedMarks =
        typeof question.awardedMarks === "number"
          ? question.awardedMarks
          : 0;

      const status =
        question.status === "answered"
          ? "answered"
          : "unanswered";

      if (status === "unanswered") {
        awardedMarks = 0;
      }

      awardedMarks = Math.max(
        0,
        Math.min(awardedMarks, maxMarks)
      );

      awardedMarks =
        Math.round(awardedMarks * 2) / 2;

      totalMaximumMarks += maxMarks;
      totalAwardedMarks += awardedMarks;

      return {
        id:
          question.id ??
          question.number ??
          String(index + 1),

        number:
          question.number ?? String(index + 1),

        questionText:
          question.questionText ?? "",

        questionPage:
          typeof question.questionPage === "number"
            ? question.questionPage
            : 1,

        maxMarks,
        awardedMarks,
        status,

        answerSummary:
          status === "answered"
            ? question.answerSummary ?? ""
            : null,

        regions:
          status === "answered" &&
          Array.isArray(question.regions)
            ? question.regions
            : [],

        gradingConfidence:
          status === "unanswered"
            ? "high"
            : question.gradingConfidence ??
              "medium",

        strengths:
          status === "unanswered"
            ? []
            : Array.isArray(question.strengths)
              ? question.strengths
              : [],

        improvements:
          status === "unanswered"
            ? ["No answer was provided."]
            : Array.isArray(
                  question.improvements
                )
              ? question.improvements
              : [],

        feedback:
          status === "unanswered"
            ? "No answer was provided for this question."
            : question.feedback ?? "",
      };
    }
  );

  return {
    ...analysis,
    totalQuestions: questions.length,
    totalMaximumMarks,
    totalAwardedMarks,
    questions,
    unmatchedAnswers: Array.isArray(
      analysis.unmatchedAnswers
    )
      ? analysis.unmatchedAnswers
      : [],
  };
}

const combinedPrompt = `
You are an expert academic assessment evaluator.

You are analyzing ONE scanned QUESTION-CUM-ANSWER BOOKLET.

The single document contains:
- printed questions
- handwritten student answers
- continuation pages
- blank answers
- diagrams
- headers and instructions

Perform:

1. Question extraction
2. Answer detection
3. Answer-to-question mapping
4. Exact answer-region detection
5. Grading
6. Feedback

QUESTION RULES:

- Extract every real exam question in original printed order.
- Preserve the original numbering.
- Treat explicit subparts such as 11(a) and 11(b) separately.
- Hindi and English versions of the same printed question are ONE question.
- Prefer the English text when clearly available.
- Do not treat instructions, page numbers, headers or administrative content as questions.
- Include word limit when visible.
- Extract the printed maximum marks.

ANSWER RULES:

- Printed question text is not an answer.
- Meaningful handwriting is an answer.
- Diagrams belonging to the response count as answer content.
- Answers may continue across several pages.
- Continuation pages may contain no repeated question number.
- Detect unanswered questions.
- Never fabricate missing answers.

BOUNDING BOX RULES:

For every page containing part of an answer, return a region.

Coordinates are normalized from 0 to 1000:

{
  "ymin": 100,
  "xmin": 100,
  "ymax": 900,
  "xmax": 900
}

- Page numbers refer to this PDF.
- PDF page numbering begins at 1.
- Include handwriting and relevant diagrams.
- Exclude printed question text wherever possible.
- Exclude headers, page numbers and margins.

GRADING RULES:

Grade the handwritten answer against the printed question.

Consider:
- relevance
- factual accuracy
- coverage
- analysis
- structure
- examples/evidence
- diagrams where appropriate
- clarity

Do not heavily penalize handwriting quality.

awardedMarks:
- must be between 0 and maxMarks
- may use 0.5 increments
- should be realistic and conservative

Full marks should be rare.

For unanswered questions:
- awardedMarks = 0
- answerSummary = null
- regions = []
- gradingConfidence = "high"
- strengths = []
- improvements = ["No answer was provided."]
- feedback = "No answer was provided for this question."

Return ONLY valid JSON.

Structure:

{
  "documentType": "combined_booklet",
  "totalQuestions": 0,
  "totalMaximumMarks": 0,
  "totalAwardedMarks": 0,
  "questions": [
    {
      "id": "1",
      "number": "1",
      "questionText": "question text",
      "questionPage": 1,
      "maxMarks": 10,
      "awardedMarks": 5.5,
      "status": "answered",
      "answerSummary": "summary",
      "regions": [
        {
          "page": 1,
          "box": {
            "ymin": 100,
            "xmin": 100,
            "ymax": 900,
            "xmax": 900
          }
        }
      ],
      "gradingConfidence": "high",
      "strengths": [
        "specific strength"
      ],
      "improvements": [
        "specific improvement"
      ],
      "feedback": "2 to 4 sentence teacher-style feedback"
    }
  ],
  "unmatchedAnswers": []
}

Inspect the ENTIRE PDF before answering.
`;

const separatePrompt = `
You are an expert academic assessment evaluator.

You have been given TWO separate documents.

DOCUMENT 1 = QUESTION PAPER

DOCUMENT 2 = HANDWRITTEN ANSWER SHEET

This distinction is extremely important.

Your task is to:

1. Extract every question from DOCUMENT 1.
2. Detect handwritten answers in DOCUMENT 2.
3. Map every handwritten answer to the correct question.
4. Detect unanswered questions.
5. Detect unmatched handwritten answers.
6. Detect exact handwritten answer regions in DOCUMENT 2.
7. Grade each mapped answer.
8. Produce teacher-style feedback.

==================================================
QUESTION PAPER RULES
==================================================

Extract every actual exam question from DOCUMENT 1.

- Preserve printed order.
- Preserve exact numbering.
- Preserve labels such as:
  1
  2
  11(a)
  11(b)
  Q5
  Section-A 3(b)

- Explicit subparts must be separate questions when they
  are separately answerable.

- Hindi and English versions of the same question are ONE
  question.
- Prefer the English wording when clearly available.
- Extract printed maximum marks.
- Include word limit when visible.
- Do not treat instructions, headers, section descriptions,
  page numbers or administrative text as questions.

questionPage MUST refer to DOCUMENT 1 page numbering.

==================================================
ANSWER SHEET RULES
==================================================

DOCUMENT 2 contains handwritten student answers.

Answers MAY:

- be in the same order as the question paper
- be OUT OF ORDER
- skip questions
- continue across multiple pages
- contain diagrams
- contain explicit question numbers
- contain question numbers written in different styles
- have continuation pages without repeating the question number

You MUST map based on:

1. written question number when available
2. content semantics
3. surrounding answer context
4. continuation-page context

Do NOT simply assume:

answer 1 = first handwriting
answer 2 = second handwriting

Example:

The student may write:

8
(answer...)

3
(answer...)

5
(answer...)

This must map to Q8, Q3 and Q5 respectively.

==================================================
UNANSWERED QUESTIONS
==================================================

Every question from DOCUMENT 1 MUST appear in the final
questions array.

If no answer can be mapped:

status = "unanswered"
awardedMarks = 0
answerSummary = null
regions = []

==================================================
UNMATCHED ANSWERS
==================================================

If DOCUMENT 2 contains meaningful handwritten answer
content that cannot confidently be mapped to any extracted
question, do NOT discard it.

Put it into:

"unmatchedAnswers"

Structure:

{
  "page": 5,
  "detectedNumber": "22",
  "summary": "brief summary",
  "reason": "No matching question exists in the uploaded question paper."
}

If there are none:

"unmatchedAnswers": []

==================================================
BOUNDING BOXES
==================================================

All regions refer ONLY to DOCUMENT 2, the answer sheet.

Coordinates must be normalized from 0 to 1000.

Format:

{
  "page": 2,
  "box": {
    "ymin": 100,
    "xmin": 100,
    "ymax": 900,
    "xmax": 900
  }
}

Rules:

- Include handwritten answer content.
- Include handwritten diagrams.
- Exclude printed template material where possible.
- Exclude margins and unrelated content.
- Return one region for every answer page.
- Page numbering begins from 1 within DOCUMENT 2.

==================================================
GRADING
==================================================

Grade each mapped handwritten answer against the question
from DOCUMENT 1.

Evaluate:

- relevance
- factual accuracy
- coverage
- analysis
- structure
- examples/evidence
- diagrams where useful
- clarity

Do not heavily penalize handwriting style.

awardedMarks:

- must be >= 0
- must be <= maxMarks
- may use 0.5 increments
- should be conservative and realistic

Full marks should be rare.

For unanswered questions:

awardedMarks = 0
gradingConfidence = "high"
strengths = []
improvements = ["No answer was provided."]
feedback = "No answer was provided for this question."

==================================================
FEEDBACK
==================================================

For each answered question return:

strengths:
1 to 3 answer-specific strengths.

improvements:
1 to 3 concrete improvements.

feedback:
2 to 4 concise sentences explaining why the score was
awarded.

gradingConfidence:

"high"
"medium"
or
"low"

Use low confidence when handwriting or mapping is ambiguous.

==================================================
OUTPUT
==================================================

Return ONLY valid JSON.

Do not use Markdown.

Use exactly:

{
  "documentType": "separate_files",
  "totalQuestions": 0,
  "totalMaximumMarks": 0,
  "totalAwardedMarks": 0,

  "questions": [
    {
      "id": "1",
      "number": "1",

      "questionText": "Full question",

      "questionPage": 1,

      "maxMarks": 10,
      "awardedMarks": 6,

      "status": "answered",

      "answerSummary": "What the student wrote",

      "regions": [
        {
          "page": 3,
          "box": {
            "ymin": 100,
            "xmin": 100,
            "ymax": 900,
            "xmax": 900
          }
        }
      ],

      "gradingConfidence": "high",

      "strengths": [
        "specific strength"
      ],

      "improvements": [
        "specific improvement"
      ],

      "feedback": "specific teacher-style feedback"
    }
  ],

  "unmatchedAnswers": [
    {
      "page": 1,
      "detectedNumber": "99",
      "summary": "brief summary",
      "reason": "No matching question exists."
    }
  ]
}

IMPORTANT:

- Every question from DOCUMENT 1 must appear.
- Do not drop unanswered questions.
- Do not force unmatched answers onto unrelated questions.
- Map out-of-order answers correctly.
- Regions MUST refer to DOCUMENT 2.
- Inspect BOTH complete documents before producing JSON.
`;

export async function POST(request: Request) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Gemini API key is missing.",
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const formData =
      await request.formData();

    const mode =
      formData.get("mode");

    // =====================================================
    // COMBINED BOOKLET
    // Existing working functionality
    // =====================================================

    if (mode === "combined") {
      const combinedBooklet =
        formData.get(
          "combinedBooklet"
        );

      if (
        !(
          combinedBooklet instanceof
          File
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Combined booklet is missing.",
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(
        await combinedBooklet.arrayBuffer()
      );

      const base64Data =
        buffer.toString("base64");

      console.log(
        `Analyzing combined booklet: ${combinedBooklet.name}`
      );

      const response =
        await ai.models.generateContent(
          {
            model:
              "gemini-3.6-flash",

            contents: [
              {
                inlineData: {
                  mimeType:
                    combinedBooklet.type ||
                    "application/pdf",
                  data: base64Data,
                },
              },
              {
                text: combinedPrompt,
              },
            ],

            config: {
              responseMimeType:
                "application/json",
              temperature: 0.1,
            },
          }
        );

      if (!response.text) {
        throw new Error(
          "Gemini returned an empty response."
        );
      }

      let rawAnalysis;

      try {
        rawAnalysis = JSON.parse(
          response.text
        );
      } catch {
        console.error(
          "Invalid combined JSON:\n",
          response.text
        );

        throw new Error(
          "Gemini returned invalid JSON."
        );
      }

      const analysis =
        normalizeAnalysis(
          rawAnalysis
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
        filename:
          combinedBooklet.name,
        analysis,
      });
    }

    // =====================================================
    // SEPARATE FILES
    // New functionality
    // =====================================================

    if (mode === "separate") {
      const questionPaper =
        formData.get(
          "questionPaper"
        );

      const answerSheet =
        formData.get(
          "answerSheet"
        );

      if (
        !(
          questionPaper instanceof
          File
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Question paper is missing.",
          },
          { status: 400 }
        );
      }

      if (
        !(
          answerSheet instanceof
          File
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Answer sheet is missing.",
          },
          { status: 400 }
        );
      }

      const questionBuffer =
        Buffer.from(
          await questionPaper.arrayBuffer()
        );

      const answerBuffer =
        Buffer.from(
          await answerSheet.arrayBuffer()
        );

      const questionBase64 =
        questionBuffer.toString(
          "base64"
        );

      const answerBase64 =
        answerBuffer.toString(
          "base64"
        );

      console.log(
        `Analyzing separate files:
Question paper: ${questionPaper.name}
Answer sheet: ${answerSheet.name}`
      );

      const response =
        await ai.models.generateContent(
          {
            model:
              "gemini-3.6-flash",

            contents: [
              {
                text:
                  "DOCUMENT 1 — QUESTION PAPER",
              },

              {
                inlineData: {
                  mimeType:
                    questionPaper.type ||
                    "application/pdf",
                  data: questionBase64,
                },
              },

              {
                text:
                  "DOCUMENT 2 — HANDWRITTEN ANSWER SHEET",
              },

              {
                inlineData: {
                  mimeType:
                    answerSheet.type ||
                    "application/pdf",
                  data: answerBase64,
                },
              },

              {
                text: separatePrompt,
              },
            ],

            config: {
              responseMimeType:
                "application/json",
              temperature: 0.1,
            },
          }
        );

      if (!response.text) {
        throw new Error(
          "Gemini returned an empty response."
        );
      }

      let rawAnalysis;

      try {
        rawAnalysis = JSON.parse(
          response.text
        );
      } catch {
        console.error(
          "Invalid separate-files JSON:\n",
          response.text
        );

        throw new Error(
          "Gemini returned invalid JSON."
        );
      }

      const analysis =
        normalizeAnalysis(
          rawAnalysis
        );

      analysis.documentType =
        "separate_files";

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

        questionPaper: {
          name:
            questionPaper.name,
        },

        answerSheet: {
          name:
            answerSheet.name,
        },

        analysis,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Invalid upload mode.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "Analyze route error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze assessment.",
      },
      { status: 500 }
    );
  }
}