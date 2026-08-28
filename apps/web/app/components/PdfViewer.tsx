"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

type PdfViewerProps = {
  file: File;
  pages: number[];
  regions: AnswerRegion[];
  questionNumber: string;
  width: number;
  onLoadSuccess: (numPages: number) => void;
};

export default function PdfViewer({
  file,
  pages,
  regions,
  questionNumber,
  width,
  onLoadSuccess,
}: PdfViewerProps) {
  const [pdfUrl, setPdfUrl] =
    useState<string | null>(null);

  /*
    Each mapped page gets a tiny invisible marker placed
    exactly at the TOP edge of the detected green region.

    We scroll to this marker instead of scrolling to the
    whole page or to the middle of the highlight.
  */
  const highlightStartRefs =
    useRef<Record<number, HTMLDivElement | null>>({});

  const firstHighlightedPage = useMemo(() => {
    if (regions.length === 0) {
      return null;
    }

    const pageSet = new Set(pages);

    const firstVisibleRegion =
      regions.find((region) =>
        pageSet.has(region.page)
      );

    return firstVisibleRegion?.page ?? null;
  }, [pages, regions]);

  useEffect(() => {
    const objectUrl =
      URL.createObjectURL(file);

    setPdfUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const scrollToFirstHighlightStart = () => {
    if (firstHighlightedPage === null) {
      return;
    }

    const target =
      highlightStartRefs.current[
        firstHighlightedPage
      ];

    if (!target) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        });
      });
    });
  };

  /*
    Run whenever the selected question / mapped pages change.

    Small delay gives React-PDF enough time to mount the page
    and the marker before we perform the scroll.
  */
  useEffect(() => {
    const timer = window.setTimeout(
      scrollToFirstHighlightStart,
      140
    );

    return () =>
      window.clearTimeout(timer);
  }, [
    questionNumber,
    firstHighlightedPage,
    pages,
    regions,
    width,
  ]);

  if (!pdfUrl) {
    return (
      <div className="flex h-[700px] w-[520px] items-center justify-center bg-white">
        <p className="text-sm text-[#777980]">
          Preparing PDF...
        </p>
      </div>
    );
  }

  return (
    <Document
      file={pdfUrl}
      onLoadSuccess={({ numPages }) =>
        onLoadSuccess(numPages)
      }
      onLoadError={(error) => {
        console.error(
          "PDF load error:",
          error
        );
      }}
      loading={
        <div className="flex h-[700px] w-[520px] items-center justify-center bg-white">
          <p className="text-sm text-[#777980]">
            Loading PDF...
          </p>
        </div>
      }
      error={
        <div className="flex h-[700px] w-[520px] items-center justify-center bg-white p-8 text-center">
          <div>
            <p className="font-medium text-red-600">
              Could not render the PDF.
            </p>

            <p className="mt-2 text-xs text-[#777980]">
              Please try uploading the document again.
            </p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {pages.map(
          (pageNumber, index) => {
            const region =
              regions.find(
                (item) =>
                  item.page ===
                  pageNumber
              );

            const isFirstHighlightedPage =
              pageNumber ===
              firstHighlightedPage;

            return (
              <div key={pageNumber}>
                <div className="mb-2 flex items-center justify-between px-1 text-xs text-[#6f7177]">
                  <span>
                    {pages.length > 1
                      ? `Answer page ${
                          index + 1
                        } of ${
                          pages.length
                        }`
                      : "Answer page"}
                  </span>

                  <span>
                    PDF page{" "}
                    {pageNumber}
                  </span>
                </div>

                <div className="relative overflow-visible bg-white shadow-xl">
                  <Page
                    pageNumber={
                      pageNumber
                    }
                    width={width}
                    renderTextLayer={
                      false
                    }
                    renderAnnotationLayer={
                      false
                    }
                    onRenderSuccess={() => {
                      if (
                        isFirstHighlightedPage
                      ) {
                        window.setTimeout(
                          scrollToFirstHighlightStart,
                          80
                        );
                      }
                    }}
                    loading={
                      <div
                        style={{
                          width,
                          minHeight:
                            700,
                        }}
                        className="flex items-center justify-center bg-white"
                      >
                        <p className="text-sm text-[#777980]">
                          Loading page{" "}
                          {
                            pageNumber
                          }
                          ...
                        </p>
                      </div>
                    }
                  />

                  {region && (
                    <>
                      {/*
                        Invisible focus marker:
                        positioned at the START of the green box.

                        scrollMarginTop keeps a little breathing room
                        below the dark Answer Sheet toolbar.
                      */}
                      <div
                        ref={(element) => {
                          highlightStartRefs.current[
                            pageNumber
                          ] = element;
                        }}
                        className="pointer-events-none absolute left-0 h-px w-px"
                        style={{
                          top: `${region.box.ymin / 10}%`,
                          scrollMarginTop: "72px",
                        }}
                        aria-hidden="true"
                      />

                      <AnswerHighlight
                        region={
                          region
                        }
                        questionNumber={
                          questionNumber
                        }
                      />
                    </>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </Document>
  );
}

function AnswerHighlight({
  region,
  questionNumber,
}: {
  region: AnswerRegion;
  questionNumber: string;
}) {
  const { box } = region;

  const top =
    `${box.ymin / 10}%`;

  const left =
    `${box.xmin / 10}%`;

  const width =
    `${
      (box.xmax -
        box.xmin) /
      10
    }%`;

  const height =
    `${
      (box.ymax -
        box.ymin) /
      10
    }%`;

  return (
    <div
      className="pointer-events-none absolute border-2 border-emerald-500 bg-emerald-400/15"
      style={{
        top,
        left,
        width,
        height,
      }}
    >
      <div className="absolute -top-6 left-0 rounded-t-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white">
        Q{questionNumber}
      </div>
    </div>
  );
}
