"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Plus,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  Edit3,
  Phone,
  MapPin,
  Package,
  Palette,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Check,
  DollarSign,
  Clock,
  Sparkles,
  Users,
} from "lucide-react";
import { CURRENCY, formatCurrency } from "@/lib/types";
import { downloadCSV } from "@/lib/export-utils";

interface OrderItemData {
  id?: string;
  articleCode: string;
  articleName: string;
  color: string;
  sizes: string;
  quantityPairs: number | string;
  pricePerPair: number | string;
  lineTotal: number;
  notes?: string;
}

interface OrderData {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  totalAmount: number;
  amountPaid: number;
  amountRemaining: number;
  status: string;
  paymentStatus: string;
  orderDate: string;
  paymentDate?: string | null;
  deliveryDate?: string | null;
  deliveredDate?: string | null;
  notes?: string | null;
  createdAt: string;
  items: OrderItemData[];
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "IN_PRODUCTION", label: "In Production", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "READY", label: "Ready", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "DELIVERED", label: "Delivered", color: "bg-teal-100 text-teal-800 border-teal-200" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-rose-100 text-rose-800 border-rose-200" },
];

const PAYMENT_OPTIONS = [
  { value: "PAID", label: "Paid", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: "●" },
  { value: "PARTIAL", label: "Partially Paid", color: "bg-amber-100 text-amber-800 border-amber-200", icon: "◐" },
  { value: "UNPAID", label: "Unpaid", color: "bg-rose-100 text-rose-800 border-rose-200", icon: "○" },
];

const getStatusMeta = (s: string) => STATUS_OPTIONS.find((x) => x.value === s) || STATUS_OPTIONS[0];
const getPaymentMeta = (p: string) => PAYMENT_OPTIONS.find((x) => x.value === p) || PAYMENT_OPTIONS[2];

function newEmptyItem(): OrderItemData {
  return {
    articleCode: "",
    articleName: "",
    color: "",
    sizes: "",
    quantityPairs: "",
    pricePerPair: "",
    lineTotal: 0,
    notes: "",
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Quick Payment Modal
  const [quickPayOrder, setQuickPayOrder] = useState<OrderData | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState<string>("");
  const [quickPayDate, setQuickPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [quickPaySubmitting, setQuickPaySubmitting] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formCustomerPhone, setFormCustomerPhone] = useState("");
  const [formCustomerAddress, setFormCustomerAddress] = useState("");
  const [formOrderCode, setFormOrderCode] = useState("");
  const [formPaymentOption, setFormPaymentOption] = useState<"UNPAID" | "PARTIAL" | "PAID">("UNPAID");
  const [formAmountPaid, setFormAmountPaid] = useState<number | string>("");
  const [formPaymentDate, setFormPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [formOrderDate, setFormOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [formDeliveryDate, setFormDeliveryDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState("PENDING");
  const [formItems, setFormItems] = useState<OrderItemData[]>([newEmptyItem()]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/orders");
      if (res.ok) setOrders(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const calcItemTotal = (item: OrderItemData) => {
    return (parseFloat(String(item.quantityPairs)) || 0) * (parseFloat(String(item.pricePerPair)) || 0);
  };

  const formGrandTotal = formItems.reduce((sum, it) => sum + calcItemTotal(it), 0);

  const handlePaymentOptionSelect = (opt: "UNPAID" | "PARTIAL" | "PAID") => {
    setFormPaymentOption(opt);
    if (opt === "PAID") {
      setFormAmountPaid(formGrandTotal > 0 ? formGrandTotal : "");
    } else if (opt === "UNPAID") {
      setFormAmountPaid(0);
    } else if (opt === "PARTIAL") {
      if (formAmountPaid === 0 || formAmountPaid === formGrandTotal) {
        setFormAmountPaid(formGrandTotal > 0 ? (formGrandTotal * 0.5) : "");
      }
    }
  };

  const currentPaid = parseFloat(String(formAmountPaid)) || 0;
  const formRemaining = formGrandTotal - currentPaid;

  const resetForm = () => {
    setFormCustomerName("");
    setFormCustomerPhone("");
    setFormCustomerAddress("");
    setFormOrderCode("");
    setFormPaymentOption("UNPAID");
    setFormAmountPaid("");
    setFormPaymentDate(new Date().toISOString().slice(0, 10));
    setFormOrderDate(new Date().toISOString().slice(0, 10));
    setFormDeliveryDate("");
    setFormNotes("");
    setFormStatus("PENDING");
    setFormItems([newEmptyItem()]);
    setErrorMsg("");
    setIsEditMode(false);
    setEditingOrderId("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (order: OrderData) => {
    setFormCustomerName(order.customerName);
    setFormCustomerPhone(order.customerPhone || "");
    setFormCustomerAddress(order.customerAddress || "");
    setFormOrderCode(order.orderCode);
    
    if (order.amountPaid >= order.totalAmount && order.totalAmount > 0) {
      setFormPaymentOption("PAID");
    } else if (order.amountPaid > 0) {
      setFormPaymentOption("PARTIAL");
    } else {
      setFormPaymentOption("UNPAID");
    }

    setFormAmountPaid(order.amountPaid);
    setFormPaymentDate(order.paymentDate ? new Date(order.paymentDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    setFormOrderDate(order.orderDate ? new Date(order.orderDate).toISOString().slice(0, 10) : "");
    setFormDeliveryDate(order.deliveryDate ? new Date(order.deliveryDate).toISOString().slice(0, 10) : "");
    setFormNotes(order.notes || "");
    setFormStatus(order.status);
    setFormItems(
      order.items.length > 0
        ? order.items.map((it) => ({
            articleCode: it.articleCode,
            articleName: it.articleName || "",
            color: it.color,
            sizes: it.sizes,
            quantityPairs: it.quantityPairs,
            pricePerPair: it.pricePerPair,
            lineTotal: it.lineTotal,
            notes: it.notes || "",
          }))
        : [newEmptyItem()]
    );
    setIsEditMode(true);
    setEditingOrderId(order.id);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    setFormItems((prev) => [...prev, newEmptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length === 1) {
      setFormItems([newEmptyItem()]);
      return;
    }
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItemData, value: any) => {
    setFormItems((prev) => {
      const updated = prev.map((item, i) => (i === index ? { ...item, [field]: value } : item));
      if (formPaymentOption === "PAID") {
        const newTotal = updated.reduce((sum, it) => sum + calcItemTotal(it), 0);
        setFormAmountPaid(newTotal);
      }
      return updated;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerName.trim()) { setErrorMsg("Customer name is required."); return; }

    const validItems = formItems.filter((it) => it.articleCode.toString().trim());
    if (validItems.length === 0) { setErrorMsg("Add at least one article."); return; }

    for (let i = 0; i < validItems.length; i++) {
      const it = validItems[i];
      if (!it.color.toString().trim()) { setErrorMsg(`Article #${i + 1}: Color is required.`); return; }
      if (!it.sizes.toString().trim()) { setErrorMsg(`Article #${i + 1}: Sizes are required.`); return; }
      const qty = parseInt(String(it.quantityPairs), 10);
      if (isNaN(qty) || qty <= 0) { setErrorMsg(`Article #${i + 1}: Quantity must be at least 1.`); return; }
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      let finalPaid = 0;
      if (formPaymentOption === "PAID") {
        finalPaid = formGrandTotal;
      } else if (formPaymentOption === "UNPAID") {
        finalPaid = 0;
      } else {
        finalPaid = parseFloat(String(formAmountPaid)) || 0;
      }

      const payload: any = {
        customerName: formCustomerName,
        customerPhone: formCustomerPhone || null,
        customerAddress: formCustomerAddress || null,
        amountPaid: finalPaid,
        paymentDate: finalPaid > 0 ? (formPaymentDate || new Date().toISOString()) : null,
        orderDate: formOrderDate || undefined,
        deliveryDate: formDeliveryDate || null,
        notes: formNotes || null,
        items: validItems.map((it) => ({
          articleCode: it.articleCode,
          articleName: it.articleName || null,
          color: it.color,
          sizes: it.sizes,
          quantityPairs: parseInt(String(it.quantityPairs), 10) || 0,
          pricePerPair: parseFloat(String(it.pricePerPair)) || 0,
          notes: it.notes || null,
        })),
      };

      let res: Response;
      if (isEditMode) {
        payload.id = editingOrderId;
        payload.status = formStatus;
        res = await fetch("/api/orders", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        payload.orderCode = formOrderCode || undefined;
        res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || "Failed to save order"); return; }

      setIsModalOpen(false);
      resetForm();
      setSuccessMsg(isEditMode ? "Order updated successfully." : "New order created successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
      fetchOrders();
    } catch (err: any) {
      setErrorMsg(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete order "${code}"?`)) return;
    try {
      await fetch(`/api/orders?id=${id}`, { method: "DELETE" });
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickStatus = async (id: string, status: string) => {
    try {
      await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickMarkPaid = async (order: OrderData, type: "PAID" | "UNPAID") => {
    try {
      const amountPaid = type === "PAID" ? order.totalAmount : 0;
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: order.id,
          amountPaid,
          paymentDate: type === "PAID" ? new Date().toISOString() : null,
        }),
      });
      if (res.ok) {
        setSuccessMsg(`Order ${order.orderCode} marked as ${type === "PAID" ? "Paid in Full" : "Unpaid"}.`);
        setTimeout(() => setSuccessMsg(""), 3000);
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenQuickPay = (order: OrderData) => {
    setQuickPayOrder(order);
    setQuickPayAmount(String(order.amountPaid || ""));
    setQuickPayDate(order.paymentDate ? new Date(order.paymentDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  };

  const handleSaveQuickPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayOrder) return;
    try {
      setQuickPaySubmitting(true);
      const paid = parseFloat(quickPayAmount) || 0;
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: quickPayOrder.id,
          amountPaid: paid,
          paymentDate: paid > 0 ? (quickPayDate || new Date().toISOString()) : null,
        }),
      });
      if (res.ok) {
        setQuickPayOrder(null);
        setSuccessMsg(`Payment updated for ${quickPayOrder.orderCode}.`);
        setTimeout(() => setSuccessMsg(""), 3000);
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setQuickPaySubmitting(false);
    }
  };

  const filtered = orders.filter((o) => {
    if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
    if (paymentFilter !== "ALL" && o.paymentStatus !== paymentFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.orderCode.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        (o.customerPhone || "").includes(q) ||
        o.items.some(
          (it) =>
            it.articleCode.toLowerCase().includes(q) ||
            (it.articleName || "").toLowerCase().includes(q) ||
            it.color.toLowerCase().includes(q)
        )
      );
    }
    return true;
  });

  const totalValue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalPaid = orders.reduce((s, o) => s + o.amountPaid, 0);
  const totalRemaining = orders.reduce((s, o) => s + o.amountRemaining, 0);
  const totalPairs = orders.reduce(
    (s, o) => s + o.items.reduce((is: number, it: any) => is + (it.quantityPairs || 0), 0),
    0
  );
  const activeOrders = orders.filter((o) => o.status === "PENDING" || o.status === "IN_PRODUCTION").length;
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;

  const handleExportCSV = () => {
    if (filtered.length === 0) return alert("No orders to export.");
    const headers = [
      "Order Code", "Customer", "Phone", "Address", "Article Code", "Model", "Color", "Sizes",
      "Qty (Pairs)", `Price/Pair (${CURRENCY})`, `Line Total (${CURRENCY})`,
      `Order Total (${CURRENCY})`, `Paid (${CURRENCY})`, `Remaining (${CURRENCY})`,
      "Status", "Payment", "Order Date", "Delivery Date", "Notes",
    ];
    const rows: string[][] = [headers];
    for (const o of filtered) {
      for (const it of o.items) {
        rows.push([
          o.orderCode, o.customerName, o.customerPhone || "", o.customerAddress || "",
          it.articleCode, it.articleName || "", it.color, it.sizes,
          String(it.quantityPairs), String(it.pricePerPair), String(it.lineTotal),
          String(o.totalAmount), String(o.amountPaid), String(o.amountRemaining),
          o.status, o.paymentStatus,
          new Date(o.orderDate).toLocaleDateString(),
          o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : "",
          o.notes || "",
        ]);
      }
    }
    downloadCSV(`himalaya-orders-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const Calendar = Clock; // reuse icon

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-ui pb-5">
        <div>
          <h1 className="text-xl font-semibold text-ink">Order Book</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Track customer orders, multi-article shoes, and payments in {CURRENCY}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/customers"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border-ui text-ink-muted hover:text-ink text-xs font-medium transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customer Ledgers</span>
          </Link>
          <button onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border-ui text-ink-muted hover:text-ink text-xs font-medium transition-colors">
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent hover:bg-accent-hover text-white font-medium text-xs transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-600 hover:text-emerald-800"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Value", value: formatCurrency(totalValue), accent: "text-ink" },
          { label: "Received", value: formatCurrency(totalPaid), accent: "text-emerald-700" },
          { label: "Outstanding", value: formatCurrency(totalRemaining), accent: "text-rose-700" },
          { label: "Total Pairs", value: totalPairs.toLocaleString(), accent: "text-ink" },
          { label: "Active", value: String(activeOrders), accent: "text-ink" },
          { label: "Delivered", value: String(deliveredOrders), accent: "text-ink" },
        ].map((kpi) => (
          <div key={kpi.label} className="panel p-3 space-y-0.5">
            <span className="text-[10px] text-ink-muted font-medium">{kpi.label}</span>
            <span className={`text-lg font-semibold tabular-nums block ${kpi.accent}`}>{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="panel p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search customer, article, color, phone..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-border-ui rounded-md text-sm text-ink placeholder-stone-400 focus:outline-none focus:border-accent" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-border-ui text-xs text-ink rounded-md px-2.5 py-1.5 focus:outline-none focus:border-accent font-medium">
            <option value="ALL">All Statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-white border border-border-ui text-xs text-ink rounded-md px-2.5 py-1.5 focus:outline-none focus:border-accent font-medium">
            <option value="ALL">All Payments</option>
            {PAYMENT_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Order Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-ink-muted text-sm">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mr-3" />
          Loading orders...
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel border-dashed p-10 text-center space-y-3">
          <ShoppingBag className="w-8 h-8 text-stone-400 mx-auto" />
          <h3 className="text-base font-semibold text-ink">No Orders Found</h3>
          <p className="text-sm text-ink-muted">Create a customer order with articles and payment status.</p>
          <button onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent text-white font-medium text-xs">
            <Plus className="w-3.5 h-3.5" /> Create First Order
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => {
            const sMeta = getStatusMeta(order.status);
            const pMeta = getPaymentMeta(order.paymentStatus);
            const isOpen = expandedId === order.id;
            const totalQty = order.items.reduce((s, it) => s + ((it.quantityPairs as number) || 0), 0);

            return (
              <div key={order.id} className="panel overflow-hidden">
                {/* Summary Row */}
                <div className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-2 cursor-pointer hover:bg-stone-50 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : order.id)}>
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium tabular-nums text-accent bg-accent/10 px-1.5 py-0.5 rounded">{order.orderCode}</span>
                        <span className="font-semibold text-ink truncate">{order.customerName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[11px] text-ink-muted">
                        <span>{order.items.length} article(s)</span>
                        <span>·</span>
                        <span>{totalQty} pairs</span>
                        {order.items.length > 0 && (
                          <>
                            <span>·</span>
                            <span className="truncate max-w-[200px]">
                              {order.items.map((it) => it.articleCode).join(", ")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${sMeta.color}`}>{sMeta.label}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-medium flex items-center gap-1 ${pMeta.color}`}>
                      <span>{pMeta.icon}</span>
                      <span>{pMeta.label}</span>
                    </span>
                    <div className="text-right">
                      <span className="font-semibold tabular-nums text-ink text-sm block">{formatCurrency(order.totalAmount)}</span>
                      {order.amountRemaining > 0 ? (
                        <span className="tabular-nums text-[10px] text-rose-600 font-medium">Due: {formatCurrency(order.amountRemaining)}</span>
                      ) : (
                        <span className="tabular-nums text-[10px] text-emerald-600 font-medium">Settled</span>
                      )}
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isOpen && (
                  <div className="border-t border-border-ui p-4 bg-stone-50/50 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-medium text-ink-muted">Customer</span>
                        <span className="text-sm font-medium text-ink block">{order.customerName}</span>
                        {order.customerPhone && <span className="text-[11px] text-ink-muted flex items-center gap-1"><Phone className="w-3 h-3" /> {order.customerPhone}</span>}
                        {order.customerAddress && <span className="text-[11px] text-ink-muted flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.customerAddress}</span>}
                      </div>

                      <div className="space-y-1.5 p-3 rounded-md bg-white border border-border-ui">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-ink-muted">Payment Summary</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${pMeta.color}`}>
                            {pMeta.icon} {pMeta.label}
                          </span>
                        </div>
                        <div className="text-[11px] space-y-1">
                          <div className="flex justify-between"><span className="text-ink-muted">Total:</span><span className="font-medium tabular-nums text-ink">{formatCurrency(order.totalAmount)}</span></div>
                          <div className="flex justify-between"><span className="text-emerald-700">Paid:</span><span className="font-medium tabular-nums text-emerald-700">{formatCurrency(order.amountPaid)}</span></div>
                          <div className="flex justify-between border-t border-border-ui pt-1">
                            <span className="text-rose-700 font-medium">Due:</span>
                            <span className="font-semibold tabular-nums text-rose-700">{formatCurrency(order.amountRemaining)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-medium text-ink-muted">Dates</span>
                        <span className="text-[11px] text-ink-muted block">Ordered: <strong className="text-ink">{new Date(order.orderDate).toLocaleDateString()}</strong></span>
                        {order.paymentDate && (
                          <span className="text-[11px] text-emerald-700 block font-medium">
                            Payment: <strong>{new Date(order.paymentDate).toLocaleDateString()}</strong>
                          </span>
                        )}
                        {order.deliveryDate && <span className="text-[11px] text-ink-muted block">Due: <strong className="text-amber-700">{new Date(order.deliveryDate).toLocaleDateString()}</strong></span>}
                        {order.deliveredDate && <span className="text-[11px] text-ink-muted block">Delivered: <strong className="text-emerald-700">{new Date(order.deliveredDate).toLocaleDateString()}</strong></span>}
                        {order.notes && <span className="text-[11px] text-ink-muted italic block mt-1">"{order.notes}"</span>}
                      </div>
                    </div>

                    {/* Article Items Table */}
                    <div className="rounded-md bg-white border border-border-ui overflow-hidden">
                      <div className="px-3 py-2 bg-stone-50 border-b border-border-ui flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-ink-muted" />
                        <span className="text-[10px] font-medium text-ink-muted">Ordered Articles ({order.items.length})</span>
                      </div>
                      <table className="w-full text-xs">
                        <thead className="text-[10px] text-ink-muted border-b border-stone-100">
                          <tr>
                            <th className="px-3 py-2 text-left">Article Code</th>
                            <th className="px-3 py-2 text-left">Model</th>
                            <th className="px-3 py-2 text-left">Color</th>
                            <th className="px-3 py-2 text-left">Sizes</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                            <th className="px-3 py-2 text-right">Price/Pair</th>
                            <th className="px-3 py-2 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {order.items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-stone-50/50">
                              <td className="px-3 py-2 tabular-nums font-medium text-accent">{it.articleCode}</td>
                              <td className="px-3 py-2 text-ink font-medium">{it.articleName || "—"}</td>
                              <td className="px-3 py-2 text-ink-muted">{it.color}</td>
                              <td className="px-3 py-2 text-ink-muted">{it.sizes}</td>
                              <td className="px-3 py-2 text-right tabular-nums font-medium text-ink">{it.quantityPairs}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-ink-muted">{formatCurrency(it.pricePerPair as number)}</td>
                              <td className="px-3 py-2 text-right tabular-nums font-semibold text-ink">{formatCurrency(it.lineTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-border-ui">
                          <tr>
                            <td colSpan={6} className="px-3 py-2 text-right font-medium text-ink-muted text-[10px]">Grand Total</td>
                            <td className="px-3 py-2 text-right tabular-nums font-semibold text-ink">{formatCurrency(order.totalAmount)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-border-ui">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-medium text-ink-muted mr-1">Payment:</span>
                        {order.paymentStatus !== "PAID" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleQuickMarkPaid(order, "PAID"); }}
                            className="text-[11px] px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-medium transition-colors"
                          >
                            Mark Fully Paid
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenQuickPay(order); }}
                          className="text-[11px] px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-medium transition-colors"
                        >
                          Record Payment
                        </button>
                        {order.paymentStatus !== "UNPAID" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleQuickMarkPaid(order, "UNPAID"); }}
                            className="text-[11px] px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-medium transition-colors"
                          >
                            Reset to Unpaid
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-between md:justify-end">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-medium text-ink-muted mr-1">Status:</span>
                          {STATUS_OPTIONS.filter((s) => s.value !== order.status).map((s) => (
                            <button key={s.value} onClick={(e) => { e.stopPropagation(); handleQuickStatus(order.id, s.value); }}
                              className={`text-[10px] px-1.5 py-0.5 rounded border font-medium hover:opacity-80 transition-opacity ${s.color}`}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(order); }}
                            className="p-1.5 rounded-md hover:bg-stone-100 text-ink-muted hover:text-ink transition-colors" title="Edit">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(order.id, order.orderCode); }}
                            className="p-1.5 rounded-md hover:bg-rose-50 text-ink-muted hover:text-rose-600 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* QUICK PAYMENT MODAL */}
      {quickPayOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white border border-border-ui rounded-md max-w-md w-full p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-border-ui pb-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">Record Payment</h3>
                <p className="text-xs text-ink-muted">Order: <span className="tabular-nums text-accent">{quickPayOrder.orderCode}</span> ({quickPayOrder.customerName})</p>
              </div>
              <button onClick={() => setQuickPayOrder(null)} className="text-stone-400 hover:text-ink"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveQuickPay} className="space-y-3">
              <div className="p-3 rounded-md bg-stone-50 border border-border-ui space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-ink-muted">Total:</span><span className="font-medium tabular-nums text-ink">{formatCurrency(quickPayOrder.totalAmount)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-ink-muted">Paid:</span><span className="font-medium tabular-nums text-emerald-700">{formatCurrency(quickPayOrder.amountPaid)}</span></div>
                <div className="flex justify-between text-xs border-t border-border-ui pt-1"><span className="text-rose-700 font-medium">Due:</span><span className="font-medium tabular-nums text-rose-700">{formatCurrency(quickPayOrder.amountRemaining)}</span></div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] text-ink-muted font-medium">Quick options:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setQuickPayAmount(String(quickPayOrder.totalAmount))}
                    className="px-2 py-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-medium text-xs transition-colors">100% Full</button>
                  <button type="button" onClick={() => setQuickPayAmount(String(Math.round(quickPayOrder.totalAmount * 0.5)))}
                    className="px-2 py-1.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-medium text-xs transition-colors">50% Half</button>
                  <button type="button" onClick={() => setQuickPayAmount("0")}
                    className="px-2 py-1.5 rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-medium text-xs transition-colors">0% Reset</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Amount Paid ({CURRENCY})</label>
                <input type="number" step="0.5" min="0" required placeholder="0.00" value={quickPayAmount}
                  onChange={(e) => setQuickPayAmount(e.target.value)}
                  className="w-full bg-white border border-border-ui rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent tabular-nums font-medium" />
                <div className="mt-1.5 flex justify-between text-xs tabular-nums">
                  <span className="text-ink-muted">New remaining:</span>
                  <span className="font-medium text-rose-700">{formatCurrency(Math.max(0, quickPayOrder.totalAmount - (parseFloat(quickPayAmount) || 0)))}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Payment Date</label>
                <input type="date" required value={quickPayDate} onChange={(e) => setQuickPayDate(e.target.value)}
                  className="w-full bg-white border border-border-ui rounded-md px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-ui">
                <button type="button" onClick={() => setQuickPayOrder(null)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-ink-muted hover:text-ink">Cancel</button>
                <button type="submit" disabled={quickPaySubmitting}
                  className="px-4 py-1.5 rounded-md bg-accent hover:bg-accent-hover text-white font-medium text-xs disabled:opacity-50">
                  {quickPaySubmitting ? "Updating..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ORDER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white border border-border-ui rounded-md max-w-3xl w-full p-5 space-y-4 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-ui pb-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">{isEditMode ? "Edit Order" : "New Customer Order"}</h3>
                <p className="text-xs text-ink-muted">Customer details, articles, and payment</p>
              </div>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-stone-400 hover:text-ink"><X className="w-5 h-5" /></button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Customer */}
              <div className="p-3.5 rounded-md bg-stone-50 border border-stone-200 space-y-3">
                <span className="text-[11px] font-medium text-ink-muted">Customer Information</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-ink-muted mb-1 font-medium">Customer Name *</label>
                    <input type="text" required placeholder="e.g. Ram Bahadur" value={formCustomerName}
                      onChange={(e) => setFormCustomerName(e.target.value)}
                      className="w-full bg-white border border-border-ui rounded-md px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ink-muted mb-1 font-medium">Phone</label>
                    <input type="text" placeholder="9841234567" value={formCustomerPhone}
                      onChange={(e) => setFormCustomerPhone(e.target.value)}
                      className="w-full bg-white border border-border-ui rounded-md px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-ink-muted mb-1 font-medium">Address / City</label>
                  <input type="text" placeholder="e.g. Kalimati, Kathmandu" value={formCustomerAddress}
                    onChange={(e) => setFormCustomerAddress(e.target.value)}
                    className="w-full bg-white border border-border-ui rounded-md px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent" />
                </div>
              </div>

              {/* Articles */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-ink-muted">Order Articles ({formItems.length})</span>
                  <button type="button" onClick={handleAddItem}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent/10 hover:bg-accent/20 text-accent font-medium text-xs transition-colors">
                    <Plus className="w-3 h-3" /> Add Article
                  </button>
                </div>

                {formItems.map((item, idx) => {
                  const itemTotal = calcItemTotal(item);
                  return (
                    <div key={idx} className="p-3 rounded-md bg-stone-50 border border-stone-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-ink-muted">Article #{idx + 1}</span>
                        {formItems.length > 1 && (
                          <button type="button" onClick={() => handleRemoveItem(idx)}
                            className="text-stone-400 hover:text-rose-600 text-xs flex items-center gap-1 transition-colors">
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end">
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] text-ink-muted mb-1 font-medium">Article Code *</label>
                          <input type="text" required placeholder="ART-902" value={item.articleCode}
                            onChange={(e) => handleItemChange(idx, "articleCode", e.target.value.toUpperCase())}
                            className="w-full bg-white border border-border-ui rounded-md px-2 py-1.5 text-xs text-ink focus:outline-none focus:border-accent tabular-nums font-medium uppercase" />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] text-ink-muted mb-1 font-medium">Model</label>
                          <input type="text" placeholder="Trekker Boot" value={item.articleName}
                            onChange={(e) => handleItemChange(idx, "articleName", e.target.value)}
                            className="w-full bg-white border border-border-ui rounded-md px-2 py-1.5 text-xs text-ink focus:outline-none focus:border-accent" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] text-ink-muted mb-1 font-medium">Color *</label>
                          <input type="text" required placeholder="Black" value={item.color}
                            onChange={(e) => handleItemChange(idx, "color", e.target.value)}
                            className="w-full bg-white border border-border-ui rounded-md px-2 py-1.5 text-xs text-ink focus:outline-none focus:border-accent" />
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] text-ink-muted mb-1 font-medium">Sizes *</label>
                          <input type="text" required placeholder="38, 39, 40, 41, 42" value={item.sizes}
                            onChange={(e) => handleItemChange(idx, "sizes", e.target.value)}
                            className="w-full bg-white border border-border-ui rounded-md px-2 py-1.5 text-xs text-ink focus:outline-none focus:border-accent" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 items-end">
                        <div>
                          <label className="block text-[10px] text-ink-muted mb-1 font-medium">Qty (Pairs) *</label>
                          <input type="number" min="1" required placeholder="0" value={item.quantityPairs}
                            onChange={(e) => handleItemChange(idx, "quantityPairs", e.target.value)}
                            className="w-full bg-white border border-border-ui rounded-md px-2 py-1.5 text-xs text-ink focus:outline-none focus:border-accent tabular-nums font-medium" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-ink-muted mb-1 font-medium">Price/Pair ({CURRENCY})</label>
                          <input type="number" step="0.5" min="0" placeholder="0.00" value={item.pricePerPair}
                            onChange={(e) => handleItemChange(idx, "pricePerPair", e.target.value)}
                            className="w-full bg-white border border-border-ui rounded-md px-2 py-1.5 text-xs text-ink focus:outline-none focus:border-accent tabular-nums font-medium" />
                        </div>
                        <div className="text-right pb-1">
                          <span className="block text-[9px] text-ink-muted font-medium">Line Total</span>
                          <span className="tabular-nums font-semibold text-sm text-ink">{formatCurrency(itemTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button type="button" onClick={handleAddItem}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-stone-50 hover:bg-stone-100 border border-dashed border-stone-300 hover:border-accent text-xs font-medium text-ink-muted hover:text-ink transition-all w-full justify-center">
                  <Plus className="w-3.5 h-3.5" /> Add Another Article
                </button>
              </div>

              {/* Payment */}
              <div className="p-3.5 rounded-md bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-ink-muted">Payment Status ({CURRENCY})</span>
                  <span className="text-xs font-semibold tabular-nums text-ink">Total: {formatCurrency(formGrandTotal)}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => handlePaymentOptionSelect("PAID")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-all ${
                      formPaymentOption === "PAID" ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "bg-white border-border-ui text-ink-muted hover:text-ink hover:border-stone-300"
                    }`}>
                    <span>●</span><span>Fully Paid</span>
                  </button>
                  <button type="button" onClick={() => handlePaymentOptionSelect("PARTIAL")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-all ${
                      formPaymentOption === "PARTIAL" ? "bg-amber-50 border-amber-400 text-amber-700" : "bg-white border-border-ui text-ink-muted hover:text-ink hover:border-stone-300"
                    }`}>
                    <span>◐</span><span>Partial</span>
                  </button>
                  <button type="button" onClick={() => handlePaymentOptionSelect("UNPAID")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-all ${
                      formPaymentOption === "UNPAID" ? "bg-rose-50 border-rose-400 text-rose-700" : "bg-white border-border-ui text-ink-muted hover:text-ink hover:border-stone-300"
                    }`}>
                    <span>○</span><span>Unpaid</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end pt-1">
                  <div>
                    <label className="block text-[10px] text-ink-muted mb-1 font-medium">Amount Paid ({CURRENCY})</label>
                    <input type="number" step="0.5" min="0"
                      disabled={formPaymentOption === "PAID" || formPaymentOption === "UNPAID"}
                      placeholder="0.00" value={formAmountPaid}
                      onChange={(e) => setFormAmountPaid(e.target.value)}
                      className={`w-full border rounded-md px-3 py-1.5 text-sm tabular-nums font-medium focus:outline-none ${
                        formPaymentOption === "PAID" ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                        : formPaymentOption === "UNPAID" ? "bg-rose-50 border-rose-300 text-rose-700"
                        : "bg-white border-border-ui text-ink focus:border-accent"
                      }`} />
                    {formPaymentOption === "PARTIAL" && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <button type="button" onClick={() => setFormAmountPaid(Math.round(formGrandTotal * 0.25))}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 border border-border-ui text-ink-muted hover:text-ink">25%</button>
                        <button type="button" onClick={() => setFormAmountPaid(Math.round(formGrandTotal * 0.5))}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 border border-border-ui text-ink-muted hover:text-ink">50%</button>
                        <button type="button" onClick={() => setFormAmountPaid(Math.round(formGrandTotal * 0.75))}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 border border-border-ui text-ink-muted hover:text-ink">75%</button>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <span className="block text-[9px] text-ink-muted font-medium">Order Total</span>
                    <span className="tabular-nums font-semibold text-xl text-ink">{formatCurrency(formGrandTotal)}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] text-ink-muted font-medium">Remaining</span>
                    <span className={`tabular-nums font-semibold text-xl ${formRemaining <= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {formatCurrency(formRemaining > 0 ? formRemaining : 0)}
                    </span>
                  </div>
                </div>

                {formPaymentOption !== "UNPAID" && (
                  <div className="pt-2 border-t border-stone-200">
                    <label className="block text-[10px] text-ink-muted mb-1 font-medium">Payment Date *</label>
                    <input type="date" value={formPaymentDate} onChange={(e) => setFormPaymentDate(e.target.value)}
                      className="w-full sm:w-1/2 bg-white border border-border-ui rounded-md px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-accent" />
                  </div>
                )}
              </div>

              {/* Dates & Status */}
              <div className="p-3.5 rounded-md bg-stone-50 border border-stone-200 space-y-2.5">
                <span className="text-[11px] font-medium text-ink-muted">Dates & Status</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-ink-muted mb-1 font-medium">Order Date</label>
                    <input type="date" value={formOrderDate} onChange={(e) => setFormOrderDate(e.target.value)}
                      className="w-full bg-white border border-border-ui rounded-md px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ink-muted mb-1 font-medium">Expected Delivery</label>
                    <input type="date" value={formDeliveryDate} onChange={(e) => setFormDeliveryDate(e.target.value)}
                      className="w-full bg-white border border-border-ui rounded-md px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent" />
                  </div>
                  {isEditMode && (
                    <div>
                      <label className="block text-[10px] text-ink-muted mb-1 font-medium">Status</label>
                      <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}
                        className="w-full bg-white border border-border-ui rounded-md px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent font-medium">
                        {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Notes</label>
                <input type="text" placeholder="e.g. Urgent order, customer requested brown laces..." value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-white border border-border-ui rounded-md px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-accent" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-ui">
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-ink-muted hover:text-ink">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="px-5 py-2 rounded-md bg-accent hover:bg-accent-hover text-white font-medium text-xs disabled:opacity-50">
                  {submitting ? "Saving..." : isEditMode ? "Update Order" : `Create Order (${formatCurrency(formGrandTotal)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
