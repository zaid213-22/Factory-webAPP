import { NextResponse } from "next/server";
import { WorkflowEngine } from "@/lib/workflow-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      articleId,
      completedByEmployeeId,
      action,
      nextEmployeeId,
      stockLocation,
      notes,
      materials,
    } = body;

    if (!articleId || !action) {
      return NextResponse.json({ error: "articleId and action (FORWARD | HOLD_IN_STOCK) are required" }, { status: 400 });
    }

    if (action !== "FORWARD" && action !== "HOLD_IN_STOCK") {
      return NextResponse.json({ error: "action must be either FORWARD or HOLD_IN_STOCK" }, { status: 400 });
    }

    const result = await WorkflowEngine.transitionStage({
      articleId,
      completedByEmployeeId: completedByEmployeeId || null,
      action,
      nextEmployeeId: nextEmployeeId || null,
      stockLocation: stockLocation || null,
      notes: notes || null,
      materials: materials || [],
    });

    return NextResponse.json({
      success: true,
      message: action === "FORWARD" ? "Article successfully advanced to next stage" : "Article placed in intermediate stock",
      article: result,
    });
  } catch (error: any) {
    console.error("POST /api/workflow/transition error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute stage transition" }, { status: 500 });
  }
}
