/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

// Imported dynamically by `loadPdfJsAsync()`, so pdf.js styles load only with pdf.js itself.
// The pdf.js stylesheet is scoped to `.xh-pdf-viewer` - see scripts/generate-pdfjs-css.mjs.
// Hoist's overrides must follow it, to win at equal specificity.
import './pdf_viewer.css';
import './PdfJs.scss';
