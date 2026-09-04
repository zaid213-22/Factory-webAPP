import { prisma } from "./prisma";
import { DEPARTMENTS, DepartmentCode, ArticleStage } from "./types";

export interface StageTransitionParams {
  articleId: string;
  completedByEmployeeId?: string | null;
  action: "FORWARD" | "HOLD_IN_STOCK";
  nextEmployeeId?: string | null;
  stockLocation?: string | null;
  notes?: string | null;
  materials?: Array<{
    materialName: string;
    unit: string;
    unitPrice: number;
    quantityUsed: number;
    notes?: string;
  }>;
}

export interface AssignArticleParams {
  articleId: string;
  employeeId: string;
  notes?: string;
}

export class WorkflowEngine {
  /**
   * Execute stage completion with the core factory decision:
   * (A) Forward to next department worker OR
   * (B) Hold in intermediate stock
   */
  static async transitionStage(params: StageTransitionParams) {
    const {
      articleId,
      completedByEmployeeId,
      action,
      nextEmployeeId,
      stockLocation,
      notes,
      materials,
    } = params;

    return await prisma.$transaction(async (tx) => {
      const article = await tx.article.findUnique({
        where: { id: articleId },
        include: { assignedEmployee: true },
      });

      if (!article) {
        throw new Error("Article not found");
      }

      if (article.status === "COMPLETED") {
        throw new Error("Article is already completed");
      }

      const currentStageCode = article.currentStage as DepartmentCode;
      const deptMeta = DEPARTMENTS[currentStageCode];

      if (!deptMeta) {
        throw new Error(`Invalid stage: ${article.currentStage}`);
      }

      // 1. Log any materials entered during this stage completion
      if (materials && materials.length > 0) {
        for (const mat of materials) {
          const totalCost = Number((mat.unitPrice * mat.quantityUsed).toFixed(2));
          await tx.materialLog.create({
            data: {
              articleId: article.id,
              department: currentStageCode,
              materialName: mat.materialName,
              unit: mat.unit,
              unitPrice: mat.unitPrice,
              quantityUsed: mat.quantityUsed,
              totalCost,
              loggedByEmployeeId: completedByEmployeeId || null,
              notes: mat.notes || null,
            },
          });
        }
      }

      // 2. Handle Action Branches
      if (action === "HOLD_IN_STOCK") {
        // Option B: Hold in stock at current stage
        const updatedArticle = await tx.article.update({
          where: { id: article.id },
          data: {
            status: "STOCKED",
            stockStage: currentStageCode,
            stockLocation: stockLocation || `Stage ${deptMeta.stepNumber} Stock Bay`,
            assignedEmployeeId: null, // worker is now free
            notes: notes || article.notes,
          },
        });

        // Record audit trail event
        await tx.articleStageLog.create({
          data: {
            articleId: article.id,
            fromStage: currentStageCode,
            toStage: currentStageCode,
            actionTaken: "HELD_IN_STOCK",
            quantityPairs: article.totalQuantityPairs,
            employeeId: completedByEmployeeId || null,
            nextEmployeeId: null,
            notes: notes ? `Held in stock: ${notes}` : `Held in ${deptMeta.label} intermediate stock`,
          },
        });

        return updatedArticle;
      } else {
        // Option A: Forward to Next Stage
        const nextStageCode = deptMeta.nextStage;

        if (!nextStageCode) {
          throw new Error(`No subsequent stage exists after ${currentStageCode}`);
        }

        if (nextStageCode === "COMPLETED") {
          // Finished all 4 departments -> Move to Finished Goods Inventory
          const updatedArticle = await tx.article.update({
            where: { id: article.id },
            data: {
              currentStage: "COMPLETED",
              status: "COMPLETED",
              stockStage: "FINISHED_GOODS",
              stockLocation: stockLocation || "Finished Goods Warehouse",
              assignedEmployeeId: null,
              notes: notes || article.notes,
            },
          });

          await tx.articleStageLog.create({
            data: {
              articleId: article.id,
              fromStage: currentStageCode,
              toStage: "COMPLETED",
              actionTaken: "COMPLETED",
              quantityPairs: article.totalQuantityPairs,
              employeeId: completedByEmployeeId || null,
              nextEmployeeId: null,
              notes: notes || "Finished production run. Transferred to Finished Goods.",
            },
          });

          return updatedArticle;
        } else {
          // Forwarding to Upper / Bottom / Finish
          // Validate next employee if provided
          if (nextEmployeeId) {
            const nextWorker = await tx.employee.findUnique({
              where: { id: nextEmployeeId },
            });
            if (nextWorker && nextWorker.department !== nextStageCode) {
              throw new Error(
                `Target worker ${nextWorker.name} belongs to ${nextWorker.department}, but next stage is ${nextStageCode}`
              );
            }
          }

          const updatedArticle = await tx.article.update({
            where: { id: article.id },
            data: {
              currentStage: nextStageCode,
              status: "IN_PROGRESS",
              stockStage: null,
              stockLocation: null,
              assignedEmployeeId: nextEmployeeId || null,
              notes: notes || article.notes,
            },
          });

          await tx.articleStageLog.create({
            data: {
              articleId: article.id,
              fromStage: currentStageCode,
              toStage: nextStageCode,
              actionTaken: "FORWARDED",
              quantityPairs: article.totalQuantityPairs,
              employeeId: completedByEmployeeId || null,
              nextEmployeeId: nextEmployeeId || null,
              notes: notes || `Forwarded from ${deptMeta.label} to ${DEPARTMENTS[nextStageCode as DepartmentCode]?.label || nextStageCode}`,
            },
          });

          return updatedArticle;
        }
      }
    });
  }

  /**
   * Assign an article to an employee (e.g. from stock or fresh start)
   */
  static async assignArticle(params: AssignArticleParams) {
    const { articleId, employeeId, notes } = params;

    return await prisma.$transaction(async (tx) => {
      const [article, employee] = await Promise.all([
        tx.article.findUnique({ where: { id: articleId } }),
        tx.employee.findUnique({ where: { id: employeeId } }),
      ]);

      if (!article) throw new Error("Article not found");
      if (!employee) throw new Error("Employee not found");

      if (employee.department !== article.currentStage) {
        throw new Error(
          `Worker ${employee.name} is in ${employee.department} department, cannot work on ${article.currentStage} stage article`
        );
      }

      const wasInStock = article.status === "STOCKED";

      const updatedArticle = await tx.article.update({
        where: { id: article.id },
        data: {
          assignedEmployeeId: employee.id,
          status: "IN_PROGRESS",
          stockStage: null,
          stockLocation: null,
        },
      });

      await tx.articleStageLog.create({
        data: {
          articleId: article.id,
          fromStage: article.currentStage,
          toStage: article.currentStage,
          actionTaken: wasInStock ? "PULLED_FROM_STOCK" : "STARTED",
          quantityPairs: article.totalQuantityPairs,
          employeeId: employee.id,
          notes: notes || (wasInStock ? `Pulled from stock by ${employee.name}` : `Assigned to ${employee.name}`),
        },
      });

      return updatedArticle;
    });
  }

  /**
   * Unassign an article if entered by mistake
   */
  static async unassignArticle(articleId: string) {
    return await prisma.article.update({
      where: { id: articleId },
      data: {
        assignedEmployeeId: null,
      },
    });
  }

  /**
   * Get full audit trail and cost summary for an article
   */
  static async getArticleJourney(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        assignedEmployee: true,
        stageLogs: {
          include: {
            operator: true,
            nextOperator: true,
          },
          orderBy: { timestamp: "asc" },
        },
        materials: {
          include: {
            loggedBy: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!article) return null;

    const totalMaterialCost = article.materials.reduce((sum, m) => sum + m.totalCost, 0);
    const costPerPair = article.totalQuantityPairs > 0 ? totalMaterialCost / article.totalQuantityPairs : 0;

    // Cost breakdown by department
    const costByDept: Record<string, number> = {
      CUTTING: 0,
      UPPER: 0,
      BOTTOM: 0,
      FINISH: 0,
    };

    article.materials.forEach((m) => {
      if (costByDept[m.department] !== undefined) {
        costByDept[m.department] += m.totalCost;
      }
    });

    return {
      ...article,
      totalMaterialCost: Number(totalMaterialCost.toFixed(2)),
      costPerPair: Number(costPerPair.toFixed(2)),
      costByDept,
    };
  }
}
