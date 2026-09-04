"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Layers, 
  Plus, 
  ArrowRight, 
  Archive, 
  UserCheck, 
  Clock, 
  CheckCircle, 
  Package, 
  Calculator, 
  AlertCircle, 
  X, 
  ChevronRight,
  Sparkles,
  Search,
  RefreshCw,
  Eye,
  ArrowUpRight
} from "lucide-react";
import { DEPARTMENT_LIST, DepartmentCode, ArticleStage, DEPARTMENTS, STANDARD_UNITS, CURRENCY, formatCurrency } from "@/lib/types";

interface ArticleItem {
  id: string;
  articleCode: string;
  name: string;
  currentStage: DepartmentCode | "COMPLETED";
  status: "IN_PROGRESS" | "STOCKED" | "COMPLETED";
  totalQuantityPairs: number;
  stockStage?: string | null;
  stockLocation?: string | null;
  assignedEmployeeId?: string | null;
  assignedEmployee?: {
    id: string;
    name: string;
    employeeCode: string;
    department: string;
  } | null;
  totalMaterialCost?: number;
  costPerPair?: number;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeOption {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
  status: string;
}

export default function WorkflowBoardPage() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isNewArticleOpen, setIsNewArticleOpen] = useState(false);
  const [isCompleteStageOpen, setIsCompleteStageOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(null);

  // New Article Form
  const [newArticleData, setNewArticleData] = useState<{
    articleCode: string;
    name: string;
    totalQuantityPairs: number | string;
    assignedEmployeeId: string;
    notes: string;
  }>({
    articleCode: "",
    name: "",
    totalQuantityPairs: "",
    assignedEmployeeId: "",
    notes: "",
  });

  // Stage Completion Form
  const [transitionData, setTransitionData] = useState<{
    action: "FORWARD" | "HOLD_IN_STOCK";
    nextEmployeeId: string;
    stockLocation: string;
    notes: string;
    includeMaterial: boolean;
    materialName: string;
    unit: string;
    unitPrice: number | string;
    quantityUsed: number | string;
  }>({
    action: "FORWARD",
    nextEmployeeId: "",
    stockLocation: "",
    notes: "",
    includeMaterial: false,
    materialName: "",
    unit: "sq_ft",
    unitPrice: "",
    quantityUsed: "",
  });

  // Assignment Modal Form
  const [assignWorkerId, setAssignWorkerId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resArticles, resEmployees] = await Promise.all([
        fetch("/api/articles"),
        fetch("/api/employees?status=ACTIVE"),
      ]);

      if (resArticles.ok) {
        const dataArticles = await resArticles.json();
        setArticles(dataArticles);
      }
      if (resEmployees.ok) {
        const dataEmployees = await resEmployees.json();
        setEmployees(dataEmployees);
      }
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter articles by stage and status
  const getStageArticles = (deptCode: DepartmentCode) => {
    const inProgress = articles.filter(
      (a) => a.currentStage === deptCode && a.status === "IN_PROGRESS"
    );
    const stocked = articles.filter(
      (a) => a.status === "STOCKED" && (a.stockStage === deptCode || a.currentStage === deptCode)
    );
    return { inProgress, stocked };
  };

  // Open Stage Completion Modal
  const handleOpenCompleteStage = (art: ArticleItem) => {
    setSelectedArticle(art);
    const currentDept = DEPARTMENTS[art.currentStage as DepartmentCode];
    const nextDeptCode = currentDept?.nextStage;

    let candidateWorkers: EmployeeOption[] = [];
    if (nextDeptCode && nextDeptCode !== "COMPLETED") {
      candidateWorkers = employees.filter((e) => e.department === nextDeptCode);
    }

    setTransitionData({
      action: "FORWARD",
      nextEmployeeId: candidateWorkers[0]?.id || "",
      stockLocation: `${currentDept?.label || "Stage"} Buffer Shelf A-1`,
      notes: "",
      includeMaterial: false,
      materialName: "",
      unit: "sq_ft",
      unitPrice: "",
      quantityUsed: "",
    });

    setErrorMessage("");
    setIsCompleteStageOpen(true);
  };

  // Submit Stage Transition
  const handleExecuteTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticle) return;

    try {
      setSubmitting(true);
      setErrorMessage("");

      const materials = [];
      if (
        transitionData.includeMaterial &&
        transitionData.materialName.trim() &&
        Number(transitionData.quantityUsed) > 0
      ) {
        materials.push({
          materialName: transitionData.materialName.trim(),
          unit: transitionData.unit,
          unitPrice: Number(transitionData.unitPrice) || 0,
          quantityUsed: Number(transitionData.quantityUsed) || 0,
        });
      }

      const payload = {
        articleId: selectedArticle.id,
        completedByEmployeeId: selectedArticle.assignedEmployeeId || null,
        action: transitionData.action,
        nextEmployeeId: transitionData.action === "FORWARD" ? transitionData.nextEmployeeId || null : null,
        stockLocation: transitionData.action === "HOLD_IN_STOCK" ? transitionData.stockLocation || null : null,
        notes: transitionData.notes || null,
        materials,
      };

      const res = await fetch("/api/workflow/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to complete stage");
        return;
      }

      setIsCompleteStageOpen(false);
      setSuccessMessage(
        transitionData.action === "FORWARD"
          ? `Batch ${selectedArticle.articleCode} forwarded to next department!`
          : `Batch ${selectedArticle.articleCode} placed in intermediate buffer stock.`
      );
      setTimeout(() => setSuccessMessage(""), 4000);
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Assign Modal
  const handleOpenAssign = (art: ArticleItem) => {
    setSelectedArticle(art);
    const workers = employees.filter((e) => e.department === art.currentStage);
    setAssignWorkerId(art.assignedEmployeeId || workers[0]?.id || "");
    setErrorMessage("");
    setIsAssignModalOpen(true);
  };

  // Submit Worker Assignment
  const handleExecuteAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticle) return;

    try {
      setSubmitting(true);
      setErrorMessage("");

      const res = await fetch("/api/workflow/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: selectedArticle.id,
          employeeId: assignWorkerId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to assign worker");
        return;
      }

      setIsAssignModalOpen(false);
      setSuccessMessage(`Worker assigned to article ${selectedArticle.articleCode}!`);
      setTimeout(() => setSuccessMessage(""), 4000);
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  // Direct pull from buffer stock & assign
  const handlePullFromStock = async (articleId: string, stageCode: DepartmentCode) => {
    const stageWorkers = employees.filter((e) => e.department === stageCode);
    const worker = stageWorkers.length > 0 ? stageWorkers[0].id : null;

    try {
      const res = await fetch("/api/workflow/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          employeeId: worker,
          pullFromStock: true,
        }),
      });

      if (res.ok) {
        setSuccessMessage("Pulled from intermediate stock to active production floor!");
        setTimeout(() => setSuccessMessage(""), 4000);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open New Article Form
  const handleOpenNewArticle = () => {
    const cuttingWorkers = employees.filter((e) => e.department === "CUTTING");
    setNewArticleData({
      articleCode: `ART-${Math.floor(100 + Math.random() * 900)}`,
      name: "",
      totalQuantityPairs: "",
      assignedEmployeeId: cuttingWorkers[0]?.id || "",
      notes: "",
    });
    setErrorMessage("");
    setIsNewArticleOpen(true);
  };

  // Create New Article
  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticleData.articleCode.trim() || !newArticleData.name.trim()) {
      setErrorMessage("Please enter both article code and shoe model name.");
      return;
    }

    const qty = parseInt(String(newArticleData.totalQuantityPairs), 10);
    if (!qty || qty <= 0) {
      setErrorMessage("Please enter a valid batch quantity (pairs).");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newArticleData,
          totalQuantityPairs: qty,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to create article");
        return;
      }

      setIsNewArticleOpen(false);
      setSuccessMessage(`Production batch ${data.articleCode} launched in Cutting!`);
      setTimeout(() => setSuccessMessage(""), 4000);
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  // WIP metrics
  const totalWIPPairs = articles
    .filter((a) => a.status === "IN_PROGRESS")
    .reduce((sum, a) => sum + a.totalQuantityPairs, 0);

  const totalStockedPairs = articles
    .filter((a) => a.status === "STOCKED")
    .reduce((sum, a) => sum + a.totalQuantityPairs, 0);

  const filteredArticles = articles.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.articleCode.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.assignedEmployee?.name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-ui pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-ink">Stage Workflow Board</h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent font-medium tabular-nums rounded">
              {totalWIPPairs} Pairs on Floor
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Visual 4-stage Kanban tracking, operator hand-offs, and intermediate component buffer bays.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-md bg-white border border-border-ui hover:border-orange-500/40 text-ink hover:text-ink transition-all active:scale-95"
            title="Refresh Board"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-orange-400" : ""}`} />
          </button>
          <button
            onClick={handleOpenNewArticle}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 font-medium text-black transition-all shadow-orange-500/25 text-xs active:scale-95"
          >
            <Plus className="w-4 h-4 text-black stroke-[3]" />
            <span>+ New Production Run</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3.5 rounded-md bg-emerald-950/90 border border-emerald-500/50 text-sm text-emerald-200 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-700 hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stage Summary Metric Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {DEPARTMENT_LIST.map((dept) => {
          const stageWIP = articles
            .filter((a) => a.currentStage === dept.code && a.status === "IN_PROGRESS")
            .reduce((sum, a) => sum + a.totalQuantityPairs, 0);
          const activeWorkers = employees.filter((e) => e.department === dept.code).length;

          return (
            <div
              key={dept.code}
              className="panel p-3 flex flex-col justify-between space-y-2 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: dept.color }} />
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink">
                  {dept.workerTitle}
                </span>
                <span className="text-[10px] tabular-nums font-medium px-2 py-0.5 rounded-md bg-white text-ink border border-border-ui">
                  Stage 0{dept.stepNumber}
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-2xl font-black text-ink tabular-nums">{stageWIP}</span>
                  <span className="text-xs font-semibold text-ink-muted ml-1.5">Pairs WIP</span>
                </div>
                <span className="text-xs text-ink-muted font-medium">{activeWorkers} Operators</span>
              </div>
            </div>
          );
        })}

        {/* Intermediate Stock KPI */}
        <div className="col-span-2 lg:col-span-1 panel p-3 flex flex-col justify-between space-y-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-400">
              Intermediate Stock
            </span>
            <Archive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-2xl font-black text-ink tabular-nums">{totalStockedPairs}</span>
              <span className="text-xs font-semibold text-ink-muted ml-1.5">Pairs Held</span>
            </div>
            <span className="text-[11px] text-violet-700/90 font-semibold">Buffer Shelves</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel p-3.5 rounded-md flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search active batches by code (e.g. ART-902), model name, or worker..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/80 border border-border-ui rounded-lg text-sm text-ink placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="text-xs text-ink-muted hidden sm:block font-medium">
          Active Batches: <strong className="text-ink tabular-nums">{filteredArticles.length}</strong>
        </div>
      </div>

      {/* 4-COLUMN KANBAN PRODUCTION BOARD */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-ink-muted text-sm">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-3" />
          Loading factory workflow board...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {DEPARTMENT_LIST.map((dept) => {
            const { inProgress, stocked } = getStageArticles(dept.code);
            const deptWorkers = employees.filter((e) => e.department === dept.code);

            return (
              <div
                key={dept.code}
                className="panel rounded-md flex flex-col min-h-[580px] overflow-hidden"
              >
                {/* Column Header */}
                <div
                  className="p-4 border-b border-border-ui flex items-center justify-between"
                  style={{ borderTop: `3px solid ${dept.color}` }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-ink tracking-wide text-base">{dept.label}</h3>
                      <span className="tabular-nums text-xs px-2 py-0.5 rounded-md font-medium bg-white text-ink border border-border-ui">
                        {inProgress.length}
                      </span>
                    </div>
                    <span className="text-xs text-ink-muted block mt-0.5 font-medium">
                      Department: <strong className="text-ink">{dept.workerTitle}</strong>
                    </span>
                  </div>

                  {dept.code === "CUTTING" && (
                    <button
                      onClick={handleOpenNewArticle}
                      className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/40 text-teal-300 transition-colors shadow-sm"
                      title="Start Production Run"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}
                </div>

                {/* Column Body: In-Progress Cards */}
                <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto max-h-[620px]">
                  {inProgress.length === 0 && stocked.length === 0 ? (
                    <div className="border border-dashed border-border-ui rounded-md p-8 text-center space-y-2 bg-white/30">
                      <Package className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs text-ink-muted font-medium">No active batches in this stage</p>
                      {dept.code === "CUTTING" && (
                        <button
                          onClick={handleOpenNewArticle}
                          className="text-xs text-orange-400 hover:underline font-medium"
                        >
                          + Launch New Batch
                        </button>
                      )}
                    </div>
                  ) : (
                    inProgress.map((article) => {
                      return (
                        <div
                          key={article.id}
                          className="bg-white border border-border-ui hover:border-accent rounded-md p-4 space-y-3 transition-all duration-200 group"
                        >
                          {/* Card Top: Code, Pairs */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="tabular-nums text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                                  {article.articleCode}
                                </span>
                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                                  {article.totalQuantityPairs} Pairs
                                </span>
                              </div>
                              <h4 className="font-medium text-sm text-ink mt-1.5 tracking-tight group-hover:text-orange-300 transition-colors">
                                {article.name}
                              </h4>
                            </div>
                          </div>

                          {/* Operator Assignment Row */}
                          <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <div>
                                <span className="text-ink-muted block text-[10px] uppercase font-medium tracking-wider">Operator:</span>
                                <span className="font-medium text-ink">
                                  {article.assignedEmployee ? article.assignedEmployee.name : "Unassigned"}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleOpenAssign(article)}
                              className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold underline"
                            >
                              {article.assignedEmployee ? "Reassign" : "Assign"}
                            </button>
                          </div>

                          {/* Material Cost Preview if logged */}
                          {article.totalMaterialCost !== undefined && article.totalMaterialCost > 0 && (
                            <div className="flex items-center justify-between text-[11px] px-1 text-ink-muted">
                              <span>Logged Materials:</span>
                              <span className="tabular-nums font-medium text-orange-400">
                                {formatCurrency(article.totalMaterialCost)}
                              </span>
                            </div>
                          )}

                          {/* Action Buttons: Complete Stage & Journey */}
                          <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                            <Link
                              href={`/articles/${article.id}`}
                              className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink px-2 py-1 rounded-md hover:bg-white/[0.06] transition-colors font-semibold"
                              title="View Article Journey Trail"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Audit Trail</span>
                            </Link>

                            <button
                              onClick={() => handleOpenCompleteStage(article)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 font-semibold text-black text-xs transition-all shadow-orange-500/20 active:scale-95 ml-auto"
                            >
                              <span>Complete Stage</span>
                              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* INTERMEDIATE STOCK SECTION FOR THIS STAGE */}
                  {stocked.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border-ui">
                      <div className="flex items-center justify-between mb-2.5 px-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-purple-400">
                          <Archive className="w-3.5 h-3.5" />
                          <span>{dept.workerTitle} Buffer ({stocked.length})</span>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {stocked.map((stockArt) => (
                          <div
                            key={stockArt.id}
                            className="bg-violet-50 border border-violet-200 hover:border-violet-300 rounded-md p-3 space-y-2 transition-all"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="tabular-nums text-xs font-medium text-violet-700">
                                  {stockArt.articleCode}
                                </span>
                                <h5 className="text-xs font-medium text-ink mt-0.5">
                                  {stockArt.name}
                                </h5>
                              </div>
                              <span className="text-xs tabular-nums px-2 py-0.5 rounded-md bg-purple-950 text-violet-700 border border-purple-700/50 font-medium">
                                {stockArt.totalQuantityPairs} Pairs
                              </span>
                            </div>

                            {stockArt.stockLocation && (
                              <span className="text-[11px] text-ink-muted block font-medium">
                                Shelf: <strong className="text-ink">{stockArt.stockLocation}</strong>
                              </span>
                            )}

                            <div className="pt-2 border-t border-purple-900/40 flex items-center justify-between gap-2">
                              <Link
                                href={`/articles/${stockArt.id}`}
                                className="text-[11px] text-ink-muted hover:text-ink font-medium"
                              >
                                View Trail
                              </Link>

                              <button
                                onClick={() => handlePullFromStock(stockArt.id, dept.code)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-500 font-medium text-ink text-[11px] transition-colors shadow-sm"
                              >
                                <span>Pull & Assign</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STAGE COMPLETION DECISION MODAL */}
      {isCompleteStageOpen && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="panel bg-white border border-border-ui rounded-md max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border-ui pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">Stage Completion Decision</h3>
                  <p className="text-xs text-ink-muted">Choose forwarding to next department or holding in buffer stock</p>
                </div>
              </div>
              <button
                onClick={() => setIsCompleteStageOpen(false)}
                className="text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Article Context Pill */}
            <div className="p-3.5 rounded-md bg-stone-50 border border-border-ui flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-medium text-sm text-amber-700">{selectedArticle.articleCode}</span>
                  <span className="text-sm font-medium text-ink">{selectedArticle.name}</span>
                </div>
                <span className="text-xs text-ink-muted mt-0.5 block">
                  Completed by: <strong className="text-ink">{selectedArticle.assignedEmployee?.name || "Current Operator"}</strong>
                </span>
              </div>
              <span className="tabular-nums text-sm font-black text-emerald-700 px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40">
                {selectedArticle.totalQuantityPairs} Pairs
              </span>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-md bg-rose-950/80 border border-rose-700/60 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleExecuteTransition} className="space-y-4">
              {/* Decision Selector */}
              <div>
                <label className="block text-xs font-medium text-ink mb-2">
                  Choose Production Route *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-4 rounded-md border cursor-pointer flex flex-col justify-between transition-all ${
                      transitionData.action === "FORWARD"
                        ? "bg-accent/5 border-accent ring-2 ring-accent/30"
                        : "bg-white border-border-ui hover:border-white/[0.15]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="action"
                          value="FORWARD"
                          checked={transitionData.action === "FORWARD"}
                          onChange={() => setTransitionData({ ...transitionData, action: "FORWARD" })}
                          className="accent-orange-500"
                        />
                        <span className="text-xs font-semibold text-ink">
                          Forward to Next Stage
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-orange-400" />
                    </div>
                    <p className="text-[11px] text-ink-muted font-medium">
                      Pass batch directly to {DEPARTMENTS[selectedArticle.currentStage as DepartmentCode]?.nextStage || "Finished Warehouse"} worker.
                    </p>
                  </label>

                  <label
                    className={`p-4 rounded-md border cursor-pointer flex flex-col justify-between transition-all ${
                      transitionData.action === "HOLD_IN_STOCK"
                        ? "bg-violet-50 border-violet-500 ring-2 ring-violet-400"
                        : "bg-white border-border-ui hover:border-white/[0.15]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="action"
                          value="HOLD_IN_STOCK"
                          checked={transitionData.action === "HOLD_IN_STOCK"}
                          onChange={() => setTransitionData({ ...transitionData, action: "HOLD_IN_STOCK" })}
                          className="accent-purple-500"
                        />
                        <span className="text-xs font-semibold text-ink">
                          Hold in Stock
                        </span>
                      </div>
                      <Archive className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-[11px] text-ink-muted font-medium">
                      Store in buffer bay (e.g. cut pieces / stitched uppers) until next worker is ready.
                    </p>
                  </label>
                </div>
              </div>

              {/* Conditional Inputs: Next Worker vs Stock Location */}
              {transitionData.action === "FORWARD" && (
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Assign Candidate Worker in Next Department
                  </label>
                  <select
                    value={transitionData.nextEmployeeId}
                    onChange={(e) => setTransitionData({ ...transitionData, nextEmployeeId: e.target.value })}
                    className="w-full bg-stone-50 border border-border-ui rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-orange-500 font-medium"
                  >
                    <option value="">Leave Unassigned (Pool)</option>
                    {employees
                      .filter((e) => e.department === DEPARTMENTS[selectedArticle.currentStage as DepartmentCode]?.nextStage)
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.employeeCode} - {emp.name} ({emp.status})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {transitionData.action === "HOLD_IN_STOCK" && (
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Intermediate Warehouse Shelf / Rack Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cutting Shelf Bay A-3"
                    value={transitionData.stockLocation}
                    onChange={(e) => setTransitionData({ ...transitionData, stockLocation: e.target.value })}
                    className="w-full bg-stone-50 border border-border-ui rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-purple-500 font-medium"
                  />
                </div>
              )}

              {/* Inline Material Consumption Toggle */}
              <div className="p-3.5 rounded-md bg-stone-50 border border-border-ui space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transitionData.includeMaterial}
                      onChange={(e) => setTransitionData({ ...transitionData, includeMaterial: e.target.checked })}
                      className="accent-orange-500 w-4 h-4 rounded"
                    />
                    <span className="text-xs font-medium text-ink">
                      Record Material Consumed in this Stage
                    </span>
                  </label>
                  <Calculator className="w-4 h-4 text-orange-400" />
                </div>

                {transitionData.includeMaterial && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-100">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] text-ink-muted mb-1 font-medium">Material Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Leather / Soles"
                        value={transitionData.materialName}
                        onChange={(e) => setTransitionData({ ...transitionData, materialName: e.target.value })}
                        className="w-full bg-white border border-border-ui rounded-lg px-2 py-1.5 text-xs text-ink font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-muted mb-1 font-medium">Unit</label>
                      <select
                        value={transitionData.unit}
                        onChange={(e) => setTransitionData({ ...transitionData, unit: e.target.value })}
                        className="w-full bg-white border border-border-ui rounded-lg px-2 py-1.5 text-xs text-ink"
                      >
                        {STANDARD_UNITS.map((u) => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-muted mb-1 font-medium">Unit Price ({CURRENCY})</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="0.00"
                        value={transitionData.unitPrice}
                        onChange={(e) => setTransitionData({ ...transitionData, unitPrice: e.target.value })}
                        className="w-full bg-white border border-border-ui rounded-lg px-2 py-1.5 text-xs text-ink tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-muted mb-1 font-medium">Quantity</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0"
                        value={transitionData.quantityUsed}
                        onChange={(e) => setTransitionData({ ...transitionData, quantityUsed: e.target.value })}
                        className="w-full bg-white border border-border-ui rounded-lg px-2 py-1.5 text-xs text-ink tabular-nums"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Hand-off Notes */}
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Hand-off Notes / Quality Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cut from Grade A Napa leather batch #44"
                  value={transitionData.notes}
                  onChange={(e) => setTransitionData({ ...transitionData, notes: e.target.value })}
                  className="w-full bg-stone-50 border border-border-ui rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-ui">
                <button
                  type="button"
                  onClick={() => setIsCompleteStageOpen(false)}
                  className="px-4 py-2 rounded-md text-xs font-semibold text-ink-muted hover:text-ink hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 font-semibold text-black text-xs transition-all shadow-orange-500/25 disabled:opacity-50 active:scale-95"
                >
                  {submitting ? "Processing..." : "Confirm & Complete Stage"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN WORKER MODAL */}
      {isAssignModalOpen && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="panel bg-white border border-border-ui rounded-md max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border-ui pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-semibold text-ink">Assign Technician</h3>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-md bg-stone-50 border border-border-ui text-xs">
              <div className="flex items-center gap-1.5 font-medium text-ink">
                <span className="tabular-nums text-amber-700">{selectedArticle.articleCode}</span>
                <span>• {selectedArticle.name}</span>
              </div>
              <span className="text-ink-muted block mt-0.5">
                Current Stage: <strong className="text-ink">{DEPARTMENTS[selectedArticle.currentStage as DepartmentCode]?.label}</strong>
              </span>
            </div>

            <form onSubmit={handleExecuteAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Select {DEPARTMENTS[selectedArticle.currentStage as DepartmentCode]?.workerTitle} *
                </label>
                <select
                  value={assignWorkerId}
                  onChange={(e) => setAssignWorkerId(e.target.value)}
                  className="w-full bg-stone-50 border border-border-ui rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-orange-500 font-medium"
                >
                  <option value="">-- Unassigned (Floor Pool) --</option>
                  {employees
                    .filter((e) => e.department === selectedArticle.currentStage)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employeeCode} - {emp.name} ({emp.status})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-ui">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-md text-xs font-semibold text-ink-muted hover:text-ink hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 font-semibold text-black text-xs transition-all shadow-orange-500/20 active:scale-95"
                >
                  {submitting ? "Saving..." : "Update Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW PRODUCTION RUN MODAL */}
      {isNewArticleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="panel bg-white border border-border-ui rounded-md max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border-ui pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink">Start New Production Run</h3>
                  <p className="text-xs text-ink-muted">Initialize batch in Cutting Stage</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewArticleOpen(false)}
                className="text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-md bg-rose-950/80 border border-rose-700/60 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateArticle} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Article / Style Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ART-902"
                    value={newArticleData.articleCode}
                    onChange={(e) => setNewArticleData({ ...newArticleData, articleCode: e.target.value.toUpperCase() })}
                    className="w-full bg-stone-50 border border-border-ui rounded-lg px-3 py-2 text-sm text-ink tabular-nums uppercase focus:outline-none focus:border-orange-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Batch Quantity (Pairs) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 50"
                    value={newArticleData.totalQuantityPairs}
                    onChange={(e) => setNewArticleData({ ...newArticleData, totalQuantityPairs: e.target.value })}
                    className="w-full bg-stone-50 border border-border-ui rounded-lg px-3 py-2 text-sm text-ink tabular-nums focus:outline-none focus:border-orange-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Shoe Model / Style Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Everest Trekker Waterproof Boot"
                  value={newArticleData.name}
                  onChange={(e) => setNewArticleData({ ...newArticleData, name: e.target.value })}
                  className="w-full bg-stone-50 border border-border-ui rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Assign Initial Cutting Operator
                </label>
                <select
                  value={newArticleData.assignedEmployeeId}
                  onChange={(e) => setNewArticleData({ ...newArticleData, assignedEmployeeId: e.target.value })}
                  className="w-full bg-stone-50 border border-border-ui rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-orange-500 font-medium"
                >
                  <option value="">Unassigned (Cutting Floor Pool)</option>
                  {employees
                    .filter((e) => e.department === "CUTTING")
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employeeCode} - {emp.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Initial Batch Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rush customer order #9201"
                  value={newArticleData.notes}
                  onChange={(e) => setNewArticleData({ ...newArticleData, notes: e.target.value })}
                  className="w-full bg-stone-50 border border-border-ui rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-ui">
                <button
                  type="button"
                  onClick={() => setIsNewArticleOpen(false)}
                  className="px-4 py-2 rounded-md text-xs font-semibold text-ink-muted hover:text-ink hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 font-semibold text-black text-xs transition-all shadow-orange-500/25 disabled:opacity-50 active:scale-95"
                >
                  {submitting ? "Launching..." : "Launch Production Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
