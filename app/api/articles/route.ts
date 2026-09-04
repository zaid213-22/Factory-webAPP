import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const status = searchParams.get("status");
    const employeeId = searchParams.get("employeeId");

    const where: any = {};
    if (stage && stage !== "ALL") where.currentStage = stage;
    if (status && status !== "ALL") where.status = status;
    if (employeeId && employeeId !== "ALL") where.assignedEmployeeId = employeeId;

    const articles = await prisma.article.findMany({
      where,
      include: {
        assignedEmployee: true,
        _count: {
          select: {
            stageLogs: true,
            materials: true,
          },
        },
        materials: {
          select: {
            totalCost: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = articles.map((art) => {
      const totalCost = art.materials.reduce((sum, m) => sum + m.totalCost, 0);
      const unitCost = art.totalQuantityPairs > 0 ? totalCost / art.totalQuantityPairs : 0;
      return {
        ...art,
        totalMaterialCost: Number(totalCost.toFixed(2)),
        costPerPair: Number(unitCost.toFixed(2)),
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error("GET /api/articles error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch articles" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { articleCode, name, totalQuantityPairs, assignedEmployeeId, notes } = body;

    if (!articleCode || !name || totalQuantityPairs === undefined) {
      return NextResponse.json(
        { error: "articleCode, name, and totalQuantityPairs are required" },
        { status: 400 }
      );
    }

    const qty = parseInt(totalQuantityPairs, 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: "totalQuantityPairs must be a positive number" }, { status: 400 });
    }

    const existing = await prisma.article.findUnique({
      where: { articleCode: articleCode.trim().toUpperCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Article code ${articleCode.toUpperCase()} already exists` },
        { status: 409 }
      );
    }

    // Verify employee if assigned
    let employee = null;
    if (assignedEmployeeId) {
      employee = await prisma.employee.findUnique({
        where: { id: assignedEmployeeId },
      });
      if (!employee) {
        return NextResponse.json({ error: "Assigned employee not found" }, { status: 404 });
      }
      if (employee.department !== "CUTTING") {
        return NextResponse.json(
          { error: `Initial stage is Cutting. Worker ${employee.name} is in ${employee.department} department.` },
          { status: 400 }
        );
      }
    }

    const article = await prisma.$transaction(async (tx) => {
      const created = await tx.article.create({
        data: {
          articleCode: articleCode.trim().toUpperCase(),
          name: name.trim(),
          currentStage: "CUTTING",
          status: assignedEmployeeId ? "IN_PROGRESS" : "STOCKED",
          stockStage: assignedEmployeeId ? null : "CUTTING",
          stockLocation: assignedEmployeeId ? null : "Cutting Intake Bay",
          totalQuantityPairs: qty,
          assignedEmployeeId: assignedEmployeeId || null,
          notes: notes ? notes.trim() : null,
        },
        include: {
          assignedEmployee: true,
        },
      });

      // Log initial production event
      await tx.articleStageLog.create({
        data: {
          articleId: created.id,
          fromStage: "INITIAL",
          toStage: "CUTTING",
          actionTaken: assignedEmployeeId ? "STARTED" : "HELD_IN_STOCK",
          quantityPairs: qty,
          employeeId: assignedEmployeeId || null,
          notes: assignedEmployeeId
            ? `Production batch initiated in Cutting department by ${employee?.name}`
            : "Production batch created and placed in Cutting intermediate stock",
        },
      });

      return created;
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/articles error:", error);
    return NextResponse.json({ error: error.message || "Failed to create article" }, { status: 500 });
  }
}
