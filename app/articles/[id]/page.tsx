"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { 
  Package, 
  ArrowLeft, 
  Layers, 
  Printer, 
  Clock, 
  User, 
  Archive, 
  CheckCircle2, 
  Calendar, 
  Calculator, 
  ArrowRight,
  TrendingUp,
  MapPin,
  Boxes,
  FileText,
  Sparkles
} from "lucide-react";
import { DEPARTMENT_LIST, DepartmentCode, DEPARTMENTS, CURRENCY, formatCurrency } from "@/lib/types";

interface JourneyData {
  id: string;
  articleCode: string;
  name: string;
  currentStage: DepartmentCode | "COMPLETED";
  status: "IN_PROGRESS" | "STOCKED" | "COMPLETED";
  totalQuantityPairs: number;
  stockStage?: string | null;
  stockLocation?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  totalMaterialCost: number;
  costPerPair: number;
  costByDept: Record<string, number>;
  assignedEmployee?: {
    id: string;
    name: string;
    employeeCode: string;
    department: string;
  } | null;
  stageLogs: Array<{
    id: string;
    fromStage: string;
    toStage: string;
    actionTaken: string;
    quantityPairs: number;
    notes?: string | null;
    timestamp: string;
    operator?: {
      name: string;
      employeeCode: string;
      department: string;
    } | null;
    nextOperator?: {
      name: string;
      employeeCode: string;
      department: string;
    } | null;
  }>;
  materials: Array<{
    id: string;
    materialName: string;
    department: string;
    unit: string;
    unitPrice: number;
    quantityUsed: number;
    totalCost: number;
    notes?: string | null;
    createdAt: string;
    loggedBy?: {
      name: string;
      employeeCode: string;
    } | null;
  }>;
}

export default function ArticleJourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [article, setArticle] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchArticleJourney = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/articles/${id}`);
      if (res.ok) {
        const data = await res.json();
        setArticle(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticleJourney();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-ink-muted text-sm">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-3" />
        Loading article journey and audit logs...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-8 text-center panel rounded-md space-y-3">
        <Package className="w-10 h-10 text-stone-400 mx-auto" />
        <h3 className="text-sm font-semibold text-ink">Article Not Found</h3>
        <p className="text-sm text-ink-muted">The requested article production run could not be found.</p>
        <Link href="/articles" className="inline-block text-sm text-orange-400 hover:underline font-medium">
          ← Back to Articles
        </Link>
      </div>
    );
  }

  const currentDeptMeta =
    article.currentStage !== "COMPLETED"
      ? DEPARTMENTS[article.currentStage as DepartmentCode]
      : null;

  return (
    <div className="space-y-6">
      {/* Printable Factory Header (Visible only on physical print) */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black">HIMALAYA UDHYOG</h1>
            <p className="text-sm font-semibold">FOOTWEAR FACTORY TRAVELER & ROUTING CARD</p>
          </div>
          <div className="text-right">
            <span className="text-lg tabular-nums font-semibold border-2 border-black px-3 py-1 inline-block">
              {article.articleCode}
            </span>
            <p className="text-xs mt-1">Date: {new Date(article.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Header with Navigation & Print Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-ui pb-5 no-print">
        <div className="flex items-center gap-3">
          <Link
            href="/articles"
            className="p-2.5 rounded-md bg-white border border-border-ui hover:border-orange-500/40 text-ink hover:text-ink transition-all active:scale-95"
            title="Back to Articles"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="tabular-nums text-xs font-medium text-accent bg-accent/10 px-2.5 py-0.5 rounded-md border border-accent/20">
                {article.articleCode}
              </span>
              <h1 className="text-xl font-semibold text-ink">{article.name}</h1>
            </div>
            <p className="text-xs text-ink-muted mt-1 font-medium">
              Started on {new Date(article.createdAt).toLocaleString()} • {article.totalQuantityPairs} Pairs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-white border border-border-ui hover:border-orange-500/40 text-xs font-medium text-ink transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 text-orange-400" />
            <span>Print Travel Card</span>
          </button>

          <Link
            href="/workflow"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-accent hover:bg-accent-hover text-white font-medium text-xs shadow-sm ring-2 ring-accent/20 transition-all active:scale-95"
          >
            <Layers className="w-4 h-4" />
            <span>Stage Board</span>
          </Link>
        </div>
      </div>

      {/* Production Run Overview Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="panel p-4 space-y-1">
          <span className="text-[10px] font-medium text-ink-muted block mb-1">
            Current Stage
          </span>
          {currentDeptMeta ? (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: currentDeptMeta.color }} />
              <span className="font-semibold text-ink text-base">{currentDeptMeta.label}</span>
            </div>
          ) : (
            <span className="font-semibold text-emerald-700 text-base">Finished Goods Warehouse</span>
          )}
          <span className="text-xs text-ink-muted mt-1 block font-medium">
            Status: <strong className="text-ink">{article.status}</strong>
          </span>
        </div>

        <div className="panel p-4 space-y-1">
          <span className="text-[10px] font-medium text-ink-muted block mb-1">
            Batch Size
          </span>
          <span className="text-3xl font-black text-ink tabular-nums">{article.totalQuantityPairs}</span>
          <span className="text-xs text-ink-muted ml-1.5 font-semibold">Pairs</span>
        </div>

        <div className="panel p-4 space-y-1">
          <span className="text-[10px] font-medium text-ink-muted block mb-1">
            Total Material Cost
          </span>
          <span className="text-3xl font-black text-orange-400 tabular-nums">
            {formatCurrency(article.totalMaterialCost)}
          </span>
        </div>

        <div className="panel p-4 space-y-1">
          <span className="text-[10px] font-medium text-ink-muted block mb-1">
            Cost Per Pair
          </span>
          <span className="text-3xl font-black text-ink tabular-nums">
            {formatCurrency(article.costPerPair)}
          </span>
          <span className="text-xs text-ink-muted ml-1.5 font-semibold">/ pair</span>
        </div>
      </div>

      {/* VISUAL STAGE STEPPER PIPELINE */}
      <div className="panel p-5 space-y-4">
        <h3 className="text-[10px] font-medium text-ink-muted">
          Cross-Department Production Pipeline
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {DEPARTMENT_LIST.map((dept) => {
            const isCompleted =
              article.currentStage === "COMPLETED" ||
              (currentDeptMeta && dept.stepNumber < currentDeptMeta.stepNumber);
            const isCurrent = article.currentStage === dept.code;

            return (
              <div
                key={dept.code}
                className={`p-4 rounded-md border flex flex-col justify-between space-y-2 relative transition-all ${
                  isCurrent
                    ? "bg-accent/5 border-orange-500  ring-2 ring-orange-500/30 scale-[1.02]"
                    : isCompleted
                    ? "bg-white/90 border-emerald-500/40"
                    : "bg-white/50 border-stone-100 opacity-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium tabular-nums text-ink-muted">
                    STAGE 0{dept.stepNumber}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  ) : isCurrent ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-ink text-sm">{dept.label}</h4>
                  <span className="text-xs text-ink-muted font-medium">{dept.workerTitle}</span>
                </div>

                <div className="pt-2 border-t border-stone-100 text-[11px] text-ink-muted flex items-center justify-between font-medium">
                  <span>Logged Cost:</span>
                  <span className="tabular-nums font-medium text-ink">
                    {formatCurrency(article.costByDept[dept.code] || 0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHRONOLOGICAL AUDIT TRAIL LOG */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Department Journey Timeline</h3>
            <span className="text-xs text-ink-muted font-medium">
              {article.stageLogs.length} Hand-off Events Logged
            </span>
          </div>

          <div className="space-y-3">
            {article.stageLogs.length === 0 ? (
              <div className="p-8 text-center panel border-dashed rounded-md text-ink-muted text-xs italic">
                No stage logs recorded yet.
              </div>
            ) : (
              article.stageLogs.map((log) => {
                const isForward = log.actionTaken === "FORWARDED" || log.actionTaken === "COMPLETED";
                const isStocked = log.actionTaken === "HELD_IN_STOCK";

                return (
                  <div
                    key={log.id}
                    className="panel rounded-md p-4 space-y-3 transition-all relative pl-6 hover:border-white/[0.15]"
                  >
                    {/* Left vertical timeline line indicator */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
                        isStocked
                          ? "bg-purple-500"
                          : isForward
                          ? "bg-emerald-500"
                          : "bg-orange-500"
                      }`}
                    />

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-md font-medium ${
                            isStocked
                              ? "bg-violet-50 text-violet-700 border-violet-200"
                              : isForward
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-700/60"
                              : "bg-teal-50 text-teal-700 border-teal-200"
                          }`}
                        >
                          {log.actionTaken}
                        </span>

                        <span className="text-xs font-medium text-ink">
                          {log.fromStage} → {log.toStage}
                        </span>
                      </div>

                      <span className="text-[11px] tabular-nums text-ink-muted flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-ink font-medium">
                      {log.notes || "Stage transition executed."}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-100 text-ink-muted">
                      <span>
                        Operator: <strong className="text-ink">{log.operator ? log.operator.name : "Factory Floor"}</strong>
                      </span>
                      {log.nextOperator && (
                        <span>
                          Passed To: <strong className="text-ink">{log.nextOperator.name}</strong>
                        </span>
                      )}
                      <span className="tabular-nums font-medium text-ink">
                        {log.quantityPairs} Pairs
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 Col: Material Consumption Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Materials Consumed</h3>
            <span className="text-xs tabular-nums font-semibold text-orange-400">
              {formatCurrency(article.totalMaterialCost)}
            </span>
          </div>

          <div className="panel rounded-md p-4 space-y-3">
            {article.materials.length === 0 ? (
              <div className="text-center py-6 text-stone-400 text-xs italic">
                No materials logged for this article yet.
              </div>
            ) : (
              article.materials.map((mat) => (
                <div
                  key={mat.id}
                  className="p-3 rounded-md bg-white/80 border border-stone-100 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">{mat.materialName}</span>
                    <span className="tabular-nums font-semibold text-orange-400">{formatCurrency(mat.totalCost)}</span>
                  </div>
                  <div className="flex items-center justify-between text-ink-muted text-[11px]">
                    <span>
                      {mat.quantityUsed} {mat.unit} @ {formatCurrency(mat.unitPrice)}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-border-ui font-medium text-ink">
                      {mat.department}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Printable Sign-off Table (Visible on physical print) */}
      <div className="hidden print:block mt-8 pt-4 border-t-2 border-black">
        <h4 className="font-medium uppercase text-sm mb-3">Stage Inspection & Sign-Off Signatures</h4>
        <table className="w-full text-xs border border-black text-left">
          <thead>
            <tr className="border-b border-black">
              <th className="p-2 border-r border-black">Department</th>
              <th className="p-2 border-r border-black">Technician Name</th>
              <th className="p-2 border-r border-black">Pairs Checked</th>
              <th className="p-2 border-r border-black">Defect Count</th>
              <th className="p-2">Supervisor Signature</th>
            </tr>
          </thead>
          <tbody>
            {DEPARTMENT_LIST.map((dept) => (
              <tr key={dept.code} className="border-b border-black h-12">
                <td className="p-2 border-r border-black font-medium">{dept.label}</td>
                <td className="p-2 border-r border-black"></td>
                <td className="p-2 border-r border-black">{article.totalQuantityPairs}</td>
                <td className="p-2 border-r border-black"></td>
                <td className="p-2"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
