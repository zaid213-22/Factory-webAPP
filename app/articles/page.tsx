"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Layers, 
  Archive, 
  CheckCircle2, 
  Eye, 
  Trash2, 
  X,
  AlertCircle,
  TrendingUp,
  Clock,
  Boxes,
  Download
} from "lucide-react";
import { DEPARTMENT_LIST, DepartmentCode, DEPARTMENTS, CURRENCY, formatCurrency } from "@/lib/types";
import { downloadCSV } from "@/lib/export-utils";

interface ArticleListItem {
  id: string;
  articleCode: string;
  name: string;
  currentStage: DepartmentCode | "COMPLETED";
  status: "IN_PROGRESS" | "STOCKED" | "COMPLETED";
  totalQuantityPairs: number;
  stockStage?: string | null;
  stockLocation?: string | null;
  totalMaterialCost?: number;
  costPerPair?: number;
  createdAt: string;
  assignedEmployee?: {
    id: string;
    name: string;
    employeeCode: string;
    department: string;
  } | null;
  _count?: {
    stageLogs: number;
    materials: number;
  };
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStage !== "ALL") params.append("stage", selectedStage);
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);

      const res = await fetch(`/api/articles?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [selectedStage, selectedStatus]);

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete article ${code}? All its journey logs and material records will also be deleted.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchArticles();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete article");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    if (articles.length === 0) {
      alert("No article records to export.");
      return;
    }

    const headers = [
      "Article Code",
      "Model Name",
      "Current Stage",
      "Status",
      "Quantity (Pairs)",
      "Stock Location",
      "Assigned Operator",
      `Material Cost (${CURRENCY})`,
      `Cost Per Pair (${CURRENCY})`,
      "Start Date",
    ];

    const rows = [
      headers,
      ...filteredArticles.map((a) => [
        a.articleCode,
        a.name,
        a.currentStage,
        a.status,
        a.totalQuantityPairs.toString(),
        a.stockLocation || "Floor",
        a.assignedEmployee ? `${a.assignedEmployee.name} (${a.assignedEmployee.employeeCode})` : "Unassigned",
        (a.totalMaterialCost || 0).toFixed(2),
        (a.costPerPair || 0).toFixed(2),
        new Date(a.createdAt).toLocaleDateString(),
      ]),
    ];

    downloadCSV(`himalaya-inventory-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const filteredArticles = articles.filter((art) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      art.articleCode.toLowerCase().includes(q) ||
      art.name.toLowerCase().includes(q) ||
      (art.assignedEmployee?.name || "").toLowerCase().includes(q) ||
      (art.stockLocation || "").toLowerCase().includes(q)
    );
  });

  const totalPairsTracked = articles.reduce((sum, a) => sum + a.totalQuantityPairs, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-ui pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-ink">Articles & Inventory Ledger</h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent font-medium tabular-nums rounded">
              {articles.length} Batches ({totalPairsTracked.toLocaleString()} Pairs)
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Track shoe production runs, intermediate warehouse buffer racks, and completed finished goods.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-white border border-border-ui text-ink-muted hover:text-ink text-xs font-medium transition-colors"
          >
            <Download className="w-4 h-4 text-orange-400" />
            <span>Export Inventory (CSV)</span>
          </button>

          <Link
            href="/workflow"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-accent hover:bg-accent-hover text-white font-medium text-xs shadow-sm ring-2 ring-accent/20 transition-all active:scale-95"
          >
            <Layers className="w-4 h-4" />
            <span>Open Stage Board</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="panel p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by article code (e.g. ART-902), model name, worker, or shelf..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-border-ui rounded-md text-sm text-ink placeholder-stone-400 focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="bg-white border border-border-ui text-xs text-ink rounded-md px-2.5 py-1.5 focus:outline-none focus:border-accent font-medium"
          >
            <option value="ALL">All Stages</option>
            {DEPARTMENT_LIST.map((d) => (
              <option key={d.code} value={d.code}>
                {d.label}
              </option>
            ))}
            <option value="COMPLETED">Completed (Finished Goods)</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-border-ui text-xs text-ink rounded-md px-2.5 py-1.5 focus:outline-none focus:border-accent font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="IN_PROGRESS">In Progress (Floor)</option>
            <option value="STOCKED">Stocked (Intermediate Buffer)</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Articles Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-ink-muted text-sm">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-3" />
          Loading articles & inventory...
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="panel border-dashed rounded-md p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-md bg-white border border-border-ui flex items-center justify-center text-ink-muted">
            <Package className="w-7 h-7 text-stone-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">No Articles Found</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              {searchQuery || selectedStage !== "ALL" || selectedStatus !== "ALL"
                ? "No production runs match your active filters."
                : "No articles registered yet. Launch your first batch from the Stage Workflow Board."}
            </p>
          </div>
          <Link
            href="/workflow"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-accent hover:bg-accent-hover text-white font-medium text-xs shadow-sm ring-2 ring-accent/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Launch Batch on Stage Board</span>
          </Link>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 border-b border-border-ui text-[10px] font-medium text-ink-muted">
                <tr>
                  <th className="px-5 py-4">Article Code & Style</th>
                  <th className="px-4 py-4">Current Stage</th>
                  <th className="px-4 py-4">Batch Quantity</th>
                  <th className="px-4 py-4">Status & Location</th>
                  <th className="px-4 py-4">Assigned Operator</th>
                  <th className="px-4 py-4">Material Cost</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredArticles.map((art) => {
                  const deptMeta =
                    art.currentStage !== "COMPLETED"
                      ? DEPARTMENTS[art.currentStage as DepartmentCode]
                      : null;

                  return (
                    <tr key={art.id} className="hover:bg-stone-50/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20">
                            {art.articleCode}
                          </span>
                          <span className="font-semibold text-ink tracking-tight">{art.name}</span>
                        </div>
                        <span className="text-[11px] text-ink-muted block mt-0.5 font-medium">
                          Started: {new Date(art.createdAt).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {deptMeta ? (
                          <span className={`text-[10px] px-2.5 py-1 rounded-md border font-medium ${deptMeta.badgeClass}`}>
                            {deptMeta.label}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2.5 py-1 rounded-md border font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                            Completed (Warehouse)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 tabular-nums font-semibold text-ink text-base">
                        {art.totalQuantityPairs} <span className="text-xs font-normal text-ink-muted">Pairs</span>
                      </td>

                      <td className="px-4 py-4">
                        {art.status === "IN_PROGRESS" ? (
                          <div className="flex items-center gap-1.5 text-xs text-teal-700 font-medium">
                            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                            <span>In Progress</span>
                          </div>
                        ) : art.status === "STOCKED" ? (
                          <div>
                            <span className="text-xs px-2.5 py-0.5 rounded-md bg-violet-50 text-violet-700 border-violet-200 font-medium inline-flex items-center gap-1">
                              <Archive className="w-3 h-3" />
                              <span>Stocked</span>
                            </span>
                            {art.stockLocation && (
                              <span className="text-[11px] text-ink-muted block mt-0.5 font-medium">
                                {art.stockLocation}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Finished Goods</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-xs">
                        {art.assignedEmployee ? (
                          <div>
                            <span className="font-medium text-ink">{art.assignedEmployee.name}</span>
                            <span className="text-ink-muted block text-[11px] tabular-nums">
                              {art.assignedEmployee.employeeCode} ({art.assignedEmployee.department})
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {art.totalMaterialCost && art.totalMaterialCost > 0 ? (
                          <div>
                            <span className="tabular-nums font-semibold text-orange-400 text-sm">
                              {formatCurrency(art.totalMaterialCost)}
                            </span>
                            <span className="text-[11px] text-ink-muted block tabular-nums">
                              {formatCurrency(art.costPerPair || 0)} / pair
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 text-xs">{formatCurrency(0)} logged</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/articles/${art.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-border-ui text-ink-muted hover:text-ink text-xs font-medium transition-colors"
                            title="View Full Audit Trail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Audit Trail</span>
                          </Link>
                          <button
                            onClick={() => handleDelete(art.id, art.articleCode)}
                            className="p-2 rounded-lg hover:bg-rose-950/50 text-ink-muted hover:text-rose-600 transition-colors"
                            title="Delete Article"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
