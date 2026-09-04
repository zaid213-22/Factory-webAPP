import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department");
    const status = searchParams.get("status");

    const where: any = {};
    if (department && department !== "ALL") where.department = department;
    if (status && status !== "ALL") where.status = status;

    const employees = await prisma.employee.findMany({
      where,
      include: {
        assignedArticles: {
          select: {
            id: true,
            articleCode: true,
            name: true,
            currentStage: true,
            status: true,
            totalQuantityPairs: true,
          },
        },
        _count: {
          select: {
            stageLogsPerformed: true,
            materialsLogged: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(employees);
  } catch (error: any) {
    console.error("GET /api/employees error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch employees" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeCode, name, department, status, phone, skillLevel } = body;

    if (!employeeCode || !name || !department) {
      return NextResponse.json({ error: "employeeCode, name, and department are required" }, { status: 400 });
    }

    const existing = await prisma.employee.findUnique({
      where: { employeeCode },
    });

    if (existing) {
      return NextResponse.json({ error: `Worker ID ${employeeCode} already exists` }, { status: 409 });
    }

    const employee = await prisma.employee.create({
      data: {
        employeeCode: employeeCode.trim().toUpperCase(),
        name: name.trim(),
        department: department.trim().toUpperCase(),
        status: status || "ACTIVE",
        phone: phone ? phone.trim() : null,
        skillLevel: skillLevel || "Skilled",
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/employees error:", error);
    return NextResponse.json({ error: error.message || "Failed to create employee" }, { status: 500 });
  }
}
