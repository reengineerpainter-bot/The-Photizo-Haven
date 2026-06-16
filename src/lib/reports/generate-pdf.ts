import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { GIVING_CATEGORIES } from "@/types";
import type { ConsistencyStatus } from "@/types";
import type { MonthlyReportData } from "@/types/reports";
import { formatCurrency } from "@/lib/giving/utils";

const COLORS = {
  bg: rgb(0.04, 0.04, 0.07),
  cyan: rgb(0, 0.9, 1),
  emerald: rgb(0, 1, 0.62),
  white: rgb(1, 1, 1),
  muted: rgb(0.55, 0.55, 0.64),
  rowAlt: rgb(0.96, 0.97, 0.98),
  border: rgb(0.85, 0.86, 0.9),
};

const STATUS_COLORS: Record<ConsistencyStatus, ReturnType<typeof rgb>> = {
  OUTSTANDING: COLORS.emerald,
  CONSISTENT: COLORS.cyan,
  LAGGING: rgb(0.96, 0.62, 0.04),
  LAPSED: rgb(0.9, 0.3, 0.3),
};

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export async function generateMonthlyReportPdf(data: MonthlyReportData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const margin = 48;
  let y = height - margin;

  const drawHeader = () => {
    page.drawRectangle({
      x: 0,
      y: height - 100,
      width,
      height: 100,
      color: COLORS.bg,
    });
    page.drawText("THE PHOTIZO HAVEN", {
      x: margin,
      y: height - 48,
      size: 11,
      font: fontBold,
      color: COLORS.cyan,
    });
    const title =
      data.scope === "group"
        ? `Group Giving Report — ${data.periodLabel}`
        : `Member Report — ${data.memberName ?? "Member"}`;
    page.drawText(truncate(title, 52), {
      x: margin,
      y: height - 68,
      size: 16,
      font: fontBold,
      color: COLORS.white,
    });
    page.drawText(data.groupName, {
      x: margin,
      y: height - 86,
      size: 10,
      font,
      color: COLORS.muted,
    });
    y = height - 120;
  };

  const drawFooter = (pageIndex: number, totalPages: number) => {
    page.drawText(
      `Generated ${data.generatedAt.toLocaleString("en-GH")}  ·  Page ${pageIndex} of ${totalPages}`,
      { x: margin, y: 28, size: 8, font, color: COLORS.muted }
    );
    page.drawText("Confidential — The Photizo Haven", {
      x: width - margin - 140,
      y: 28,
      size: 8,
      font,
      color: COLORS.muted,
    });
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < 60) {
      page = pdf.addPage([595.28, 841.89]);
      y = height - margin;
    }
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(36);
    page.drawText(title, { x: margin, y, size: 12, font: fontBold, color: COLORS.bg });
    y -= 8;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 2,
      color: COLORS.cyan,
    });
    y -= 20;
  };

  const drawStatBoxes = (stats: { label: string; value: string }[]) => {
    ensureSpace(70);
    const boxW = (width - margin * 2 - 16 * (stats.length - 1)) / stats.length;
    stats.forEach((stat, i) => {
      const x = margin + i * (boxW + 16);
      page.drawRectangle({
        x,
        y: y - 52,
        width: boxW,
        height: 52,
        color: COLORS.rowAlt,
        borderColor: COLORS.border,
        borderWidth: 1,
      });
      page.drawText(stat.label, { x: x + 10, y: y - 18, size: 8, font, color: COLORS.muted });
      page.drawText(truncate(stat.value, 18), {
        x: x + 10,
        y: y - 38,
        size: 13,
        font: fontBold,
        color: COLORS.bg,
      });
    });
    y -= 68;
  };

  const drawTableHeader = (cols: { label: string; x: number; w: number }[]) => {
    ensureSpace(24);
    page.drawRectangle({
      x: margin,
      y: y - 18,
      width: width - margin * 2,
      height: 20,
      color: COLORS.bg,
    });
    cols.forEach((col) => {
      page.drawText(col.label, {
        x: col.x,
        y: y - 12,
        size: 9,
        font: fontBold,
        color: COLORS.white,
      });
    });
    y -= 24;
  };

  const drawTableRow = (
    cells: { text: string; x: number; w: number }[],
    alt: boolean
  ) => {
    ensureSpace(20);
    if (alt) {
      page.drawRectangle({
        x: margin,
        y: y - 16,
        width: width - margin * 2,
        height: 18,
        color: COLORS.rowAlt,
      });
    }
    cells.forEach((cell) => {
      page.drawText(truncate(cell.text, Math.floor(cell.w / 5)), {
        x: cell.x,
        y: y - 12,
        size: 9,
        font,
        color: COLORS.bg,
      });
    });
    y -= 18;
  };

  drawHeader();

  if (data.scope === "individual") {
    drawStatBoxes([
      { label: "TOTAL CONTRIBUTED", value: formatCurrency(data.totalContributed) },
      { label: "PERIOD", value: data.periodLabel },
      { label: "STATUS", value: data.consistency ?? "—" },
    ]);

    drawSectionTitle("Giving by Category");
    const cols = [
      { label: "Category", x: margin + 8, w: 140 },
      { label: "Amount", x: margin + 160, w: 90 },
      { label: "Goal", x: margin + 260, w: 90 },
      { label: "Progress", x: margin + 360, w: 70 },
      { label: "Notes", x: margin + 440, w: 100 },
    ];
    drawTableHeader(cols);

    data.categories.forEach((row, i) => {
      drawTableRow(
        [
          { text: row.label, x: cols[0].x, w: cols[0].w },
          { text: formatCurrency(row.amount), x: cols[1].x, w: cols[1].w },
          { text: row.target ? formatCurrency(row.target) : "—", x: cols[2].x, w: cols[2].w },
          { text: row.progress !== null ? `${row.progress}%` : "—", x: cols[3].x, w: cols[3].w },
          { text: row.projectDesc ?? "—", x: cols[4].x, w: cols[4].w },
        ],
        i % 2 === 1
      );
    });
  } else {
    drawStatBoxes([
      { label: "GROUP TOTAL", value: formatCurrency(data.totalContributed) },
      { label: "ACTIVE MEMBERS", value: String(data.members?.length ?? 0) },
      { label: "OUTSTANDING", value: String(data.consistencyBreakdown?.OUTSTANDING ?? 0) },
      { label: "LAPSED", value: String(data.consistencyBreakdown?.LAPSED ?? 0) },
    ]);

    drawSectionTitle("Collective Totals by Category");
    const catCols = [
      { label: "Category", x: margin + 8, w: 200 },
      { label: "Group Total", x: margin + 220, w: 120 },
    ];
    drawTableHeader(catCols);
    data.categories.forEach((row, i) => {
      drawTableRow(
        [
          { text: row.label, x: catCols[0].x, w: catCols[0].w },
          { text: formatCurrency(row.amount), x: catCols[1].x, w: catCols[1].w },
        ],
        i % 2 === 1
      );
    });

    drawSectionTitle("Member Breakdown");
    const memCols = [
      { label: "Member", x: margin + 8, w: 120 },
      { label: "Status", x: margin + 132, w: 72 },
      { label: "Total", x: margin + 210, w: 72 },
      ...GIVING_CATEGORIES.slice(0, 3).map((c, i) => ({
        label: truncate(c.label, 8),
        x: margin + 290 + i * 72,
        w: 68,
      })),
    ];
    drawTableHeader(memCols);

    data.members?.forEach((member, i) => {
      drawTableRow(
        [
          { text: member.name, x: memCols[0].x, w: memCols[0].w },
          { text: member.consistency, x: memCols[1].x, w: memCols[1].w },
          { text: formatCurrency(member.total), x: memCols[2].x, w: memCols[2].w },
          ...GIVING_CATEGORIES.slice(0, 3).map((c, ci) => ({
            text: formatCurrency(member.byCategory[c.key] ?? 0),
            x: memCols[3 + ci].x,
            w: memCols[3 + ci].w,
          })),
        ],
        i % 2 === 1
      );
    });

    if ((data.members?.length ?? 0) > 0) {
      y -= 8;
      drawSectionTitle("Consistency Overview");
      (["OUTSTANDING", "CONSISTENT", "LAGGING", "LAPSED"] as ConsistencyStatus[]).forEach(
        (status) => {
          const count = data.consistencyBreakdown?.[status] ?? 0;
          ensureSpace(16);
          page.drawRectangle({
            x: margin,
            y: y - 10,
            width: 10,
            height: 10,
            color: STATUS_COLORS[status],
          });
          page.drawText(`${status}: ${count} member${count === 1 ? "" : "s"}`, {
            x: margin + 16,
            y: y - 8,
            size: 9,
            font,
            color: COLORS.bg,
          });
          y -= 16;
        }
      );
    }
  }

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    page = p;
    drawFooter(i + 1, pages.length);
  });

  return pdf.save();
}

export function reportFilename(data: MonthlyReportData): string {
  const period = data.periodMonth.slice(0, 7);
  if (data.scope === "group") {
    return `photizo-group-report-${period}.pdf`;
  }
  const slug = (data.memberName ?? "member")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `photizo-report-${slug}-${period}.pdf`;
}
