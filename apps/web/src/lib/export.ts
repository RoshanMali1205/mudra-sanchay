import { DEVELOPER_FOOTER, PRINT_BRAND, formatInrFromPaise } from "@mudra-sanchay/shared";
import type { FarmerSummary, LedgerLine } from "@mudra-sanchay/shared";

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

export async function shareWhatsApp(phone: string | undefined, text: string, title: string) {
  if (navigator.share) {
    await navigator.share({ title, text });
    return;
  }
  const digits = (phone ?? "").replace(/\D/g, "");
  const url = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener");
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function triggerDownload(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
