import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        assignedArticles: true,
        stageLogsPerformed: {
          include: {
            article: true,
          },
          orderBy: { timestamp: "desc" },
          take: 50,
        },
        materialsLogged: {
          include: {
            article: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch employee" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, department, status, phone, skillLevel } = body;

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(department && { department: department.trim().toUpperCase() }),
        ...(status && { status }),
        ...(phone !== undefined && { phone: phone ? phone.trim() : null }),
        ...(skillLevel !== undefined && { skillLevel }),
      },
    });

    return NextResponse.json(employee);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update employee" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.employee.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Employee deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete employee" }, { status: 500 });
  }
}
