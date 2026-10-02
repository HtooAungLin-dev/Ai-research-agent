import { jsPDF } from 'jspdf';
import { ExtractedSource } from '../types/research';

export function exportReportToPDF(
  title: string,
  markdown: string,
  sources: ExtractedSource[],
  metadata: { depth: string; model: string; date: string }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 22;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(248, 250, 252);
  doc.text('DEEP RESEARCH AUTONOMOUS INTELLIGENCE REPORT', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Zero-Cost Pipeline | Model: ${metadata.model} | Depth: ${metadata.depth.toUpperCase()} | Date: ${metadata.date}`,
    margin,
    20
  );

  cursorY = 36;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(title, contentWidth);
  doc.text(titleLines, margin, cursorY);
  cursorY += titleLines.length * 7 + 4;

  // Horizontal divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 8;

  // Parse lines of markdown
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) {
      cursorY += 3;
      continue;
    }

    // Check page overflow
    if (cursorY > pageHeight - 20) {
      doc.addPage();
      cursorY = 20;
    }

    if (rawLine.startsWith('# ')) {
      // Heading 1
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      const text = rawLine.replace('# ', '');
      doc.text(text, margin, cursorY);
      cursorY += 7;
    } else if (rawLine.startsWith('## ')) {
      // Heading 2
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(79, 70, 229); // indigo-600
      const text = rawLine.replace('## ', '');
      cursorY += 3;
      doc.text(text, margin, cursorY);
      cursorY += 6;
    } else if (rawLine.startsWith('### ')) {
      // Heading 3
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const text = rawLine.replace('### ', '');
      doc.text(text, margin, cursorY);
      cursorY += 5;
    } else if (rawLine.startsWith('- ') || rawLine.startsWith('* ')) {
      // Bullet list
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const bulletText = `•  ${rawLine.replace(/^[-*]\s+/, '')}`;
      const wrapped = doc.splitTextToSize(bulletText, contentWidth - 4);
      doc.text(wrapped, margin + 4, cursorY);
      cursorY += wrapped.length * 4.2;
    } else if (rawLine.startsWith('|')) {
      // Markdown table row
      doc.setFont('courier', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const cleanTableRow = rawLine.replace(/\|/g, '  ').slice(0, 95);
      doc.text(cleanTableRow, margin + 2, cursorY);
      cursorY += 4;
    } else {
      // Body paragraph
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      // Clean bold markers for PDF text
      const cleanLine = rawLine.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
      const wrapped = doc.splitTextToSize(cleanLine, contentWidth);
      doc.text(wrapped, margin, cursorY);
      cursorY += wrapped.length * 4.2;
    }
  }

  // Footer page numbering
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Autonomous Deep Research Engine — Page ${p} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const safeFilename = title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  doc.save(`Deep_Research_${safeFilename || 'Report'}.pdf`);
}
