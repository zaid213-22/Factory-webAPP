import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.materialItem.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch catalog" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, defaultUnit, defaultPrice, department } = body;

    if (!name) {
      return NextResponse.json({ error: "Material name is required" }, { status: 400 });
    }

    const item = await prisma.materialItem.upsert({
      where: { name: name.trim() },
      update: {
        category: category || "OTHER",
        defaultUnit: defaultUnit || "units",
        defaultPrice: defaultPrice ? parseFloat(defaultPrice) : 0,
        department: department || "ALL",
      },
      create: {
        name: name.trim(),
        category: category || "OTHER",
        defaultUnit: defaultUnit || "units",
        defaultPrice: defaultPrice ? parseFloat(defaultPrice) : 0,
        department: department || "ALL",
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save catalog item" }, { status: 500 });
  }
}
