"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Eye,
  FileQuestion,
  FileText,
  Grid2X2,
  Library,
  PanelLeft,
  Settings,
  Sparkles,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";

const PdfViewer = dynamic(
  () => import("./components/PdfViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[700px] w-[520px] items-center justify-center bg-white">
        <p className="text-sm text-[#777980]">
          Loading PDF viewer...
        </p>
      </div>
    ),
  }
);

type UploadMode = "separate" | "combined";

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

  answerSummary: string | null;

  regions: AnswerRegion[];

  gradingConfidence:
    | "high"
    | "medium"
    | "low";

  strengths: string[];
  improvements: string[];

  feedback: string;
};

type UnmatchedAnswer = {
  page?: number;
  detectedNumber?: string | null;
  summary?: string;
  reason?: string;
};

type AnalysisResult = {
  documentType: string;

  totalQuestions: number;

  totalMaximumMarks: number;
  totalAwardedMarks: number;

  questions: Question[];

  unmatchedAnswers?: UnmatchedAnswer[];
};

export default function Home() {
  const [uploadMode, setUploadMode] =
    useState<UploadMode>("separate");

  const [questionFile, setQuestionFile] =
    useState<File | null>(null);

  const [answerFile, setAnswerFile] =
    useState<File | null>(null);

  const [combinedFile, setCombinedFile] =
    useState<File | null>(null);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [error, setError] = useState("");

  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResult | null>(null);

  const questionInputRef =
    useRef<HTMLInputElement | null>(null);

  const answerInputRef =
    useRef<HTMLInputElement | null>(null);

  const combinedInputRef =
    useRef<HTMLInputElement | null>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const validateFile = (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Only PDF, PNG, JPG, or JPEG files are allowed."
      );

      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "File size must be less than 10 MB."
      );

      return false;
    }

    setError("");

    return true;
  };

  const canStart =
    uploadMode === "combined"
      ? !!combinedFile
      : !!questionFile && !!answerFile;

  const handleStartMapping = async () => {
    try {
      setError("");
      setIsProcessing(true);

      const formData = new FormData();

      if (uploadMode === "combined") {
        if (!combinedFile) {
          throw new Error(
            "Please upload a combined booklet."
          );
        }

        formData.append("mode", "combined");

        formData.append(
          "combinedBooklet",
          combinedFile
        );
      } else {
        if (!questionFile || !answerFile) {
          throw new Error(
            "Please upload both required files."
          );
        }

        formData.append("mode", "separate");

        formData.append(
          "questionPaper",
          questionFile
        );

        formData.append(
          "answerSheet",
          answerFile
        );
      }

      const response = await fetch(
        "/api/analyze",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      console.log(
        "Server result:",
        result
      );

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Something went wrong."
        );
      }

      if (result.analysis) {
        setAnalysisResult(
          result.analysis
        );
      } else {
        throw new Error(
          "Analysis result was missing."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const resultPdf =
    uploadMode === "combined"
      ? combinedFile
      : answerFile;

  if (analysisResult && resultPdf) {
    return (
      <ResultsScreen
        analysis={analysisResult}
        pdfFile={resultPdf}
        mode={uploadMode}
        onBack={() =>
          setAnalysisResult(null)
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-[#202124]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[230px] border-r border-[#ececef] bg-white lg:flex lg:flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-[#eeeeef] px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff6b35] text-white">
              <Sparkles size={18} />
            </div>

            <span className="text-lg font-semibold">
              VedaAI
            </span>
          </div>

          <nav className="flex-1 space-y-2 p-4 text-sm">
            <SidebarItem
              icon={<Grid2X2 size={18} />}
              label="Dashboard"
            />

            <SidebarItem
              icon={<BookOpen size={18} />}
              label="Assessments"
              active
            />

            <SidebarItem
              icon={<Library size={18} />}
              label="Library"
            />
          </nav>

          <div className="space-y-2 border-t border-[#eeeeef] p-4 text-sm">
            <SidebarItem
              icon={<CircleHelp size={18} />}
              label="Help"
            />

            <SidebarItem
              icon={<Settings size={18} />}
              label="Settings"
            />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-[#ececef] bg-white px-5 lg:px-8">
            <div className="flex items-center gap-3">
              <PanelLeft
                size={20}
                className="lg:hidden"
              />

              <span className="font-medium">
                Assessment Mapping
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Bell size={19} />

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eeeeef] text-xs font-semibold">
                KV
              </div>
            </div>
          </header>

          <section className="flex flex-1 justify-center px-4 py-10 sm:px-6 lg:px-10">
            <div className="w-full max-w-5xl">
              <div className="mb-8">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Upload Assessment{" "}
                  <span className="text-[#ff6b35]">
                    Documents
                  </span>
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f7177] sm:text-base">
                  Upload the question paper and
                  handwritten answer sheet, or use
                  a combined question-and-answer
                  booklet.
                </p>
              </div>

              <div className="mb-7 inline-flex rounded-xl border border-[#e5e5e8] bg-white p-1">
                <button
                  onClick={() =>
                    setUploadMode("separate")
                  }
                  className={`rounded-lg px-5 py-2.5 text-sm font-medium ${
                    uploadMode === "separate"
                      ? "bg-[#222222] text-white"
                      : "text-[#686a70]"
                  }`}
                >
                  Separate Files
                </button>

                <button
                  onClick={() =>
                    setUploadMode("combined")
                  }
                  className={`rounded-lg px-5 py-2.5 text-sm font-medium ${
                    uploadMode === "combined"
                      ? "bg-[#222222] text-white"
                      : "text-[#686a70]"
                  }`}
                >
                  Combined Booklet
                </button>
              </div>

              {uploadMode === "separate" ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <UploadCard
                    title="Question Paper"
                    subtitle="Upload the printed question paper."
                    file={questionFile}
                    inputRef={questionInputRef}
                    onFile={(file) => {
                      if (validateFile(file)) {
                        setQuestionFile(file);
                      }
                    }}
                    onRemove={() =>
                      setQuestionFile(null)
                    }
                  />

                  <UploadCard
                    title="Answer Sheet"
                    subtitle="Upload the handwritten answer sheet."
                    file={answerFile}
                    inputRef={answerInputRef}
                    onFile={(file) => {
                      if (validateFile(file)) {
                        setAnswerFile(file);
                      }
                    }}
                    onRemove={() =>
                      setAnswerFile(null)
                    }
                  />
                </div>
              ) : (
                <div className="max-w-2xl">
                  <UploadCard
                    title="Question + Answer Booklet"
                    subtitle="Upload one booklet containing printed questions and handwritten answers."
                    file={combinedFile}
                    inputRef={combinedInputRef}
                    onFile={(file) => {
                      if (validateFile(file)) {
                        setCombinedFile(file);
                      }
                    }}
                    onRemove={() =>
                      setCombinedFile(null)
                    }
                  />
                </div>
              )}

              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-8 flex justify-end">
                <button
                  disabled={
                    !canStart ||
                    isProcessing
                  }
                  onClick={
                    handleStartMapping
                  }
                  className={`min-w-[160px] rounded-xl px-6 py-3 text-sm font-semibold ${
                    canStart &&
                    !isProcessing
                      ? "bg-[#242424] text-white"
                      : "cursor-not-allowed bg-[#dddddf] text-[#999ba0]"
                  }`}
                >
                  {isProcessing
                    ? "Processing..."
                    : "Start Mapping"}
                </button>
              </div>

              {isProcessing && (
                <div className="mt-12 flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff1eb] text-[#ff6b35]">
                    <Sparkles
                      size={26}
                      className="animate-pulse"
                    />
                  </div>

                  <h2 className="text-xl font-semibold">
                    Extracting, mapping &
                    grading...
                  </h2>

                  <p className="mt-2 text-sm text-[#7a7c82]">
                    This may take a while.
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function ResultsScreen({
  analysis,
  pdfFile,
  mode,
  onBack,
}: {
  analysis: AnalysisResult;
  pdfFile: File;
  mode: UploadMode;
  onBack: () => void;
}) {
  const firstQuestion =
    analysis.questions.find(
      (question) =>
        question.status === "answered"
    ) || analysis.questions[0];

  const [selectedId, setSelectedId] =
    useState(
      firstQuestion?.id || ""
    );

  const [expandedId, setExpandedId] =
    useState<string | null>(
      firstQuestion?.id || null
    );

  const [
    selectedUnmatchedIndex,
    setSelectedUnmatchedIndex,
  ] = useState<number | null>(null);

  /*
    NEW:
    True only when the teacher manually
    chooses to inspect the full answer sheet
    for an unanswered question.
  */
  const [
    viewingFullAnswerSheet,
    setViewingFullAnswerSheet,
  ] = useState(false);

  const [numPages, setNumPages] =
    useState(0);

  const [pageWidth, setPageWidth] =
    useState(680);

  const selectedQuestion =
    analysis.questions.find(
      (question) =>
        question.id === selectedId
    ) || analysis.questions[0];

  const unmatchedAnswers =
    analysis.unmatchedAnswers || [];

  const selectedUnmatched =
    selectedUnmatchedIndex !== null
      ? unmatchedAnswers[
          selectedUnmatchedIndex
        ]
      : null;

  const answeredCount =
    analysis.questions.filter(
      (question) =>
        question.status === "answered"
    ).length;

  const percentage =
    analysis.totalMaximumMarks > 0
      ? Math.round(
          (analysis.totalAwardedMarks /
            analysis.totalMaximumMarks) *
            100
        )
      : 0;

  const questionAnswerPages =
    selectedQuestion &&
    selectedQuestion.status === "answered"
      ? Array.from(
          new Set(
            selectedQuestion.regions.map(
              (region) =>
                region.page
            )
          )
        )
      : [];

  const shouldShowNoAnswer =
    mode === "separate" &&
    !selectedUnmatched &&
    selectedQuestion.status ===
      "unanswered" &&
    !viewingFullAnswerSheet;

  /*
    When manually viewing the answer sheet,
    render every PDF page.

    If numPages has not loaded yet, render
    page 1 first. PdfViewer will then report
    the page count and React will render
    the entire PDF.
  */
  const fullAnswerSheetPages =
    numPages > 0
      ? Array.from(
          { length: numPages },
          (_, index) => index + 1
        )
      : [1];

  const pagesToRender =
    viewingFullAnswerSheet
      ? fullAnswerSheetPages
      : selectedUnmatched
        ? selectedUnmatched.page
          ? [selectedUnmatched.page]
          : []
        : selectedQuestion.status ===
              "answered" &&
            questionAnswerPages.length > 0
          ? questionAnswerPages
          : mode === "combined"
            ? [
                selectedQuestion.questionPage,
              ]
            : [];

  /*
    When manually reviewing the full answer
    sheet, deliberately disable AI highlight
    boxes. It becomes a clean manual PDF view.
  */
  const viewerRegions =
    viewingFullAnswerSheet ||
    selectedUnmatched
      ? []
      : selectedQuestion.regions;

  const viewerQuestionNumber =
    selectedUnmatched
      ? selectedUnmatched.detectedNumber ||
        "?"
      : selectedQuestion.number;

  const handleQuestionClick = (
    question: Question
  ) => {
    setViewingFullAnswerSheet(false);

    setSelectedUnmatchedIndex(null);

    setSelectedId(question.id);

    setExpandedId((current) =>
      current === question.id
        ? null
        : question.id
    );
  };

  const handleUnmatchedClick = (
    index: number
  ) => {
    setViewingFullAnswerSheet(false);

    setSelectedUnmatchedIndex(index);

    setExpandedId(null);
  };

  const zoomIn = () => {
    setPageWidth((value) =>
      Math.min(
        value + 80,
        1100
      )
    );
  };

  const zoomOut = () => {
    setPageWidth((value) =>
      Math.max(
        value - 80,
        420
      )
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f5f5f6] text-[#202124]">
      <header className="flex h-[76px] items-center justify-between border-b border-[#e7e7e9] bg-white px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7e7e9]"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="font-semibold">
              Assessment Results
            </h1>

            <p className="text-xs text-[#777980]">
              {analysis.totalQuestions}{" "}
              questions extracted
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#fff4ef] px-4 py-2">
            <p className="text-[10px] font-semibold uppercase text-[#a35a3e]">
              Overall Score
            </p>

            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-[#ff6b35]">
                {
                  analysis.totalAwardedMarks
                }
              </span>

              <span className="text-xs text-[#777980]">
                /{" "}
                {
                  analysis.totalMaximumMarks
                }
              </span>

              <span className="ml-1 text-xs font-semibold">
                ({percentage}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-[#f4f4f5] px-3 py-2 text-sm">
            <FileText size={16} />

            <span className="max-w-[220px] truncate">
              {pdfFile.name}
            </span>
          </div>
        </div>
      </header>

      <div className="grid h-[calc(100vh-76px)] grid-cols-1 xl:grid-cols-[46%_54%]">
        {/* LEFT PANEL */}

        <section className="flex min-h-0 flex-col border-r border-[#e4e4e7] bg-white">
          <div className="shrink-0 border-b border-[#ececef] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">
                  Extracted Questions
                </h2>

                <p className="mt-1 text-xs text-[#85878d]">
                  Select a question to
                  view its mapped answer
                  and AI evaluation.
                </p>
              </div>

              <div className="rounded-full bg-[#f2f2f3] px-3 py-1 text-xs font-medium">
                {answeredCount}/
                {analysis.totalQuestions}{" "}
                answered
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {analysis.questions.map(
                (question) => {
                  const isSelected =
                    selectedUnmatchedIndex ===
                      null &&
                    selectedId ===
                      question.id;

                  const isExpanded =
                    expandedId ===
                    question.id;

                  const scorePercentage =
                    question.maxMarks > 0
                      ? (question.awardedMarks /
                          question.maxMarks) *
                        100
                      : 0;

                  return (
                    <div
                      key={question.id}
                      className={`rounded-2xl border p-4 transition ${
                        isSelected
                          ? "border-[#ff6b35] bg-[#fff9f6] shadow-sm"
                          : "border-[#e9e9ec] bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleQuestionClick(
                            question
                          )
                        }
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-1 gap-3">
                            <div
                              className={`flex h-8 min-w-8 items-center justify-center rounded-lg text-sm font-semibold ${
                                isSelected
                                  ? "bg-[#ff6b35] text-white"
                                  : "bg-[#f2f2f3] text-[#55575d]"
                              }`}
                            >
                              {
                                question.number
                              }
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-6">
                                {
                                  question.questionText
                                }
                              </p>

                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                <span
                                  className={`rounded-full px-2.5 py-1 ${
                                    question.status ===
                                    "answered"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-[#f1f1f2] text-[#707278]"
                                  }`}
                                >
                                  {question.status ===
                                  "answered"
                                    ? "Answered"
                                    : "Unanswered"}
                                </span>

                                {question.status ===
                                  "answered" && (
                                  <span className="text-[#777980]">
                                    {
                                      pagesToCount(
                                        question
                                      )
                                    }{" "}
                                    page
                                    {pagesToCount(
                                      question
                                    ) === 1
                                      ? ""
                                      : "s"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <ScoreBadge
                              awarded={
                                question.awardedMarks
                              }
                              maximum={
                                question.maxMarks
                              }
                              percentage={
                                scorePercentage
                              }
                            />

                            <ChevronDown
                              size={17}
                              className={`transition-transform ${
                                isExpanded
                                  ? "rotate-180 text-[#ff6b35]"
                                  : "text-[#999ba0]"
                              }`}
                            />
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-4 space-y-5 border-t border-[#f1dacf] pt-4">
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[#a15e45]">
                                AI Feedback
                              </p>

                              <span className="text-[11px] capitalize text-[#8b8d92]">
                                {
                                  question.gradingConfidence
                                }{" "}
                                confidence
                              </span>
                            </div>

                            <p className="text-sm leading-6 text-[#56585f]">
                              {
                                question.feedback
                              }
                            </p>
                          </div>

                          {question.strengths
                            .length > 0 && (
                            <div>
                              <p className="mb-2 text-xs font-semibold text-emerald-700">
                                Strengths
                              </p>

                              <div className="space-y-2">
                                {question.strengths.map(
                                  (
                                    strength,
                                    index
                                  ) => (
                                    <div
                                      key={
                                        index
                                      }
                                      className="flex gap-2 text-sm leading-5 text-[#62646a]"
                                    >
                                      <CheckCircle2
                                        size={
                                          15
                                        }
                                        className="mt-0.5 shrink-0 text-emerald-600"
                                      />

                                      <span>
                                        {
                                          strength
                                        }
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {question.improvements
                            .length > 0 && (
                            <div>
                              <p className="mb-2 text-xs font-semibold text-[#ba623f]">
                                Improvements
                              </p>

                              <ul className="space-y-2 pl-4 text-sm leading-5 text-[#62646a]">
                                {question.improvements.map(
                                  (
                                    improvement,
                                    index
                                  ) => (
                                    <li
                                      key={
                                        index
                                      }
                                      className="list-disc"
                                    >
                                      {
                                        improvement
                                      }
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}

                          {question.answerSummary && (
                            <div className="rounded-xl bg-white/70 p-3">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8b8d92]">
                                Answer Summary
                              </p>

                              <p className="text-xs leading-5 text-[#707278]">
                                {
                                  question.answerSummary
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>

            {/* UNMATCHED ANSWERS */}

            {mode === "separate" &&
              unmatchedAnswers.length >
                0 && (
                <div className="mt-7">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle
                      size={16}
                      className="text-amber-600"
                    />

                    <h3 className="text-sm font-semibold">
                      Unmatched Answers
                    </h3>

                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      {
                        unmatchedAnswers.length
                      }
                    </span>
                  </div>

                  <p className="mb-3 text-xs leading-5 text-[#85878d]">
                    Handwritten content
                    was detected but could
                    not be confidently
                    matched to a question.
                  </p>

                  <div className="space-y-3">
                    {unmatchedAnswers.map(
                      (
                        answer,
                        index
                      ) => {
                        const isSelected =
                          selectedUnmatchedIndex ===
                          index;

                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() =>
                              handleUnmatchedClick(
                                index
                              )
                            }
                            className={`w-full rounded-xl border p-4 text-left transition ${
                              isSelected
                                ? "border-amber-400 bg-amber-50"
                                : "border-amber-200 bg-[#fffdf7]"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                <FileQuestion
                                  size={16}
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-[#4f5055]">
                                    {answer.detectedNumber
                                      ? `Detected as ${answer.detectedNumber}`
                                      : "Unknown answer"}
                                  </p>

                                  {answer.page && (
                                    <span className="text-xs text-[#8a8c91]">
                                      Page{" "}
                                      {
                                        answer.page
                                      }
                                    </span>
                                  )}
                                </div>

                                {answer.summary && (
                                  <p className="mt-2 text-xs leading-5 text-[#66686f]">
                                    {
                                      answer.summary
                                    }
                                  </p>
                                )}

                                {answer.reason && (
                                  <p className="mt-2 text-xs font-medium text-amber-700">
                                    {
                                      answer.reason
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
          </div>
        </section>

        {/* RIGHT PANEL */}

        <section className="flex min-h-0 flex-col bg-[#ececef]">
          <div className="flex shrink-0 items-center justify-between border-b border-[#dddddf] bg-white px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">
                Answer Sheet
              </h2>

              {viewingFullAnswerSheet ? (
                <p className="text-xs text-[#888a90]">
                  Manual review • Full
                  answer sheet
                </p>
              ) : selectedUnmatched ? (
                <p className="text-xs text-amber-700">
                  Unmatched answer
                  {selectedUnmatched.page
                    ? ` • PDF page ${selectedUnmatched.page}`
                    : ""}
                </p>
              ) : (
                <p className="text-xs text-[#888a90]">
                  Question{" "}
                  {
                    selectedQuestion.number
                  }

                  {selectedQuestion.status ===
                    "answered" &&
                    ` • ${questionAnswerPages.length} answer ${
                      questionAnswerPages.length ===
                      1
                        ? "page"
                        : "pages"
                    }`}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {viewingFullAnswerSheet && (
                <button
                  type="button"
                  onClick={() =>
                    setViewingFullAnswerSheet(
                      false
                    )
                  }
                  className="mr-2 flex items-center gap-2 rounded-lg border border-[#e1e1e4] bg-white px-3 py-2 text-xs font-medium text-[#55575d] hover:bg-[#f7f7f8]"
                >
                  <ArrowLeft
                    size={14}
                  />

                  Back to Result
                </button>
              )}

              <button
                onClick={zoomOut}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e1e1e4] bg-white"
              >
                <ZoomOut size={17} />
              </button>

              <div className="min-w-[60px] text-center text-xs font-medium">
                {Math.round(
                  (pageWidth / 680) *
                    100
                )}
                %
              </div>

              <button
                onClick={zoomIn}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e1e1e4] bg-white"
              >
                <ZoomIn size={17} />
              </button>

              <div className="ml-2 rounded-lg bg-[#f4f4f5] px-3 py-2 text-xs text-[#66686f]">
                {numPages > 0
                  ? `${numPages} PDF pages`
                  : "Loading..."}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto p-5">
            {shouldShowNoAnswer ? (
              <NoAnswerState
                questionNumber={
                  selectedQuestion.number
                }
                onViewAnswerSheet={() =>
                  setViewingFullAnswerSheet(
                    true
                  )
                }
              />
            ) : pagesToRender.length >
              0 ? (
              <div className="mx-auto w-fit">
                <PdfViewer
                  file={pdfFile}
                  pages={pagesToRender}
                  regions={viewerRegions}
                  questionNumber={
                    viewerQuestionNumber
                  }
                  width={pageWidth}
                  onLoadSuccess={(
                    pages
                  ) =>
                    setNumPages(
                      pages
                    )
                  }
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-md rounded-2xl border border-[#dedee1] bg-white p-8 text-center shadow-sm">
                  <FileQuestion
                    size={32}
                    className="mx-auto text-[#999ba0]"
                  />

                  <h3 className="mt-4 font-semibold">
                    Page unavailable
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#777980]">
                    The AI identified
                    this content, but no
                    valid answer-sheet
                    page was returned.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function NoAnswerState({
  questionNumber,
  onViewAnswerSheet,
}: {
  questionNumber: string;
  onViewAnswerSheet: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md rounded-2xl border border-[#dedee1] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f3f4]">
          <FileQuestion
            size={26}
            className="text-[#85878d]"
          />
        </div>

        <h3 className="mt-5 text-lg font-semibold">
          No answer detected
        </h3>

        <p className="mt-2 text-sm leading-6 text-[#777980]">
          No handwritten answer could
          be mapped to Question{" "}
          <span className="font-semibold text-[#4f5055]">
            {questionNumber}
          </span>
          .
        </p>

        <div className="mt-5 rounded-xl bg-[#f7f7f8] px-4 py-3 text-xs leading-5 text-[#777980]">
          This question is treated as
          unanswered and receives 0
          marks.
        </div>

        {/* NEW BUTTON */}

        <button
          type="button"
          onClick={onViewAnswerSheet}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-[#dedee1] bg-white px-5 py-2.5 text-sm font-semibold text-[#44464c] shadow-sm transition hover:bg-[#f7f7f8]"
        >
          <Eye size={17} />

          View Answer Sheet
        </button>

        <p className="mt-2 text-[11px] leading-4 text-[#96989d]">
          Manually review the uploaded
          answer sheet to verify the
          result.
        </p>
      </div>
    </div>
  );
}

function pagesToCount(
  question: Question
) {
  return new Set(
    question.regions.map(
      (region) =>
        region.page
    )
  ).size;
}

function ScoreBadge({
  awarded,
  maximum,
  percentage,
}: {
  awarded: number;
  maximum: number;
  percentage: number;
}) {
  let className =
    "bg-red-50 text-red-700";

  if (percentage >= 70) {
    className =
      "bg-emerald-50 text-emerald-700";
  } else if (
    percentage >= 50
  ) {
    className =
      "bg-amber-50 text-amber-700";
  }

  return (
    <div
      className={`rounded-lg px-2.5 py-1.5 text-sm font-semibold ${className}`}
    >
      {awarded}/{maximum}
    </div>
  );
}

function UploadCard({
  title,
  subtitle,
  file,
  inputRef,
  onFile,
  onRemove,
}: {
  title: string;
  subtitle: string;
  file: File | null;

  inputRef:
    React.RefObject<HTMLInputElement | null>;

  onFile: (file: File) => void;

  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#e4e4e7] bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="font-semibold">
          {title}
        </h2>

        <p className="mt-1 text-sm text-[#7c7e84]">
          {subtitle}
        </p>
      </div>

      {!file ? (
        <button
          type="button"
          onClick={() =>
            inputRef.current?.click()
          }
          className="flex min-h-[210px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#d7d7da] bg-[#fafafa] px-5 text-center"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
            <Upload
              size={20}
              className="text-[#ff6b35]"
            />
          </div>

          <p className="text-sm font-medium">
            Click to upload
          </p>

          <p className="mt-2 text-xs text-[#92949a]">
            PDF, PNG, JPG or JPEG
          </p>

          <p className="mt-1 text-xs text-[#b0b1b6]">
            Maximum size 10 MB
          </p>
        </button>
      ) : (
        <div className="flex min-h-[210px] items-center justify-center rounded-xl border border-[#e6e6e8] bg-[#fafafa] p-5">
          <div className="w-full">
            <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff1eb] text-[#ff6b35]">
                <FileText size={19} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {file.name}
                </p>

                <p className="mt-1 text-xs text-[#92949a]">
                  {(
                    file.size /
                    1024 /
                    1024
                  ).toFixed(2)}{" "}
                  MB
                </p>
              </div>

              <button
                type="button"
                onClick={onRemove}
                className="flex h-8 w-8 items-center justify-center rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(event) => {
          const selectedFile =
            event.target.files?.[0];

          if (selectedFile) {
            onFile(selectedFile);
          }

          event.target.value = "";
        }}
      />
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
        active
          ? "bg-[#fff2ed] font-medium text-[#db5728]"
          : "text-[#66686f]"
      }`}
    >
      {icon}

      <span>{label}</span>
    </div>
  );
}