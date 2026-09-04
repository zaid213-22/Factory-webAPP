import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let dateFilter: any = {};
    if (startDateParam || endDateParam) {
      dateFilter = {
        timestamp: {
          ...(startDateParam && { gte: new Date(startDateParam) }),
          ...(endDateParam && { lte: new Date(endDateParam) }),
        },
      };
    }

    // 1. Fetch all articles
    const articles = await prisma.article.findMany({
      include: {
        assignedEmployee: true,
        materials: true,
      },
    });

    // 2. Fetch all employees
    const employees = await prisma.employee.findMany({
      include: {
        stageLogsPerformed: {
          where: dateFilter,
        },
        materialsLogged: true,
      },
    });

    // 3. Fetch all stage logs
    const stageLogs = await prisma.articleStageLog.findMany({
      where: dateFilter,
      include: {
        operator: true,
        article: true,
      },
    });

    // 4. Fetch all materials
    const materials = await prisma.materialLog.findMany();

    // KPI Calculations
    const totalArticles = articles.length;
    const completedArticles = articles.filter((a) => a.status === "COMPLETED");
    const completedPairs = completedArticles.reduce((sum, a) => sum + a.totalQuantityPairs, 0);

    const inProgressArticles = articles.filter((a) => a.status === "IN_PROGRESS");
    const inProgressPairs = inProgressArticles.reduce((sum, a) => sum + a.totalQuantityPairs, 0);

    const stockedArticles = articles.filter((a) => a.status === "STOCKED");
    const stockedPairs = stockedArticles.reduce((sum, a) => sum + a.totalQuantityPairs, 0);

    const totalMaterialCost = materials.reduce((sum, m) => sum + m.totalCost, 0);
    const totalPairsTracked = articles.reduce((sum, a) => sum + a.totalQuantityPairs, 0);
    const avgCostPerPair = totalPairsTracked > 0 ? totalMaterialCost / totalPairsTracked : 0;

    const activeEmployees = employees.filter((e) => e.status === "ACTIVE").length;

    // Stock by Department / Stage Breakdown
    const stockByStage = {
      CUTTING: 0,
      UPPER: 0,
      BOTTOM: 0,
      FINISH: 0,
      FINISHED_GOODS: 0,
    };

    articles.forEach((art) => {
      if (art.status === "STOCKED" && art.stockStage) {
        if (stockByStage[art.stockStage as keyof typeof stockByStage] !== undefined) {
          stockByStage[art.stockStage as keyof typeof stockByStage] += art.totalQuantityPairs;
        }
      } else if (art.status === "COMPLETED") {
        stockByStage.FINISHED_GOODS += art.totalQuantityPairs;
      }
    });

    // WIP by Stage Breakdown
    const wipByStage = {
      CUTTING: 0,
      UPPER: 0,
      BOTTOM: 0,
      FINISH: 0,
    };

    articles.forEach((art) => {
      if (art.status === "IN_PROGRESS" && wipByStage[art.currentStage as keyof typeof wipByStage] !== undefined) {
        wipByStage[art.currentStage as keyof typeof wipByStage] += art.totalQuantityPairs;
      }
    });

    // Material Cost Breakdown by Department
    const costByDepartment = {
      CUTTING: 0,
      UPPER: 0,
      BOTTOM: 0,
      FINISH: 0,
    };

    materials.forEach((m) => {
      if (costByDepartment[m.department as keyof typeof costByDepartment] !== undefined) {
        costByDepartment[m.department as keyof typeof costByDepartment] += m.totalCost;
      }
    });

    // Employee Productivity Leaderboard
    const employeeProductivity = employees.map((emp) => {
      // Completed stage transitions
      const completedEvents = emp.stageLogsPerformed.filter(
        (log) => log.actionTaken === "FORWARDED" || log.actionTaken === "COMPLETED"
      );
      const totalPairsProcessed = completedEvents.reduce((sum, log) => sum + log.quantityPairs, 0);

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        name: emp.name,
        department: emp.department,
        status: emp.status,
        stagesCompletedCount: completedEvents.length,
        totalPairsProcessed,
      };
    });

    employeeProductivity.sort((a, b) => b.totalPairsProcessed - a.totalPairsProcessed);

    return NextResponse.json({
      overview: {
        totalArticles,
        completedArticles: completedArticles.length,
        completedPairs,
        inProgressPairs,
        stockedPairs,
        totalPairsTracked,
        totalMaterialCost: Number(totalMaterialCost.toFixed(2)),
        avgCostPerPair: Number(avgCostPerPair.toFixed(2)),
        totalEmployees: employees.length,
        activeEmployees,
      },
      stockByStage,
      wipByStage,
      costByDepartment: {
        CUTTING: Number(costByDepartment.CUTTING.toFixed(2)),
        UPPER: Number(costByDepartment.UPPER.toFixed(2)),
        BOTTOM: Number(costByDepartment.BOTTOM.toFixed(2)),
        FINISH: Number(costByDepartment.FINISH.toFixed(2)),
      },
      employeeProductivity,
      recentStageLogs: stageLogs.slice(0, 15),
    });
  } catch (error: any) {
    console.error("GET /api/analytics error:", error);
    return NextResponse.json({ error: error.message || "Failed to calculate analytics" }, { status: 500 });
  }
}
