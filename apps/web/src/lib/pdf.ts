const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const SCALE = 2;
const CANVAS_WIDTH = Math.round(PAGE_WIDTH * SCALE);
const CANVAS_HEIGHT = Math.round(PAGE_HEIGHT * SCALE);
const MARGIN = 48;
const FONT = '"Noto Sans Devanagari", "Noto Sans", sans-serif';

export type PdfColumn = {
  label: string;
  width?: number;
  align?: "left" | "right";
};

export type PdfDocument = {
  filename: string;
  title: string;
  subtitle?: string;
  meta?: string[];
  columns: PdfColumn[];
  rows: string[][];
  summary?: string[];
  footer: string;
};

export async function downloadPdf(doc: PdfDocument) {
  const blob = await buildPdfBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = doc.filename.endsWith(".pdf") ? doc.filename : `${doc.filename}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
  return blob;
}

export async function buildPdfBlob(doc: PdfDocument): Promise<Blob> {
  await document.fonts.ready;
  const jpegs = await renderPages(doc);
  const bytes = assemblePdf(jpegs, doc.title);
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

async function renderPages(doc: PdfDocument) {
  const tableWidth = CANVAS_WIDTH - MARGIN * 2;
  const colWidths = columnWidths(doc.columns, tableWidth);
  const rowHeights = doc.rows.map((row) => measureRowHeight(row, doc.columns, colWidths));
  const summaryHeight = (doc.summary?.length ?? 0) * 28 + (doc.summary?.length ? 16 : 0);
  const headerSample = measureHeaderHeight(doc);
  const bottom = CANVAS_HEIGHT - 72;
  const usable = bottom - headerSample - 44;
  const ranges = paginate(rowHeights, usable, summaryHeight);
  const pages: Array<{ data: Uint8Array; width: number; height: number }> = [];

  for (let pageIndex = 0; pageIndex < ranges.length; pageIndex += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create PDF canvas");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    let y = drawHeader(ctx, doc);
    y = drawTableHeader(ctx, doc.columns, colWidths, y);
    const range = ranges[pageIndex];
    if (!range) continue;
    const [start, end] = range;
    for (let index = start; index < end; index += 1) {
      const row = doc.rows[index];
      if (!row) continue;
      y = drawRow(ctx, row, doc.columns, colWidths, y, index % 2 === 1);
    }

    if (end >= doc.rows.length && doc.summary?.length) {
      y += 18;
      ctx.font = `700 22px ${FONT}`;
      ctx.fillStyle = "#17212b";
      ctx.textAlign = "left";
      for (const line of doc.summary) {
        ctx.fillText(line, MARGIN, y, tableWidth);
        y += 28;
      }
    } else if (doc.rows.length === 0) {
      ctx.font = `500 20px ${FONT}`;
      ctx.fillStyle = "#64748b";
      ctx.fillText("—", MARGIN, y + 28, tableWidth);
    }

    drawFooter(ctx, doc.footer, pageIndex + 1, ranges.length);
    pages.push({
      data: await canvasToJpeg(canvas),
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT
    });
  }

  return pages;
}

function paginate(rowHeights: number[], usable: number, lastPageExtra: number): Array<[number, number]> {
  if (rowHeights.length === 0) return [[0, 0]];
  const ranges: Array<[number, number]> = [];
  let start = 0;
  let used = 0;
  rowHeights.forEach((height, index) => {
    const extra = index === rowHeights.length - 1 ? lastPageExtra : 0;
    if (index > start && used + height + extra > usable) {
      ranges.push([start, index]);
      start = index;
      used = 0;
    }
    used += height;
  });
  ranges.push([start, rowHeights.length]);
  return ranges;
}

function measureHeaderHeight(doc: PdfDocument) {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 160;
  return drawHeader(ctx, doc);
}

function drawFooter(ctx: CanvasRenderingContext2D, footer: string, page: number, total: number) {
  ctx.fillStyle = "#0f766e";
  ctx.fillRect(MARGIN, CANVAS_HEIGHT - 54, CANVAS_WIDTH - MARGIN * 2, 3);
  ctx.font = `500 16px ${FONT}`;
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "left";
  ctx.fillText(footer, MARGIN, CANVAS_HEIGHT - 24, CANVAS_WIDTH - MARGIN * 2 - 140);
  ctx.textAlign = "right";
  ctx.fillText(`${page} / ${total}`, CANVAS_WIDTH - MARGIN, CANVAS_HEIGHT - 24);
  ctx.textAlign = "left";
}

function drawHeader(ctx: CanvasRenderingContext2D, doc: PdfDocument) {
  ctx.fillStyle = "#0f766e";
  ctx.fillRect(0, 0, CANVAS_WIDTH, 10);
  ctx.font = `800 28px ${FONT}`;
  ctx.fillStyle = "#115e59";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let y = MARGIN + 8;
  wrapText(ctx, doc.title, CANVAS_WIDTH - MARGIN * 2).forEach((line) => {
    ctx.fillText(line, MARGIN, y);
    y += 34;
  });
  if (doc.subtitle) {
    ctx.font = `700 22px ${FONT}`;
    ctx.fillStyle = "#17212b";
    wrapText(ctx, doc.subtitle, CANVAS_WIDTH - MARGIN * 2).forEach((line) => {
      ctx.fillText(line, MARGIN, y);
      y += 28;
    });
  }
  ctx.font = `500 18px ${FONT}`;
  ctx.fillStyle = "#64748b";
  for (const line of doc.meta ?? []) {
    ctx.fillText(line, MARGIN, y, CANVAS_WIDTH - MARGIN * 2);
    y += 24;
  }
  return y + 16;
}

function drawTableHeader(ctx: CanvasRenderingContext2D, columns: PdfColumn[], widths: number[], y: number) {
  const height = 44;
  ctx.fillStyle = "#0f766e";
  roundRect(ctx, MARGIN, y, CANVAS_WIDTH - MARGIN * 2, height, 10);
  ctx.fill();
  ctx.font = `700 16px ${FONT}`;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  let x = MARGIN + 12;
  columns.forEach((column, index) => {
    const align = column.align ?? "left";
    ctx.textAlign = align;
    const width = widths[index] ?? 80;
    const textX = align === "right" ? x + width - 24 : x;
    ctx.fillText(column.label, textX, y + height / 2, width - 16);
    x += width;
  });
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  return y + height;
}

function drawRow(
  ctx: CanvasRenderingContext2D,
  row: string[],
  columns: PdfColumn[],
  widths: number[],
  y: number,
  striped: boolean
) {
  const height = measureRowHeight(row, columns, widths);
  if (striped) {
    ctx.fillStyle = "#f4f7f7";
    ctx.fillRect(MARGIN, y, CANVAS_WIDTH - MARGIN * 2, height);
  }
  ctx.strokeStyle = "#d7e3e2";
  ctx.beginPath();
  ctx.moveTo(MARGIN, y + height);
  ctx.lineTo(CANVAS_WIDTH - MARGIN, y + height);
  ctx.stroke();
  ctx.font = `600 16px ${FONT}`;
  ctx.fillStyle = "#17212b";
  let x = MARGIN + 12;
  row.forEach((cell, index) => {
    const align = columns[index]?.align ?? "left";
    const width = widths[index] ?? 80;
    const lines = wrapText(ctx, cell, width - 20);
    ctx.textAlign = align;
    lines.forEach((line, lineIndex) => {
      const textX = align === "right" ? x + width - 24 : x;
      ctx.fillText(line, textX, y + 22 + lineIndex * 20, width - 16);
    });
    x += width;
  });
  ctx.textAlign = "left";
  return y + height;
}

function measureRowHeight(row: string[], columns: PdfColumn[], widths: number[]) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return 36;
  ctx.font = `600 16px ${FONT}`;
  const lines = Math.max(
    1,
    ...row.map((cell, index) => wrapText(ctx, cell, (widths[index] ?? 80) - 20).length)
  );
  return Math.max(36, 16 + lines * 20);
}

function columnWidths(columns: PdfColumn[], tableWidth: number) {
  const explicit = columns.map((column) => column.width ?? 0);
  const leftover = tableWidth - explicit.reduce((sum, value) => sum + value, 0);
  const flexible = columns.filter((column) => !column.width).length || 1;
  return columns.map((column) => column.width ?? leftover / flexible);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const value = text.trim() ? text : " ";
  if (ctx.measureText(value).width <= maxWidth) return [value];
  const lines: string[] = [];
  let current = "";
  for (const character of value) {
    const next = current + character;
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current);
      current = character;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

async function canvasToJpeg(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) throw new Error("Could not create PDF page");
  return new Uint8Array(await blob.arrayBuffer());
}

function assemblePdf(pages: Array<{ data: Uint8Array; width: number; height: number }>, title: string) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let offset = 0;
  const offsets = [0];

  const write = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    offset += bytes.length;
  };

  write("%PDF-1.4\n%\x80\x80\x80\x80\n");

  const object = (id: number, body: string | Uint8Array | Array<string | Uint8Array>) => {
    offsets[id] = offset;
    write(`${id} 0 obj\n`);
    if (typeof body === "string" || body instanceof Uint8Array) write(body);
    else body.forEach(write);
    write("\nendobj\n");
  };

  const pageIds = pages.map((_, index) => 4 + index * 3);
  object(1, `<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /DisplayDocTitle true >> >>`);
  object(
    2,
    `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`
  );
  object(
    3,
    `<< /Title ${pdfString(title)} /Producer (Mudra Sanchay) /Creator (Mudra Sanchay) >>`
  );

  pages.forEach((page, index) => {
    const pageId = 4 + index * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    object(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /XObject << /Im1 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    const content = `q ${PAGE_WIDTH} 0 0 ${PAGE_HEIGHT} 0 0 cm /Im1 Do Q`;
    object(contentId, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    object(imageId, [
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.data.length} >>\nstream\n`,
      page.data,
      "\nendstream"
    ]);
  });

  const xref = offset;
  write(`xref\n0 ${offsets.length}\n`);
  write("0000000000 65535 f \n");
  for (let id = 1; id < offsets.length; id += 1) {
    write(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  write(
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF`
  );

  const output = new Uint8Array(offset);
  let cursor = 0;
  for (const chunk of chunks) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }
  return output;
}

function pdfString(value: string) {
  const cleaned = value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  return `(${cleaned})`;
}
