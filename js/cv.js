import { getDocument, GlobalWorkerOptions } from './vendor/pdfjs/pdf.min.mjs';

GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;

const preview = document.getElementById('cvPreview');
const pages = document.getElementById('cvPages');
const status = document.getElementById('cvStatus');
let pdf;
let renderVersion = 0;
let resizeTimer;

async function renderPages() {
  if (!pdf) return;
  const version = ++renderVersion;
  const width = Math.min(1000, Math.max(200, preview.clientWidth - 32));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const fragment = document.createDocumentFragment();
  preview.setAttribute('aria-busy', 'true');

  try {
    for (let number = 1; number <= pdf.numPages; number++) {
      if (version !== renderVersion) return;
      const page = await pdf.getPage(number);
      const natural = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: width / natural.width });
      const sheet = document.createElement('section');
      sheet.className = 'cv-sheet';
      sheet.setAttribute('aria-label', `CV page ${number} of ${pdf.numPages}`);
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width * pixelRatio);
      canvas.height = Math.ceil(viewport.height * pixelRatio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      canvas.setAttribute('aria-hidden', 'true');
      await page.render({ canvasContext: canvas.getContext('2d'), viewport,
        transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0]
      }).promise;
      const text = document.createElement('div');
      text.className = 'cv-page-text';
      const content = await page.getTextContent();
      text.textContent = content.items.map(item => item.str || '').join(' ');
      sheet.append(canvas, text);
      fragment.append(sheet);
    }
    if (version !== renderVersion) return;
    pages.replaceChildren(fragment);
    status.textContent = '';
  } catch (error) {
    if (version !== renderVersion) return;
    console.error('CV preview failed:', error);
    status.textContent = 'The preview could not load. Use “Open PDF directly” or “Download PDF” above.';
  } finally {
    if (version === renderVersion) preview.setAttribute('aria-busy', 'false');
  }
}

try {
  pdf = await getDocument({ url: new URL('../assets/Ahmad_Bin_Ajmal_CV_Final.pdf', import.meta.url).href }).promise;
  await renderPages();
} catch (error) {
  console.error('CV loading failed:', error);
  status.textContent = 'The preview could not load. Use “Open PDF directly” or “Download PDF” above.';
  preview.setAttribute('aria-busy', 'false');
}

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderPages, 150);
});
