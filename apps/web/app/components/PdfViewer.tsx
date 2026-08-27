"use client";

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(
    null
  );

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);

    setPdfUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

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
      loading={
        <div className="flex h-[700px] w-[520px] items-center justify-center bg-white">
          <p className="text-sm text-[#777980]">
            Loading PDF...
          </p>
        </div>
      }
      error={
        <div className="flex h-[700px] w-[520px] items-center justify-center bg-white p-8 text-center">
          <p className="font-medium text-red-600">
            Could not render the PDF.
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {pages.map((pageNumber, index) => {
          const region = regions.find(
            (item) => item.page === pageNumber
          );

          return (
            <div key={pageNumber}>
              <div className="mb-2 flex items-center justify-between px-1 text-xs text-[#6f7177]">
                <span>
                  {pages.length > 1
                    ? `Answer page ${index + 1} of ${
                        pages.length
                      }`
                    : "Answer page"}
                </span>

                <span>PDF page {pageNumber}</span>
              </div>

              <div className="relative overflow-visible bg-white shadow-xl">
                <Page
                  pageNumber={pageNumber}
                  width={width}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={
                    <div
                      style={{
                        width,
                        minHeight: 700,
                      }}
                      className="flex items-center justify-center bg-white"
                    >
                      <p className="text-sm text-[#777980]">
                        Loading page {pageNumber}...
                      </p>
                    </div>
                  }
                />

                {region && (
                  <AnswerHighlight
                    region={region}
                    questionNumber={questionNumber}
                  />
                )}
              </div>
            </div>
          );
        })}
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

  const top = `${box.ymin / 10}%`;
  const left = `${box.xmin / 10}%`;

  const width = `${
    (box.xmax - box.xmin) / 10
  }%`;

  const height = `${
    (box.ymax - box.ymin) / 10
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