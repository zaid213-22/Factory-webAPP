import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorkflowEngine } from "@/lib/workflow-engine";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const article = await WorkflowEngine.getArticleJourney(id);

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch article" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, totalQuantityPairs, notes, stockLocation } = body;

    const updated = await prisma.article.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(totalQuantityPairs !== undefined && { totalQuantityPairs: parseInt(totalQuantityPairs, 10) }),
        ...(notes !== undefined && { notes: notes ? notes.trim() : null }),
        ...(stockLocation !== undefined && { stockLocation: stockLocation ? stockLocation.trim() : null }),
      },
      include: {
        assignedEmployee: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update article" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.article.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Article deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete article" }, { status: 500 });
  }
}
