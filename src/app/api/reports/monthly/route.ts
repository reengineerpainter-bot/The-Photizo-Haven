import { NextRequest, NextResponse } from "next/server";
import { withMemberAuth } from "@/lib/auth/middleware";
import { monthlyReportQuerySchema } from "@/lib/validation/reports";
import { gatherMonthlyReport, ReportError } from "@/lib/reports/gather-data";
import { generateMonthlyReportPdf, reportFilename } from "@/lib/reports/generate-pdf";
import { writeAuditLog } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/security/rate-limit";

export const GET = withMemberAuth(async (req: NextRequest, auth) => {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = monthlyReportQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { period, scope, memberId } = parsed.data;

  try {
    const data = await gatherMonthlyReport(auth, period, scope, memberId);
    const pdfBytes = await generateMonthlyReportPdf(data);
    const filename = reportFilename(data);

    await writeAuditLog({
      actorId: auth.userId,
      groupId: auth.groupId,
      action: "REPORT_GENERATED",
      resourceType: "monthly_report",
      ipAddress: getClientIp(req),
      metadata: { scope, period, memberId: memberId ?? auth.userId },
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ReportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[reports/monthly]", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
});
