import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get("articleId");
    const department = searchParams.get("department");

    const where: any = {};
    if (articleId && articleId !== "ALL") where.articleId = articleId;
    if (department && department !== "ALL") where.department = department;

    const materials = await prisma.materialLog.findMany({
      where,
      include: {
        article: {
          select: {
            id: true,
            articleCode: true,
            name: true,
            totalQuantityPairs: true,
            currentStage: true,
          },
        },
        loggedBy: {
          select: {
            id: true,
            name: true,
            employeeCode: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(materials);
  } catch (error: any) {
    console.error("GET /api/materials error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch materials" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Helper to resolve article ID from articleId or manualArticleCode
    let resolvedArticleId = body.articleId;

    if (!resolvedArticleId && body.manualArticleCode && body.manualArticleCode.trim()) {
      const code = body.manualArticleCode.trim().toUpperCase();
      const name = (body.manualArticleName || `Batch ${code}`).trim();

      // Check if article with this code already exists
      let existingArticle = await prisma.article.findUnique({
        where: { articleCode: code },
      });

      if (!existingArticle) {
        existingArticle = await prisma.article.create({
          data: {
            articleCode: code,
            name: name,
            totalQuantityPairs: Number(body.totalQuantityPairs) || 50,
            currentStage: (body.department || "CUTTING").trim().toUpperCase(),
            status: "IN_PROGRESS",
          },
        });
      }
      resolvedArticleId = existingArticle.id;
    }

    if (!resolvedArticleId) {
      return NextResponse.json(
        { error: "Target article is required. Either select an article or enter an Article Code manually." },
        { status: 400 }
      );
    }

    // Check if multi-material batch format
    if (body.items && Array.isArray(body.items) && body.items.length > 0) {
      const { department, loggedByEmployeeId, defaultNotes, items } = body;

      if (!department) {
        return NextResponse.json(
          { error: "Department is required" },
          { status: 400 }
        );
      }

      const validRecords: any[] = [];
      for (const item of items) {
        if (!item.materialName || !item.materialName.trim()) continue;

        const price = parseFloat(item.unitPrice);
        const qty = parseFloat(item.quantityUsed);

        if (isNaN(price) || isNaN(qty) || price < 0 || qty <= 0) continue;

        const totalCost = Number((price * qty).toFixed(2));
        validRecords.push({
          articleId: resolvedArticleId,
          department: (item.department || department).trim().toUpperCase(),
          materialName: item.materialName.trim(),
          unit: item.unit ? item.unit.trim() : "units",
          unitPrice: price,
          quantityUsed: qty,
          totalCost,
          loggedByEmployeeId: loggedByEmployeeId || null,
          notes: item.notes ? item.notes.trim() : defaultNotes ? defaultNotes.trim() : null,
        });
      }

      if (validRecords.length === 0) {
        return NextResponse.json(
          { error: "At least one valid material with positive quantity and price is required" },
          { status: 400 }
        );
      }

      const created = await prisma.$transaction(
        validRecords.map((data) =>
          prisma.materialLog.create({
            data,
            include: { article: true, loggedBy: true },
          })
        )
      );

      return NextResponse.json({ success: true, count: created.length, materials: created }, { status: 201 });
    }

    // Single material item fallback
    const {
      department,
      materialName,
      unit,
      unitPrice,
      quantityUsed,
      loggedByEmployeeId,
      notes,
    } = body;

    if (!department || !materialName || unitPrice === undefined || quantityUsed === undefined) {
      return NextResponse.json(
        { error: "department, materialName, unitPrice, and quantityUsed are required" },
        { status: 400 }
      );
    }

    const price = parseFloat(unitPrice);
    const qty = parseFloat(quantityUsed);

    if (isNaN(price) || isNaN(qty) || price < 0 || qty < 0) {
      return NextResponse.json({ error: "Price and quantity must be valid non-negative numbers" }, { status: 400 });
    }

    const totalCost = Number((price * qty).toFixed(2));

    const materialLog = await prisma.materialLog.create({
      data: {
        articleId: resolvedArticleId,
        department: department.trim().toUpperCase(),
        materialName: materialName.trim(),
        unit: unit ? unit.trim() : "units",
        unitPrice: price,
        quantityUsed: qty,
        totalCost,
        loggedByEmployeeId: loggedByEmployeeId || null,
        notes: notes ? notes.trim() : null,
      },
      include: {
        article: true,
        loggedBy: true,
      },
    });

    return NextResponse.json(materialLog, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/materials error:", error);
    return NextResponse.json({ error: error.message || "Failed to create material log" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Material log ID is required" }, { status: 400 });
    }

    await prisma.materialLog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Material log entry deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete material log" }, { status: 500 });
  }
}
