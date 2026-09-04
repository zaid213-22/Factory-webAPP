import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/logbook - Query logbook entries with filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYY-MM-DD
    const department = searchParams.get("department");
    const employeeId = searchParams.get("employeeId");
    const shift = searchParams.get("shift");

    const where: any = {};

    if (employeeId && employeeId !== "ALL") {
      where.employeeId = employeeId;
    }

    if (department && department !== "ALL") {
      where.department = department;
    }

    if (shift && shift !== "ALL") {
      where.shift = shift;
    }

    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      where.date = {
        gte: start,
        lte: end,
      };
    }

    const logs = await prisma.employeeLogBook.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            name: true,
            department: true,
            phone: true,
            skillLevel: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch logbook entries" },
      { status: 500 }
    );
  }
}

// POST /api/logbook - Create a new daily logbook record
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      department,
      date,
      shift,
      attendance,
      pairsProduced,
      ratePerPair,
      overtimeHours,
      articleCode,
      remarks,
    } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!emp) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const pairs = Number(pairsProduced) || 0;
    const rate = Number(ratePerPair) || 0;
    const totalEarnings = pairs * rate;
    const overtime = Number(overtimeHours) || 0;
    const logDate = date ? new Date(date) : new Date();

    const newLog = await prisma.employeeLogBook.create({
      data: {
        employeeId,
        department: department || emp.department,
        date: logDate,
        shift: shift || "Day Shift",
        attendance: attendance || "PRESENT",
        pairsProduced: pairs,
        ratePerPair: rate,
        totalEarnings: totalEarnings,
        overtimeHours: overtime,
        articleCode: articleCode || null,
        remarks: remarks || null,
      },
      include: {
        employee: true,
      },
    });

    return NextResponse.json(newLog, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create logbook entry" },
      { status: 500 }
    );
  }
}

// DELETE /api/logbook?id=... - Delete a logbook entry
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Log entry ID is required" },
        { status: 400 }
      );
    }

    await prisma.employeeLogBook.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Logbook entry deleted" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete logbook entry" },
      { status: 500 }
    );
  }
}
