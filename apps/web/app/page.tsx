"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronsRight,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Eye,
  FileQuestion,
  FileText,
  Grid2X2,
  Home as HomeIcon,
  Library,
  Menu,
  PanelLeft,
  Presentation,
  Settings,
  Sparkles,
  Upload,
  UserRound,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const PdfViewer = dynamic(
  () => import("./components/PdfViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[700px] w-[520px] items-center justify-center bg-white">
        <p className="text-sm text-[#777980]">Loading PDF viewer...</p>
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
  mappingMethod?: "explicit_label" | "content" | null;
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

  if (isProcessing) {
    return <ProcessingScreen />;
  }

  return (
    <>
      {/* MOBILE UPLOAD */}
      <div className="min-h-screen bg-[#efefef] px-3 py-3 text-[#262626] lg:hidden">
        <MobileHeader />

        <main className="mx-auto w-full max-w-[760px] pb-3 pt-5">
          <section className="text-center">
            <h1 className="px-4 text-[30px] font-bold leading-[1.12] tracking-[-0.035em] sm:text-[36px]">
              Upload Question Paper
              <br />
              &amp; Answer Sheets
            </h1>

            <div className="mt-7 flex justify-center">
              <TeacherOrbit />
            </div>

            <div className="mx-auto mt-6 w-full rounded-[28px] bg-[#ffede5]/55 p-3 shadow-[0_18px_44px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
              {uploadMode === "separate" ? (
                <div className="space-y-3">
                  <FigmaUploadZone
                    title="Question Paper"
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

                  <FigmaUploadZone
                    title="Answer Sheet"
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
                <FigmaUploadZone
                  title="Combined Booklet"
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
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={!canStart}
              onClick={handleStartMapping}
              className={`mt-5 inline-flex min-w-[220px] items-center justify-center gap-4 rounded-full border-2 px-7 py-3 text-[17px] font-semibold transition ${
                canStart
                  ? "border-[#666666] bg-[#303030] text-white shadow-[0_8px_20px_rgba(0,0,0,0.14)]"
                  : "cursor-not-allowed border-[#c6c6c6] bg-[#cfcfcf] text-white/80"
              }`}
            >
              Start Mapping
              <ArrowLeft
                size={22}
                className="rotate-180"
              />
            </button>

            <p className="mx-auto mt-4 max-w-[560px] px-8 text-[14px] leading-5 text-[#777777]">
              Once both files are uploaded, you’ll able to map answers with questions
            </p>

            <button
              type="button"
              onClick={() =>
                setUploadMode(
                  uploadMode === "separate"
                    ? "combined"
                    : "separate"
                )
              }
              className="mt-2 text-[11px] font-semibold text-[#969696] underline decoration-[#c6c6c6] underline-offset-4"
            >
              {uploadMode === "separate"
                ? "Use a combined booklet instead"
                : "Use separate question & answer files"}
            </button>
          </section>
        </main>
      </div>

      {/* DESKTOP UPLOAD */}
      <div className="hidden lg:block">
    <div className="min-h-screen bg-[#f4f4f4] p-4 text-[#262626]">
      <div className="flex min-h-[calc(100vh-32px)] gap-4">
        <FullSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <UploadTopBar />

          <main className="flex min-h-0 flex-1 items-start justify-center px-6 pb-5 pt-10">
            <section className="w-full max-w-[1120px] text-center">
              <h1 className="text-[34px] font-bold leading-tight tracking-[-0.035em] xl:text-[44px]">
                Upload{" "}
                <span className="rounded-[8px] bg-[#fff0e9] px-3 py-1.5 text-[#ff5424]">
                  Question Paper &amp; Answer Sheets
                </span>
              </h1>

              <p className="mt-4 text-[16px] font-medium text-[#4e4e4e]">
                Upload both files to get started
              </p>

              <div className="mt-5 flex justify-center">
                <TeacherOrbit />
              </div>

              <div className="mx-auto mt-6 w-full max-w-[900px] rounded-[26px] bg-[#ffede5]/55 p-3 shadow-[0_16px_42px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
                {uploadMode === "separate" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <FigmaUploadZone
                      title="Question Paper"
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

                    <FigmaUploadZone
                      title="Answer Sheet"
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
                  <FigmaUploadZone
                    title="Combined Booklet"
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
                )}
              </div>

              {error && (
                <div className="mx-auto mt-4 max-w-[900px] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={!canStart}
                onClick={handleStartMapping}
                className={`mt-6 inline-flex items-center gap-3 rounded-full border-2 px-7 py-3 text-base font-semibold transition ${
                  canStart
                    ? "border-[#686868] bg-[#303030] text-white shadow-sm hover:bg-[#252525]"
                    : "cursor-not-allowed border-[#c6c6c6] bg-[#d9d9d9] text-[#f6f6f6]"
                }`}
              >
                Start Mapping
                <ArrowLeft
                  size={18}
                  className="rotate-180"
                />
              </button>

              <p className="mt-3 text-sm font-medium text-[#666666]">
                Once both files are uploaded, you’ll be able to map answers with questions
              </p>

              <button
                type="button"
                onClick={() =>
                  setUploadMode(
                    uploadMode === "separate"
                      ? "combined"
                      : "separate"
                  )
                }
                className="mt-2 text-xs font-semibold text-[#9a9a9a] underline decoration-[#c9c9c9] underline-offset-4 transition hover:text-[#ff6331]"
              >
                {uploadMode === "separate"
                  ? "Use a combined booklet instead"
                  : "Use separate question & answer files"}
              </button>
            </section>
          </main>
        </div>
      </div>
    </div>
      </div>
    </>
  );
}

function MobileHeader({
  onBack,
}: {
  onBack?: () => void;
}) {
  return (
    <header className="flex h-[72px] items-center justify-between gap-2 rounded-[26px] bg-white px-3 shadow-[0_8px_26px_rgba(0,0,0,0.05)] sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#252525] sm:h-10 sm:w-10"
          aria-label="Go back"
        >
          <ArrowLeft size={25} />
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#303030] text-white sm:h-10 sm:w-10 sm:rounded-[11px]">
            <span className="text-lg font-black tracking-[-0.08em] sm:text-xl">
              V
            </span>
          </div>

          <span className="truncate text-[21px] font-bold tracking-[-0.035em] sm:text-[24px]">
            VedaAI
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f5f5] sm:h-11 sm:w-11">
          <Bell size={22} />
          <span className="absolute right-1 top-0.5 h-3 w-3 rounded-full bg-[#ff5c2b] ring-2 ring-white sm:right-1.5" />
        </button>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#303030] text-white sm:h-11 sm:w-11">
          <UserRound size={18} />
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center text-[#252525] sm:h-11 sm:w-11"
          aria-label="Open menu"
        >
          <Menu size={27} />
        </button>
      </div>
    </header>
  );
}

function UploadTopBar() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between rounded-[22px] bg-white px-5 shadow-[0_8px_28px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#252525] transition hover:bg-[#f4f4f4]"
        >
          <ArrowLeft size={25} />
        </button>

        <div className="flex items-center gap-2.5 text-[#9b9b9b]">
          <ClipboardCheck size={21} />
          <span className="text-base font-semibold">
            Exams
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#f7f7f7]">
          <CircleHelp size={22} />
        </button>

        <button className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#f7f7f7]">
          <Bell size={22} />
          <span className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full bg-[#ff5c2b] ring-2 ring-white" />
        </button>

        <button className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#f7f7f7]">
          <Sparkles size={21} />
        </button>

        <div className="ml-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#262626] text-white">
            <UserRound size={18} />
          </div>

          <span className="hidden text-[15px] font-semibold text-[#303030] xl:block">
            Karthikeshwar
          </span>

          <ChevronDown
            size={18}
            className="hidden text-[#535353] xl:block"
          />
        </div>
      </div>
    </header>
  );
}

function ProcessingScreen() {
  return (
    <>
      {/* MOBILE LOADING */}
      <div className="h-screen overflow-hidden bg-[#efefef] px-3 py-3 text-[#262626] lg:hidden">
        <MobileHeader />

        <main className="mt-4 flex h-[calc(100vh-104px)] items-center justify-center rounded-[30px] bg-white shadow-sm">
          <div className="-mt-12 flex flex-col items-center text-center">
            <img
              src="/loading-sparkles.png"
              alt=""
              aria-hidden="true"
              className="h-[155px] w-auto object-contain"
            />

            <h2 className="mt-5 text-[34px] font-bold tracking-[-0.035em] text-[#323232]">
              Extracting...
            </h2>

            <p className="mt-2 text-[22px] text-[#777777]">
              This may take a while
            </p>
          </div>
        </main>
      </div>

      {/* DESKTOP LOADING */}
      <div className="hidden min-h-screen bg-[#f5f5f5] text-[#262626] lg:block">
        <TopBar />

        <div className="flex min-h-[calc(100vh-72px)] gap-5 p-5">
          <CollapsedSidebar />

          <main className="flex min-w-0 flex-1 items-center justify-center rounded-[28px] bg-white shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-[150px] items-center justify-center">
                <img
                  src="/loading-sparkles.png"
                  alt=""
                  aria-hidden="true"
                  className="h-[118px] w-auto object-contain"
                />
              </div>

              <h2 className="mt-2 text-[26px] font-bold tracking-[-0.02em] text-[#2f2f2f]">
                Extracting...
              </h2>

              <p className="mt-2 text-[17px] text-[#777777]">
                This may take a while
              </p>
            </div>
          </main>
        </div>
      </div>
    </>
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
    useState(firstQuestion?.id || "");

  const [expandedId, setExpandedId] =
    useState<string | null>(
      firstQuestion?.id || null
    );

  const [expandAll, setExpandAll] =
    useState(false);

  const [
    selectedUnmatchedIndex,
    setSelectedUnmatchedIndex,
  ] = useState<number | null>(null);

  const [
    viewingFullAnswerSheet,
    setViewingFullAnswerSheet,
  ] = useState(false);

  const [numPages, setNumPages] =
    useState(0);

  const [pageWidth, setPageWidth] =
    useState(680);

  const [mobileTab, setMobileTab] =
    useState<"questions" | "answers">("questions");

  useEffect(() => {
    const syncPageWidth = () => {
      if (window.innerWidth < 1024) {
        setPageWidth(
          Math.max(
            300,
            Math.min(
              window.innerWidth - 40,
              720
            )
          )
        );
      }
    };

    syncPageWidth();

    window.addEventListener(
      "resize",
      syncPageWidth
    );

    return () =>
      window.removeEventListener(
        "resize",
        syncPageWidth
      );
  }, []);

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
              (region) => region.page
            )
          )
        )
      : [];

  const shouldShowNoAnswer =
    mode === "separate" &&
    !selectedUnmatched &&
    selectedQuestion.status === "unanswered" &&
    !viewingFullAnswerSheet;

  const fullAnswerSheetPages =
    numPages > 0
      ? Array.from(
          { length: numPages },
          (_, index) => index + 1
        )
      : [1];

  const unmatchedPages =
    selectedUnmatched?.regions &&
    selectedUnmatched.regions.length > 0
      ? Array.from(
          new Set(
            selectedUnmatched.regions.map(
              (region) => region.page
            )
          )
        )
      : selectedUnmatched?.page
        ? [selectedUnmatched.page]
        : [];

  const pagesToRender =
    viewingFullAnswerSheet
      ? fullAnswerSheetPages
      : selectedUnmatched
        ? unmatchedPages
        : selectedQuestion.status ===
              "answered" &&
            questionAnswerPages.length > 0
          ? questionAnswerPages
          : mode === "combined"
            ? [
                selectedQuestion.questionPage,
              ]
            : [];

  const viewerRegions =
    viewingFullAnswerSheet
      ? []
      : selectedUnmatched
        ? selectedUnmatched.regions || []
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

    if (expandAll) {
      setExpandAll(false);
      setExpandedId(question.id);
      return;
    }

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
      Math.min(value + 80, 1100)
    );
  };

  const zoomOut = () => {
    const minimum =
      typeof window !== "undefined" &&
      window.innerWidth < 1024
        ? 300
        : 420;

    setPageWidth((value) =>
      Math.max(value - 80, minimum)
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-[#eeeeee] text-[#252525] lg:bg-[#f5f5f5]">
      <div className="lg:hidden">
        <MobileHeader onBack={onBack} />
      </div>

      <div className="hidden lg:block">
        <TopBar onBack={onBack} />
      </div>

      <div className="px-3 pt-3 lg:hidden">
        <div className="grid grid-cols-2 rounded-full bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() =>
              setMobileTab("questions")
            }
            className={`rounded-full px-4 py-3 text-[17px] font-semibold transition ${
              mobileTab === "questions"
                ? "bg-[#303030] text-white shadow-md"
                : "text-[#777777]"
            }`}
          >
            Questions
          </button>

          <button
            type="button"
            onClick={() =>
              setMobileTab("answers")
            }
            className={`rounded-full px-4 py-3 text-[17px] font-semibold transition ${
              mobileTab === "answers"
                ? "bg-[#303030] text-white shadow-md"
                : "text-[#777777]"
            }`}
          >
            Answer Sheet
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-148px)] gap-3 p-3 lg:h-[calc(100vh-72px)] lg:gap-4 lg:p-4">
        <CollapsedSidebar />

        <main className="grid min-w-0 flex-1 grid-cols-1 overflow-hidden rounded-[26px] bg-white shadow-sm lg:grid-cols-[44%_56%]">
          <section className={`${mobileTab === "questions" ? "flex" : "hidden"} min-h-0 flex-col border-r border-[#ececec] bg-[#eeeeee] lg:flex lg:bg-white`}>
            <div className="shrink-0 px-4 py-4 lg:border-b lg:border-[#ededed]">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-center text-[15px] font-bold text-[#2d2d2d] lg:text-left">
                    Extracted Questions{" "}
                    <span className="font-semibold text-[#4f4f4f]">
                      (from question paper)
                    </span>
                  </h2>

                  <p className="mt-1 hidden text-[11px] text-[#8b8b8b] lg:block">
                    {answeredCount}/{analysis.totalQuestions} answered
                    <span className="mx-1.5">•</span>
                    Overall score {analysis.totalAwardedMarks}/{analysis.totalMaximumMarks} ({percentage}%)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setExpandAll((current) => !current);
                    setExpandedId(null);
                  }}
                  className="hidden shrink-0 rounded-full bg-[#f4f4f4] px-4 py-2 text-xs font-bold text-[#424242] transition hover:bg-[#ebebeb] lg:block"
                >
                  {expandAll ? "Collapse All" : "Expand All"}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 lg:p-3">
              <div className="space-y-2.5">
                {analysis.questions.map(
                  (question) => {
                    const isSelected =
                      selectedUnmatchedIndex ===
                        null &&
                      selectedId ===
                        question.id;

                    const isExpanded =
                      expandAll ||
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
                        className={`rounded-[16px] border transition ${
                          isSelected
                            ? "border-[1.5px] border-[#ff6533] bg-white"
                            : "border-[#e9e9e9] bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleQuestionClick(
                              question
                            )
                          }
                          className="w-full px-3.5 py-3 text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-1 gap-3">
                              <div
                                className={`flex h-8 min-w-8 items-center justify-center rounded-full text-xs font-bold shadow-sm ${
                                  isSelected
                                    ? "bg-[#ff6331] text-white"
                                    : "bg-[#303030] text-white"
                                }`}
                              >
                                {question.number}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium leading-5 text-[#303030]">
                                  {question.questionText}
                                </p>

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
                                    ? "rotate-180 text-[#ff6331]"
                                    : "text-[#8d8d8d]"
                                }`}
                              />
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="space-y-4 border-t border-[#f0dfd7] px-3.5 pb-3.5 pt-3.5">
                            <div className="rounded-[14px] bg-[#f7f7f7] p-4">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <p className="text-xs font-bold text-[#373737]">
                                  AI Feedback
                                </p>

                                <span className="text-[10px] capitalize text-[#909090]">
                                  {question.gradingConfidence} confidence
                                </span>
                              </div>

                              <p className="text-[12px] leading-5 text-[#575757]">
                                {question.feedback}
                              </p>

                              <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
                                <span
                                  className={`rounded-full px-2.5 py-1 font-semibold ${
                                    question.status === "answered"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-[#ececec] text-[#707070]"
                                  }`}
                                >
                                  {question.status === "answered" ? "Answered" : "Unanswered"}
                                </span>

                                {question.status === "answered" && (
                                  <span className="text-[#8c8c8c]">
                                    {pagesToCount(question)} mapped {pagesToCount(question) === 1 ? "page" : "pages"}
                                  </span>
                                )}

                                {question.status === "answered" &&
                                  question.mappingMethod === "content" && (
                                    <span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700 ring-1 ring-sky-100">
                                      Unlabeled • mapped by content
                                    </span>
                                  )}
                              </div>
                            </div>

                            {(question.strengths.length >
                              0 ||
                              question.improvements.length >
                                0 ||
                              question.answerSummary) && (
                              <div className="grid gap-4 rounded-[14px] bg-white p-3.5 ring-1 ring-[#ededed]">
                                {question.strengths
                                  .length > 0 && (
                                  <div>
                                    <p className="mb-2 text-xs font-bold text-emerald-700">
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
                                            className="flex gap-2 text-sm leading-5 text-[#666666]"
                                          >
                                            <CheckCircle2
                                              size={15}
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
                                    <p className="mb-2 text-xs font-bold text-[#ba623f]">
                                      Improvements
                                    </p>

                                    <ul className="space-y-2 pl-4 text-sm leading-5 text-[#666666]">
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
                                  <div>
                                    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8b8d92]">
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
                        )}
                      </div>
                    );
                  }
                )}
              </div>

              {mode === "separate" &&
                unmatchedAnswers.length > 0 && (
                  <div className="mt-7">
                    <div className="mb-3 flex items-center gap-2">
                      <AlertTriangle
                        size={16}
                        className="text-amber-600"
                      />

                      <h3 className="text-sm font-bold">
                        Unmatched Answers
                      </h3>

                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                        {unmatchedAnswers.length}
                      </span>
                    </div>

                    <p className="mb-3 text-xs leading-5 text-[#85878d]">
                      Handwritten content was detected but could not be confidently matched to a question.
                    </p>

                    <div className="space-y-3">
                      {unmatchedAnswers.map(
                        (answer, index) => {
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
                                        {answer.page}
                                      </span>
                                    )}
                                  </div>

                                  {answer.summary && (
                                    <p className="mt-2 text-xs leading-5 text-[#66686f]">
                                      {answer.summary}
                                    </p>
                                  )}

                                  {answer.reason && (
                                    <p className="mt-2 text-xs font-medium text-amber-700">
                                      {answer.reason}
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

          <section className={`${mobileTab === "answers" ? "flex" : "hidden"} min-h-0 flex-col bg-[#ededed] lg:flex`}>
            <div className="flex min-h-[72px] shrink-0 items-center justify-between bg-[#303030] px-4 py-3 text-white lg:min-h-[54px] lg:py-2.5">
              <div className="hidden lg:block">
                <h2 className="text-[14px] font-bold">
                  Answer Sheet
                </h2>

                {viewingFullAnswerSheet ? (
                  <p className="text-xs text-[#c7c7c7]">
                    Manual review • Full answer sheet
                  </p>
                ) : selectedUnmatched ? (
                  <p className="text-xs text-amber-300">
                    Unmatched answer
                    {selectedUnmatched.page
                      ? ` • PDF page ${selectedUnmatched.page}`
                      : ""}
                  </p>
                ) : (
                  <p className="text-xs text-[#c7c7c7]">
                    Question {selectedQuestion.number}
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

              <div className="flex w-full items-center justify-between gap-2 lg:w-auto lg:justify-start">
                {viewingFullAnswerSheet && (
                  <button
                    type="button"
                    onClick={() =>
                      setViewingFullAnswerSheet(
                        false
                      )
                    }
                    className="mr-2 flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                  >
                    <ArrowLeft
                      size={14}
                    />
                    Back to Result
                  </button>
                )}

                <button
                  onClick={zoomOut}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
                >
                  <ZoomOut size={17} />
                </button>

                <div className="min-w-[58px] text-center text-xs font-semibold">
                  {Math.round(
                    (pageWidth / 680) *
                      100
                  )}
                  %
                </div>

                <button
                  onClick={zoomIn}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
                >
                  <ZoomIn size={17} />
                </button>

                <div className="ml-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-[#f1f1f1]">
                  {viewingFullAnswerSheet
                    ? numPages > 0
                      ? `${numPages} pages`
                      : "Loading..."
                    : selectedQuestion.status === "answered"
                      ? `${questionAnswerPages.length} mapped ${questionAnswerPages.length === 1 ? "page" : "pages"}`
                      : numPages > 0
                        ? `${numPages} pages`
                        : "Loading..."}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto p-0 lg:p-5">
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
              ) : pagesToRender.length > 0 ? (
                <div className="mx-auto w-fit">
                  <PdfViewer
                    file={pdfFile}
                    pages={pagesToRender}
                    regions={viewerRegions}
                    questionNumber={
                      viewerQuestionNumber
                    }
                    highlightVariant={
                      selectedUnmatched
                        ? "unmatched"
                        : "matched"
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
                      The AI identified this content, but no valid answer-sheet page was returned.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function TopBar({
  onBack,
}: {
  onBack?: () => void;
}) {
  return (
    <header className="mx-5 mt-4 flex h-14 items-center justify-between rounded-[22px] bg-white px-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#2f2f2f] transition hover:bg-[#f4f4f4]"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="h-6 w-px bg-[#eeeeee]" />

        <div className="flex items-center gap-2 text-[#8a8a8a]">
          <ClipboardCheck size={21} />
          <span className="whitespace-nowrap text-base font-semibold">
            Exams
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#f7f7f7]">
          <CircleHelp size={22} />
        </button>

        <button className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#f7f7f7]">
          <Bell size={22} />
          <span className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full bg-[#ff5c2b] ring-2 ring-white" />
        </button>

        <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#f7f7f7]">
          <Sparkles size={21} />
        </button>

        <div className="ml-2 flex items-center gap-3 rounded-full px-2 py-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#262626] text-white">
            <UserRound size={18} />
          </div>

          <span className="hidden text-base font-semibold text-[#303030] lg:block">
            Karthikeshwar
          </span>

          <ChevronDown
            size={18}
            className="hidden text-[#535353] lg:block"
          />
        </div>
      </div>
    </header>
  );
}

function FullSidebar() {
  return (
    <aside className="hidden w-[300px] shrink-0 flex-col rounded-[26px] bg-white p-5 shadow-[0_12px_36px_rgba(0,0,0,0.08)] lg:flex">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#2e2e2e] text-white">
            <span className="text-2xl font-black tracking-[-0.08em]">
              V
            </span>
          </div>

          <span className="text-2xl font-bold tracking-[-0.04em]">
            VedaAI
          </span>
        </div>

        <PanelLeft
          size={20}
          className="text-[#6f6f6f]"
        />
      </div>

      <div className="mt-10 rounded-full border-[3px] border-[#ee7855] bg-[#2d2d2d] px-4 py-4 text-center text-white shadow-inner">
        <div className="flex items-center justify-center gap-2">
          <Sparkles size={18} />
          <span className="text-lg font-semibold">
            AI Teacher&apos;s Toolkit
          </span>
        </div>
      </div>

      <nav className="mt-10 space-y-2">
        <SidebarRow
          icon={<HomeIcon size={21} />}
          label="Home"
        />
        <SidebarRow
          icon={<Presentation size={21} />}
          label="My Classroom"
        />
        <SidebarRow
          icon={<ClipboardList size={21} />}
          label="Assignments"
        />
        <SidebarRow
          icon={<ClipboardCheck size={21} />}
          label="Exams"
          active
        />
        <SidebarRow
          icon={<Clock3 size={21} />}
          label="My Library"
        />
      </nav>

      <div className="mt-auto">
        <SidebarRow
          icon={<Settings size={21} />}
          label="Settings"
        />

        <div className="mt-5 rounded-[20px] bg-[#f1f1f1] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
              <Building2
                size={22}
                className="text-[#616161]"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#313131]">
                Delhi Public School
              </p>
              <p className="mt-1 text-xs text-[#686868]">
                Bokaro Steel City
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function CollapsedSidebar() {
  return (
    <aside className="relative hidden w-[76px] shrink-0 flex-col items-center rounded-[24px] bg-white py-4 shadow-[0_14px_42px_rgba(0,0,0,0.18)] lg:flex">
      <div className="pointer-events-none absolute inset-y-5 -right-8 w-10 rounded-full bg-black/10 blur-2xl" />

      <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#2e2e2e] text-white shadow-sm">
        <span className="text-xl font-black tracking-[-0.08em]">
          V
        </span>
      </div>

      <div className="relative z-10 mt-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-[#ef7653] bg-[#2d2d2d] text-white shadow-[0_0_22px_rgba(239,118,83,0.28)]">
          <Sparkles size={20} />
        </div>
      </div>

      <nav className="relative z-10 mt-8 flex flex-col gap-3">
        <RailIcon
          icon={<HomeIcon size={19} />}
        />

        <RailIcon
          icon={<Presentation size={19} />}
        />

        <RailIcon
          icon={<ClipboardList size={19} />}
        />

        <RailIcon
          icon={<ClipboardCheck size={19} />}
          active
        />

        <RailIcon
          icon={<Clock3 size={19} />}
        />
      </nav>

      <div className="relative z-10 mt-auto flex flex-col items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#f1f1f1]">
          <Building2
            size={20}
            className="text-[#6c6c6c]"
          />
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[#333333] transition hover:bg-[#f2f2f2]"
          aria-label="Expand sidebar"
        >
          <ChevronsRight size={23} />
        </button>
      </div>
    </aside>
  );
}

function TeacherOrbit() {
  return (
    <div className="flex h-[118px] items-center justify-center lg:h-[142px]">
      <img
        src="/teacher-toolkit.png"
        alt="AI teacher assistant"
        className="h-[118px] w-auto object-contain lg:h-[142px]"
      />
    </div>
  );
}

function FigmaUploadZone({
  title,
  file,
  inputRef,
  onFile,
  onRemove,
}: {
  title: string;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="relative">
      {!file ? (
        <button
          type="button"
          onClick={() =>
            inputRef.current?.click()
          }
          className="flex min-h-[205px] w-full flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-[#c9c9c9] bg-white px-6 text-center transition hover:border-[#ff8a5d] hover:bg-[#fffaf7] lg:min-h-[205px] lg:rounded-[20px]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0f0f0]">
            <Upload
              size={24}
              className="text-[#343434]"
            />
          </div>

          <p className="mt-5 text-[16px] font-semibold text-[#313131]">
            Upload{" "}
            <span className="text-[#ff5a2a]">
              {title}
            </span>
          </p>

          <p className="mt-1 text-xs text-[#9f9f9f]">
            Max 10MB
          </p>
        </button>
      ) : (
        <div className="flex min-h-[205px] items-center justify-center rounded-[22px] border-2 border-dashed border-[#c9c9c9] bg-white p-4 lg:min-h-[205px] lg:rounded-[20px]">
          <div className="relative flex w-full max-w-[390px] items-center gap-3 rounded-2xl bg-[#f7f7f7] px-4 py-4 shadow-sm ring-1 ring-[#eeeeee] lg:max-w-[360px]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#fff0e9] text-[#ff5e2a]">
              <FileText size={22} />
            </div>

            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-[14px] font-semibold text-[#363636]">
                {file.name}
              </p>
              <p className="mt-1 text-xs text-[#8f8f8f]">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            <button
              type="button"
              onClick={onRemove}
              className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#5a5a5a] text-white shadow-md transition hover:bg-[#4b4b4b] lg:static lg:h-8 lg:w-8 lg:bg-white lg:text-[#5e5e5e] lg:ring-1 lg:ring-[#e7e7e7]"
            >
              <X size={16} />
            </button>
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
          No handwritten answer could be mapped to Question{" "}
          <span className="font-semibold text-[#4f5055]">
            {questionNumber}
          </span>
          .
        </p>

        <div className="mt-5 rounded-xl bg-[#f7f7f8] px-4 py-3 text-xs leading-5 text-[#777980]">
          This question is treated as unanswered and receives 0 marks.
        </div>

        <button
          type="button"
          onClick={onViewAnswerSheet}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-[#dedee1] bg-white px-5 py-2.5 text-sm font-semibold text-[#44464c] shadow-sm transition hover:bg-[#f7f7f8]"
        >
          <Eye size={17} />
          View Answer Sheet
        </button>

        <p className="mt-2 text-[11px] leading-4 text-[#96989d]">
          Manually review the uploaded answer sheet to verify the result.
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
      (region) => region.page
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
      className={`rounded-full px-3 py-1.5 text-sm font-bold ${className}`}
    >
      {awarded}/{maximum}
    </div>
  );
}

function SidebarRow({
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
      className={`flex items-center gap-3 rounded-[14px] px-4 py-3 text-base font-semibold ${
        active
          ? "bg-[#f0f0f0] text-[#303030]"
          : "text-[#8a8a8a]"
      }`}
    >
      <span className={active ? "text-[#303030]" : ""}>
        {icon}
      </span>
      <span>{label}</span>
    </div>
  );
}

function RailIcon({
  icon,
  active = false,
}: {
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
        active
          ? "bg-[#f0f0f0] text-[#2e2e2e]"
          : "text-[#8c8c8c]"
      }`}
    >
      {icon}
    </div>
  );
}
