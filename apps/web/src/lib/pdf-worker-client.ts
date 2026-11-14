type PdfJsWorkerHost = {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  verbosity?: number;
  VerbosityLevel?: {
    ERRORS: number;
    WARNINGS: number;
    INFOS: number;
  };
};

// Versioned public asset copied from the installed pdfjs-dist package. Keeping
// the version in the URL allows a long immutable cache without stale upgrades.
const PDF_WORKER_SRC = '/pdf.worker-4.8.69.min.mjs';

export function configurePdfWorker(pdfjsLib: PdfJsWorkerHost) {
  if (pdfjsLib.GlobalWorkerOptions.workerSrc !== PDF_WORKER_SRC) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  }
  // Silence expected font missing warnings and text layer abort exceptions
  if (pdfjsLib.VerbosityLevel && typeof pdfjsLib.VerbosityLevel.ERRORS === 'number') {
    pdfjsLib.verbosity = pdfjsLib.VerbosityLevel.ERRORS;
  }
}
