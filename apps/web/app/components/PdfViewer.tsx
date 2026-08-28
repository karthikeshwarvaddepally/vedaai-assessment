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
  const [fileUrl, setFileUrl] =
    useState<string | null>(null);

  const highlightStartRefs =
    useRef<Record<number, HTMLDivElement | null>>({});

  const isImage =
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    /\.(png|jpe?g)$/i.test(file.name);

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

    setFileUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    if (isImage) {
      onLoadSuccess(1);
    }
  }, [isImage, onLoadSuccess]);

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

  if (!fileUrl) {
    return (
      <div
        style={{ width }}
        className="flex min-h-[700px] items-center justify-center bg-white"
      >
        <p className="text-sm text-[#777980]">
          Preparing document...
        </p>
      </div>
    );
  }

  if (isImage) {
    const region =
      regions.find(
        (item) => item.page === 1
      );

    return (
      <div className="flex flex-col gap-6">
        <div>
          <div className="mb-2 flex items-center justify-between px-1 text-xs text-[#6f7177]">
            <span>Answer page</span>
            <span>Image</span>
          </div>

          <div
            className="relative overflow-visible bg-white shadow-xl"
            style={{ width }}
          >
            <img
              src={fileUrl}
              alt="Uploaded answer sheet"
              className="block h-auto w-full"
              onLoad={() => {
                window.setTimeout(
                  scrollToFirstHighlightStart,
                  80
                );
              }}
            />

            {region && (
              <>
                <div
                  ref={(element) => {
                    highlightStartRefs.current[1] =
                      element;
                  }}
                  className="pointer-events-none absolute left-0 h-px w-px"
                  style={{
                    top: `${region.box.ymin / 10}%`,
                    scrollMarginTop: "72px",
                  }}
                  aria-hidden="true"
                />

                <AnswerHighlight
                  region={region}
                  questionNumber={
                    questionNumber
                  }
                />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Document
      file={fileUrl}
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
        <div
          style={{ width }}
          className="flex min-h-[700px] items-center justify-center bg-white"
        >
          <p className="text-sm text-[#777980]">
            Loading PDF...
          </p>
        </div>
      }
      error={
        <div
          style={{ width }}
          className="flex min-h-[700px] items-center justify-center bg-white p-8 text-center"
        >
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
