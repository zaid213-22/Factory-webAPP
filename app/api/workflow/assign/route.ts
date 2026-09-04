import { NextResponse } from "next/server";
import { WorkflowEngine } from "@/lib/workflow-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { articleId, employeeId, action } = body;

    if (!articleId) {
      return NextResponse.json({ error: "articleId is required" }, { status: 400 });
    }

    if (action === "UNASSIGN") {
      const updated = await WorkflowEngine.unassignArticle(articleId);
      return NextResponse.json({
        success: true,
        message: "Worker unassigned from article",
        article: updated,
      });
    }

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required for assignment" }, { status: 400 });
    }

    const updated = await WorkflowEngine.assignArticle({
      articleId,
      employeeId,
      notes: body.notes,
    });

    return NextResponse.json({
      success: true,
      message: "Article successfully assigned to worker",
      article: updated,
    });
  } catch (error: any) {
    console.error("POST /api/workflow/assign error:", error);
    return NextResponse.json({ error: error.message || "Failed to update assignment" }, { status: 500 });
  }
}
