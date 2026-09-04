"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  BarChart3, 
  Layers, 
  Users, 
  Package, 
  Calculator, 
  TrendingUp, 
  Archive, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  RefreshCw, 
  Boxes, 
  Award, 
  Calendar,
  Sparkles,
  ArrowUpRight,
  TrendingDown
} from "lucide-react";
import { DEPARTMENT_LIST, DepartmentCode, DEPARTMENTS, CURRENCY, formatCurrency } from "@/lib/types";

interface AnalyticsData {
  overview: {
    totalArticles: number;
    completedArticles: number;
    completedPairs: number;
    inProgressPairs: number;
    stockedPairs: number;
    totalPairsTracked: number;
    totalMaterialCost: number;
    avgCostPerPair: number;
    totalEmployees: number;
    activeEmployees: number;
  };
  stockByStage: {
    CUTTING: number;
    UPPER: number;
    BOTTOM: number;
    FINISH: number;
    FINISHED_GOODS: number;
  };
  wipByStage: {
    CUTTING: number;
    UPPER: number;
    BOTTOM: number;
    FINISH: number;
  };
  costByDepartment: {
    CUTTING: number;
    UPPER: number;
    BOTTOM: number;
    FINISH: number;
  };
  employeeProductivity: Array<{
    id: string;
    employeeCode: string;
    name: string;
    department: string;
    status: string;
    stagesCompletedCount: number;
    totalPairsProcessed: number;
  }>;
  recentStageLogs: Array<{
    id: string;
    fromStage: string;
    toStage: string;
    actionTaken: string;
    quantityPairs: number;
    timestamp: string;
    notes?: string | null;
    operator?: {
      name: string;
      employeeCode: string;
    } | null;
    article?: {
      articleCode: string;
      name: string;
    } | null;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("TODAY");

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      const now = new Date();
      if (dateRange === "TODAY") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        params.append("startDate", startOfDay.toISOString());
      } else if (dateRange === "WEEK") {
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        params.append("startDate", startOfWeek.toISOString());
      } else if (dateRange === "MONTH") {
        const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        params.append("startDate", startOfMonth.toISOString());
      }

      const res = await fetch(`/api/analytics?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const overview = data?.overview || {
    totalArticles: 0,
    completedArticles: 0,
    completedPairs: 0,
    inProgressPairs: 0,
    stockedPairs: 0,
    totalPairsTracked: 0,
    totalMaterialCost: 0,
    avgCostPerPair: 0,
    totalEmployees: 0,
    activeEmployees: 0,
  };

  const stockByStage = data?.stockByStage || {
    CUTTING: 0,
    UPPER: 0,
    BOTTOM: 0,
    FINISH: 0,
    FINISHED_GOODS: 0,
  };

  const costByDept = data?.costByDepartment || {
    CUTTING: 0,
    UPPER: 0,
    BOTTOM: 0,
    FINISH: 0,
  };

  const totalStockAndWIP =
    overview.inProgressPairs + overview.stockedPairs + overview.completedPairs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-ui pb-5">
        <div>
          <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Production metrics, department inventory, worker efficiency, and material costs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex items-center border border-border-ui rounded-md p-0.5">
            {(["ALL", "TODAY", "WEEK", "MONTH"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  dateRange === range
                    ? "bg-accent text-white"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {range === "ALL" ? "All Time" : range === "TODAY" ? "Today" : range === "WEEK" ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-md border border-border-ui text-ink-muted hover:text-ink transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/workflow"
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent hover:bg-accent-hover text-white font-medium text-xs shadow-sm ring-2 ring-accent/20 transition-all active:scale-95"
          >
            <Layers className="w-4 h-4" />
            <span>Open Stage Board</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Floor WIP */}
        <div className="panel p-4 space-y-1">
          <span className="text-xs text-ink-muted">Floor WIP Pairs</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-ink">
              {overview.inProgressPairs.toLocaleString()}
            </span>
            <span className="text-xs text-ink-muted">on floor</span>
          </div>
          <p className="text-[11px] text-ink-muted">Active across 4 departments</p>
        </div>

        {/* Intermediate Stock */}
        <div className="panel p-4 space-y-1">
          <span className="text-xs text-ink-muted">Intermediate Stock</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-ink">
              {overview.stockedPairs.toLocaleString()}
            </span>
            <span className="text-xs text-ink-muted">in buffer</span>
          </div>
          <p className="text-[11px] text-ink-muted">Ready for next department</p>
        </div>

        {/* Material Cost */}
        <div className="panel p-4 space-y-1">
          <span className="text-xs text-ink-muted">Total Material Cost</span>
          <div>
            <span className="text-2xl font-semibold tabular-nums text-ink">
              {formatCurrency(overview.totalMaterialCost)}
            </span>
          </div>
          <p className="text-[11px] text-ink-muted">
            Avg: <strong className="text-ink tabular-nums">{formatCurrency(overview.avgCostPerPair)}</strong> / pair
          </p>
        </div>

        {/* Active Workforce */}
        <div className="panel p-4 space-y-1">
          <span className="text-xs text-ink-muted">Active Operators</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-ink">
              {overview.activeEmployees}
            </span>
            <span className="text-xs text-ink-muted">/ {overview.totalEmployees} registered</span>
          </div>
          <p className="text-[11px] text-ink-muted">
            {overview.totalEmployees > 0
              ? `${((overview.activeEmployees / overview.totalEmployees) * 100).toFixed(0)}% capacity`
              : "No workers registered yet"}
          </p>
        </div>
      </div>

      {/* Stock Breakdown + Worker Productivity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock Level by Stage */}
        <div className="panel p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border-ui pb-3">
              <h3 className="font-semibold text-sm text-ink">Stage Stock Distribution</h3>
              <Link
                href="/articles"
                className="text-xs text-accent hover:underline font-medium"
              >
                Stock Detail
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {/* Cutting Stock */}
              <div className="space-y-1 p-2.5 rounded-md bg-stone-50 border border-stone-100">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#0d9488" }} />
                    <span className="text-ink">Cutting Intermediate Stock</span>
                  </div>
                  <span className="font-semibold tabular-nums text-ink">
                    {stockByStage.CUTTING} <span className="font-normal text-ink-muted">Pairs</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${totalStockAndWIP > 0 ? (stockByStage.CUTTING / totalStockAndWIP) * 100 : 0}%`,
                      backgroundColor: "#0d9488",
                    }}
                  />
                </div>
              </div>

              {/* Upper Stock */}
              <div className="space-y-1 p-2.5 rounded-md bg-stone-50 border border-stone-100">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#6366f1" }} />
                    <span className="text-ink">Upper Intermediate Stock</span>
                  </div>
                  <span className="font-semibold tabular-nums text-ink">
                    {stockByStage.UPPER} <span className="font-normal text-ink-muted">Pairs</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${totalStockAndWIP > 0 ? (stockByStage.UPPER / totalStockAndWIP) * 100 : 0}%`,
                      backgroundColor: "#6366f1",
                    }}
                  />
                </div>
              </div>

              {/* Bottom Stock */}
              <div className="space-y-1 p-2.5 rounded-md bg-stone-50 border border-stone-100">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#d97706" }} />
                    <span className="text-ink">Bottom Intermediate Stock</span>
                  </div>
                  <span className="font-semibold tabular-nums text-ink">
                    {stockByStage.BOTTOM} <span className="font-normal text-ink-muted">Pairs</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${totalStockAndWIP > 0 ? (stockByStage.BOTTOM / totalStockAndWIP) * 100 : 0}%`,
                      backgroundColor: "#d97706",
                    }}
                  />
                </div>
              </div>

              {/* Finished Goods */}
              <div className="space-y-1 p-2.5 rounded-md bg-emerald-50 border border-emerald-100">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-medium text-emerald-800">Finished Goods (Warehouse)</span>
                  </div>
                  <span className="font-semibold tabular-nums text-emerald-700">
                    {stockByStage.FINISHED_GOODS} <span className="font-normal text-ink-muted">Pairs</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{
                      width: `${totalStockAndWIP > 0 ? (stockByStage.FINISHED_GOODS / totalStockAndWIP) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="p-3 rounded-md bg-stone-50 border border-stone-200 flex items-center justify-between text-xs mt-2">
            <span className="text-ink-muted">Ready to assign buffer stock back to technicians?</span>
            <Link
              href="/workflow"
              className="font-medium text-accent hover:underline"
            >
              Assign on Board
            </Link>
          </div>
        </div>

        {/* Worker Productivity Leaderboard */}
        <div className="panel p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border-ui pb-3">
              <h3 className="font-semibold text-sm text-ink">Worker Productivity</h3>
              <Link
                href="/employees"
                className="text-xs text-accent hover:underline font-medium"
              >
                All Workers
              </Link>
            </div>

            <div className="mt-4 space-y-2">
              {!data?.employeeProductivity || data.employeeProductivity.length === 0 ? (
                <div className="py-10 text-center text-xs text-ink-muted italic bg-stone-50 rounded-md border border-dashed border-stone-200 p-4">
                  No employee output recorded yet. Add workers and process production batches.
                </div>
              ) : (
                data.employeeProductivity.slice(0, 5).map((emp, index) => {
                  const deptMeta = DEPARTMENTS[emp.department as DepartmentCode] || DEPARTMENTS.CUTTING;

                  return (
                    <div
                      key={emp.id}
                      className="p-2.5 rounded-md bg-stone-50 border border-stone-100 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-semibold text-ink-muted w-5 text-center tabular-nums">
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-ink text-sm">{emp.name}</span>
                            <span className="text-[10px] text-ink-muted">({emp.employeeCode})</span>
                          </div>
                          <span className="text-[10px] text-ink-muted">
                            {deptMeta.workerTitle}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-semibold tabular-nums text-sm text-ink">
                          {emp.totalPairsProcessed} Pairs
                        </span>
                        <span className="text-[10px] text-ink-muted block">
                          {emp.stagesCompletedCount} hand-offs
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-2.5 rounded-md bg-stone-50 border border-stone-100 flex items-center justify-between text-xs">
            <span className="text-ink-muted">Total Registered Workforce:</span>
            <strong className="text-ink tabular-nums">{overview.totalEmployees} Technicians</strong>
          </div>
        </div>
      </div>

      {/* Material Cost + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Material Cost Breakdown */}
        <div className="panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border-ui pb-3">
            <h3 className="font-semibold text-sm text-ink">Material Cost Share</h3>
            <Link
              href="/materials"
              className="text-xs text-accent hover:underline font-medium"
            >
              Log Costs
            </Link>
          </div>

          <div className="space-y-2.5">
            {DEPARTMENT_LIST.map((dept) => {
              const deptCost = costByDept[dept.code] || 0;
              const pct = overview.totalMaterialCost > 0 ? (deptCost / overview.totalMaterialCost) * 100 : 0;
              return (
                <div
                  key={dept.code}
                  className="p-2.5 rounded-md bg-stone-50 border border-stone-100 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color }} />
                      <span className="text-ink font-medium">{dept.workerTitle}</span>
                    </div>
                    <span className="font-semibold tabular-nums text-ink">{formatCurrency(deptCost)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-ink-muted">
                    <span>{dept.label}</span>
                    <span className="tabular-nums font-medium">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: dept.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border-ui pb-3">
            <h3 className="font-semibold text-sm text-ink">Production Activity Feed</h3>
            <span className="text-[11px] text-ink-muted">Live</span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {!data?.recentStageLogs || data.recentStageLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-ink-muted italic bg-stone-50 rounded-md border border-dashed border-stone-200 p-4">
                No production events logged yet. Once workers transition batches on the Stage Board, activity will appear here.
              </div>
            ) : (
              data.recentStageLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-md bg-stone-50 border border-stone-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        log.actionTaken === "HELD_IN_STOCK"
                          ? "bg-violet-100 text-violet-700"
                          : log.actionTaken === "FORWARDED" || log.actionTaken === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {log.actionTaken}
                    </span>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-ink tabular-nums">{log.article?.articleCode || "Article"}</strong>
                        <span className="text-ink-muted">({log.fromStage} → {log.toStage})</span>
                      </div>
                      <span className="text-[11px] text-ink-muted block">
                        {log.notes || "Stage completed"} · by <strong className="text-ink">{log.operator ? log.operator.name : "Floor Worker"}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-semibold tabular-nums text-ink block">
                      {log.quantityPairs} Pairs
                    </span>
                    <span className="text-[10px] text-ink-muted tabular-nums">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
