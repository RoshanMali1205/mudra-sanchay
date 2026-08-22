import { DEVELOPER_FOOTER, PRINT_BRAND, formatInrFromPaise } from "@mudra-sanchay/shared";
import type { DailySheet, DashboardSummary, FarmerSummary, LedgerLine } from "@mudra-sanchay/shared";
import { buildPdfBlob, downloadPdf, type PdfDocument } from "./pdf";

export function downloadExcel(filename: string, sheets: Array<{ name: string; rows: Array<Array<string | number>> }>) {
  const xmlSheets = sheets
    .map((sheet) => {
      const rows = sheet.rows
        .map(
          (row) =>
            `<Row>${row
              .map((cell) => `<Cell><Data ss:Type="${typeof cell === "number" ? "Number" : "String"}">${escapeXml(String(cell))}</Data></Cell>`)
              .join("")}</Row>`
        )
        .join("");
      return `<Worksheet ss:Name="${escapeXml(sheet.name)}"><Table>${rows}</Table></Worksheet>`;
    })
    .join("");

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${xmlSheets}
</Workbook>`;
  triggerDownload(filename.endsWith(".xls") ? filename : `${filename}.xls`, xml, "application/vnd.ms-excel");
}

export function statementRows(farmer: FarmerSummary, ledger: LedgerLine[], from: string, to: string) {
  return {
    summary: [
      ["Business", PRINT_BRAND],
      ["Farmer", farmer.fullName],
      ["Code", farmer.farmerCode],
      ["Village", farmer.village],
      ["Mobile", farmer.mobile ?? ""],
      ["From", from],
      ["To", to],
      ["Outstanding", formatInrFromPaise(farmer.outstandingPaise)],
      ["Footer", DEVELOPER_FOOTER]
    ],
    details: [
      ["Date", "Type", "Description", "Crates", "Debit", "Credit", "Balance"],
      ...ledger.map((line) => [
        line.date,
        line.type,
        line.description,
        line.crates ?? "",
        formatInrFromPaise(line.debitPaise),
        formatInrFromPaise(line.creditPaise),
        formatInrFromPaise(line.runningBalancePaise)
      ])
    ]
  };
}

export function statementPdfDocument(
  farmer: FarmerSummary,
  ledger: LedgerLine[],
  from: string,
  to: string,
  labels: {
    date: string;
    details: string;
    crates: string;
    amount: string;
    balance: string;
    outstanding: string;
    language: string;
  }
): PdfDocument {
  return {
    filename: `${farmer.farmerCode}-statement.pdf`,
    title: PRINT_BRAND,
    subtitle: `${farmer.fullName} · ${farmer.farmerCode} · ${farmer.village}`,
    meta: [
      `${from} → ${to} · ${labels.language}`,
      farmer.mobile ? farmer.mobile : "",
      generatedStamp()
    ].filter(Boolean),
    columns: [
      { label: labels.date, width: 150 },
      { label: labels.details },
      { label: labels.crates, width: 110, align: "right" },
      { label: labels.amount, width: 150, align: "right" },
      { label: labels.balance, width: 160, align: "right" }
    ],
    rows: ledger.map((line) => [
      line.date,
      line.description,
      line.crates != null ? String(line.crates) : "",
      formatInrFromPaise(line.debitPaise || line.creditPaise),
      formatInrFromPaise(line.runningBalancePaise)
    ]),
    summary: [`${labels.outstanding}: ${formatInrFromPaise(farmer.outstandingPaise)}`],
    footer: DEVELOPER_FOOTER
  };
}

export function reportPdfDocument(
  summary: DashboardSummary | undefined,
  outstanding: FarmerSummary[],
  from: string,
  to: string,
  labels: {
    title: string;
    farmer: string;
    village: string;
    balance: string;
    income: string;
    received: string;
    expenses: string;
    profit: string;
    cash: string;
    outstanding: string;
    crates: string;
    trips: string;
    farmers?: string;
    daySheet?: string;
    dues?: string;
  },
  dailySheet?: DailySheet
): PdfDocument {
  const farmerCount = dailySheet?.farmerCount ?? summary?.farmerCount ?? 0;

  return {
    filename: "mudra-sanchay-report.pdf",
    title: PRINT_BRAND,
    subtitle: labels.title,
    meta: [
      `${from} → ${to}`,
      `${labels.income}: ${formatInrFromPaise(summary?.freightPaise ?? 0)}`,
      `${labels.received}: ${formatInrFromPaise(summary?.receivedPaise ?? 0)}`,
      `${labels.expenses}: ${formatInrFromPaise(summary?.expensesPaise ?? 0)}`,
      `${labels.profit}: ${formatInrFromPaise(summary?.accrualProfitPaise ?? 0)}`,
      `${labels.cash}: ${formatInrFromPaise(summary?.cashSurplusPaise ?? 0)}`,
      `${labels.crates}: ${summary?.crates ?? dailySheet?.crates ?? 0} · ${labels.trips}: ${summary?.trips ?? dailySheet?.trips ?? 0}${labels.farmers ? ` · ${labels.farmers}: ${farmerCount}` : ""}`,
      generatedStamp()
    ],
    columns: [
      { label: labels.farmer },
      { label: labels.village, width: 280 },
      { label: labels.balance, width: 180, align: "right" }
    ],
    rows: outstanding.map((farmer) => [
      farmer.fullName,
      farmer.village,
      formatInrFromPaise(farmer.outstandingPaise)
    ]),
    summary: [
      ...(labels.daySheet && dailySheet
        ? [`${labels.daySheet}: ${farmerCount} · ${dailySheet.crates} ${labels.crates}`]
        : []),
      `${labels.dues ?? labels.outstanding}: ${formatInrFromPaise(summary?.outstandingPaise ?? 0)}`
    ],
    footer: DEVELOPER_FOOTER
  };
}

export function expensePdfDocument(
  rows: Array<{ date: string; category: string; amount: string; vendor: string }>,
  total: string,
  labels: {
    title: string;
    date: string;
    category: string;
    amount: string;
    vendor: string;
    expenses: string;
    from: string;
    to: string;
  }
): PdfDocument {
  return {
    filename: "mudra-sanchay-expenses.pdf",
    title: PRINT_BRAND,
    subtitle: labels.title,
    meta: [`${labels.from} → ${labels.to}`, generatedStamp()],
    columns: [
      { label: labels.date, width: 150 },
      { label: labels.category },
      { label: labels.vendor, width: 240 },
      { label: labels.amount, width: 160, align: "right" }
    ],
    rows: rows.map((row) => [row.date, row.category, row.vendor, row.amount]),
    summary: [`${labels.expenses}: ${total}`],
    footer: DEVELOPER_FOOTER
  };
}

export async function exportStatementPdf(
  farmer: FarmerSummary,
  ledger: LedgerLine[],
  from: string,
  to: string,
  labels: Parameters<typeof statementPdfDocument>[4]
) {
  return downloadPdf(statementPdfDocument(farmer, ledger, from, to, labels));
}

export async function shareStatementPdf(
  farmer: FarmerSummary,
  ledger: LedgerLine[],
  from: string,
  to: string,
  labels: Parameters<typeof statementPdfDocument>[4],
  message: string,
  title: string
) {
  const doc = statementPdfDocument(farmer, ledger, from, to, labels);
  const blob = await buildPdfBlob(doc);
  const file = new File([blob], doc.filename, { type: "application/pdf" });
  await shareWhatsApp(farmer.mobile, message, title, file);
}

export async function shareWhatsApp(phone: string | undefined, text: string, title: string, file?: File) {
  if (file && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, text, files: [file] });
    return;
  }
  if (file) {
    triggerDownload(file.name, file, file.type);
  } else if (navigator.share) {
    await navigator.share({ title, text });
    return;
  }
  const digits = (phone ?? "").replace(/\D/g, "");
  const url = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener");
}

function generatedStamp() {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function triggerDownload(filename: string, content: string | Blob, type: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
