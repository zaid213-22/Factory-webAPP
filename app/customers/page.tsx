"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Phone,
  MapPin,
  Package,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Download,
  Plus,
  ShoppingBag,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  RotateCcw,
  Sparkles,
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

interface CustomerSummary {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  totalOrders: number;
  totalPairs: number;
  totalBilled: number;
  totalPaid: number;
  totalRemaining: number;
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
  lastPaymentDate?: string | null;
  articles: Array<{
    articleCode: string;
    articleName?: string;
    color: string;
    sizes: string;
    quantity: number;
    amount: number;
  }>;
  orders: OrderData[];
}

export default function CustomersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dueFilter, setDueFilter] = useState<"ALL" | "HAS_DUE" | "SETTLED">("ALL");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  // Payment Modal
  const [payOrder, setPayOrder] = useState<OrderData | null>(null);
  const [payPaymentOption, setPayPaymentOption] = useState<"PAID" | "PARTIAL" | "UNPAID">("PARTIAL");
  const [payAmount, setPayAmount] = useState<string>("");
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

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

  // Group all orders by customer
  const customers = useMemo(() => {
    const map = new Map<string, CustomerSummary>();

    for (const order of orders) {
      const nameKey = order.customerName.trim().toLowerCase();
      const existing = map.get(nameKey);

      const pairsInOrder = order.items.reduce(
        (sum, it) => sum + (parseInt(String(it.quantityPairs), 10) || 0),
        0
      );

      if (!existing) {
        const articlesList: CustomerSummary["articles"] = [];
        for (const it of order.items) {
          articlesList.push({
            articleCode: it.articleCode,
            articleName: it.articleName || "",
            color: it.color,
            sizes: it.sizes,
            quantity: parseInt(String(it.quantityPairs), 10) || 0,
            amount: it.lineTotal || 0,
          });
        }

        map.set(nameKey, {
          customerName: order.customerName.trim(),
          customerPhone: order.customerPhone || "",
          customerAddress: order.customerAddress || "",
          totalOrders: 1,
          totalPairs: pairsInOrder,
          totalBilled: order.totalAmount,
          totalPaid: order.amountPaid,
          totalRemaining: order.amountRemaining,
          paymentStatus:
            order.amountRemaining <= 0
              ? "PAID"
              : order.amountPaid > 0
              ? "PARTIAL"
              : "UNPAID",
          lastPaymentDate: order.paymentDate || null,
          articles: articlesList,
          orders: [order],
        });
      } else {
        existing.totalOrders += 1;
        existing.totalPairs += pairsInOrder;
        existing.totalBilled += order.totalAmount;
        existing.totalPaid += order.amountPaid;
        existing.totalRemaining += order.amountRemaining;
        if (!existing.customerPhone && order.customerPhone) existing.customerPhone = order.customerPhone;
        if (!existing.customerAddress && order.customerAddress) existing.customerAddress = order.customerAddress;

        if (order.paymentDate) {
          if (!existing.lastPaymentDate || new Date(order.paymentDate) > new Date(existing.lastPaymentDate)) {
            existing.lastPaymentDate = order.paymentDate;
          }
        }

        // Merge articles
        for (const it of order.items) {
          const found = existing.articles.find(
            (a) => a.articleCode === it.articleCode && a.color === it.color && a.sizes === it.sizes
          );
          if (found) {
            found.quantity += parseInt(String(it.quantityPairs), 10) || 0;
            found.amount += it.lineTotal || 0;
          } else {
            existing.articles.push({
              articleCode: it.articleCode,
              articleName: it.articleName || "",
              color: it.color,
              sizes: it.sizes,
              quantity: parseInt(String(it.quantityPairs), 10) || 0,
              amount: it.lineTotal || 0,
            });
          }
        }

        existing.orders.push(order);
        existing.paymentStatus =
          existing.totalRemaining <= 0
            ? "PAID"
            : existing.totalPaid > 0
            ? "PARTIAL"
            : "UNPAID";
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [orders]);

  // Filters
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (dueFilter === "HAS_DUE" && c.totalRemaining <= 0) return false;
      if (dueFilter === "SETTLED" && c.totalRemaining > 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.customerName.toLowerCase().includes(q) ||
          c.customerPhone.includes(q) ||
          c.customerAddress.toLowerCase().includes(q) ||
          c.articles.some(
            (a) =>
              a.articleCode.toLowerCase().includes(q) ||
              (a.articleName || "").toLowerCase().includes(q) ||
              a.color.toLowerCase().includes(q)
          )
        );
      }
      return true;
    });
  }, [customers, dueFilter, searchQuery]);

  // Overall totals
  const totalBilledAll = customers.reduce((sum, c) => sum + c.totalBilled, 0);
  const totalPaidAll = customers.reduce((sum, c) => sum + c.totalPaid, 0);
  const totalDueAll = customers.reduce((sum, c) => sum + c.totalRemaining, 0);
  const totalPairsAll = customers.reduce((sum, c) => sum + c.totalPairs, 0);
  const customersWithDue = customers.filter((c) => c.totalRemaining > 0).length;

  const handleOpenPayModal = (order: OrderData) => {
    setPayOrder(order);
    if (order.amountRemaining <= 0 && order.totalAmount > 0) {
      setPayPaymentOption("PAID");
      setPayAmount(String(order.totalAmount));
    } else if (order.amountPaid > 0) {
      setPayPaymentOption("PARTIAL");
      setPayAmount(String(order.amountPaid));
    } else {
      setPayPaymentOption("UNPAID");
      setPayAmount("0");
    }
    setPayDate(order.paymentDate ? new Date(order.paymentDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  };

  const handlePaymentOptionSelect = (opt: "PAID" | "PARTIAL" | "UNPAID") => {
    setPayPaymentOption(opt);
    if (!payOrder) return;
    if (opt === "PAID") {
      setPayAmount(String(payOrder.totalAmount));
    } else if (opt === "UNPAID") {
      setPayAmount("0");
    } else if (opt === "PARTIAL") {
      if (payAmount === "0" || payAmount === String(payOrder.totalAmount)) {
        setPayAmount(String(Math.round(payOrder.totalAmount * 0.5)));
      }
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payOrder) return;
    try {
      setPaySubmitting(true);
      let paid = 0;
      if (payPaymentOption === "PAID") {
        paid = payOrder.totalAmount;
      } else if (payPaymentOption === "UNPAID") {
        paid = 0;
      } else {
        paid = parseFloat(payAmount) || 0;
      }

      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: payOrder.id,
          amountPaid: paid,
          paymentDate: paid > 0 ? (payDate || new Date().toISOString()) : null,
        }),
      });

      if (res.ok) {
        setPayOrder(null);
        setSuccessMsg(`Payment recorded for ${payOrder.orderCode} on ${payDate}.`);
        setTimeout(() => setSuccessMsg(""), 3500);
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPaySubmitting(false);
    }
  };

  // Quick 1-click settle or reset
  const handleQuickSettleOrder = async (order: OrderData, type: "PAID" | "UNPAID") => {
    try {
      const paid = type === "PAID" ? order.totalAmount : 0;
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: order.id,
          amountPaid: paid,
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

  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) return alert("No customer records to export.");
    const headers = [
      "Customer Name",
      "Phone",
      "Address / City",
      "Total Orders",
      "Total Pairs Ordered",
      "Articles Ordered",
      `Total Billed (${CURRENCY})`,
      `Total Paid (${CURRENCY})`,
      `Total Due / To Pay (${CURRENCY})`,
      "Payment Status",
      "Last Payment Date",
    ];

    const rows = [
      headers,
      ...filteredCustomers.map((c) => [
        c.customerName,
        c.customerPhone || "",
        c.customerAddress || "",
        String(c.totalOrders),
        String(c.totalPairs),
        c.articles.map((a) => `${a.articleCode} (${a.color}, ${a.quantity} pairs)`).join("; "),
        c.totalBilled.toFixed(2),
        c.totalPaid.toFixed(2),
        c.totalRemaining.toFixed(2),
        c.paymentStatus,
        c.lastPaymentDate ? new Date(c.lastPaymentDate).toLocaleDateString() : "N/A",
      ]),
    ];

    downloadCSV(`himalaya-customers-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-ui pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-ink">Customer Ledger & Accounts</h1>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent font-medium tabular-nums rounded">
              {customers.length} Customers
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Customer order history, article summaries, payment tracking (Paid, Partially Paid, Unpaid), and payment dates in {CURRENCY}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-white border border-border-ui text-ink-muted hover:text-ink text-xs font-medium transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-orange-400" />
            <span>Go to Order Book</span>
          </Link>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-white border border-border-ui text-ink-muted hover:text-ink text-xs font-medium transition-colors"
          >
            <Download className="w-4 h-4 text-orange-400" />
            <span>Export Ledgers (CSV)</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-md bg-emerald-950/90 border border-emerald-500/50 text-sm text-emerald-200 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-700 hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="panel panel-hover p-4 rounded-md space-y-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500" />
          <span className="text-[10px] font-medium text-teal-700 tabular-nums">Total Customers</span>
          <span className="text-2xl font-black text-ink tabular-nums block">{customers.length}</span>
          <span className="text-[11px] text-ink-muted block font-medium">Registered buyers</span>
        </div>

        <div className="panel panel-hover p-4 rounded-md space-y-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />
          <span className="text-[10px] font-medium text-orange-400 tabular-nums">Total Billed</span>
          <span className="text-2xl font-black text-orange-400 tabular-nums block">{formatCurrency(totalBilledAll)}</span>
          <span className="text-[11px] text-ink-muted block font-medium">Lifetime orders</span>
        </div>

        <div className="panel panel-hover p-4 rounded-md space-y-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <span className="text-[10px] font-medium text-emerald-700 tabular-nums">Total Collected</span>
          <span className="text-2xl font-black text-emerald-700 tabular-nums block">{formatCurrency(totalPaidAll)}</span>
          <span className="text-[11px] text-emerald-700 block font-medium">Payments received</span>
        </div>

        <div className="panel panel-hover p-4 rounded-md space-y-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <span className="text-[10px] font-medium text-rose-600 tabular-nums">Total Remaining Due</span>
          <span className="text-2xl font-black text-rose-600 tabular-nums block">{formatCurrency(totalDueAll)}</span>
          <span className="text-[11px] text-rose-600 block font-medium">{customersWithDue} customer(s) with dues</span>
        </div>

        <div className="panel panel-hover p-4 rounded-md space-y-1 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <span className="text-[10px] font-medium text-purple-400 tabular-nums">Total Pairs Ordered</span>
          <span className="text-2xl font-black text-ink tabular-nums block">{totalPairsAll.toLocaleString()}</span>
          <span className="text-[11px] text-ink-muted block font-medium">Shoe units ordered</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="panel p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, phone, city, or article code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-border-ui rounded-md text-sm text-ink placeholder-stone-400 focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-white border border-border-ui rounded-md">
            <button
              onClick={() => setDueFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                dueFilter === "ALL"
                  ? "bg-orange-500 text-black  shadow-orange-500/20"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              All Customers ({customers.length})
            </button>
            <button
              onClick={() => setDueFilter("HAS_DUE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                dueFilter === "HAS_DUE"
                  ? "bg-rose-600 text-ink  shadow-rose-600/30"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Has Outstanding Due ({customersWithDue})
            </button>
            <button
              onClick={() => setDueFilter("SETTLED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                dueFilter === "SETTLED"
                  ? "bg-emerald-600 text-ink  shadow-emerald-600/30"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Fully Settled ({customers.length - customersWithDue})
            </button>
          </div>
        </div>
      </div>

      {/* Customer Ledger List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-ink-muted text-sm">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-3" />
          Loading customer statements...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="panel border-dashed rounded-md p-12 text-center space-y-4">
          <Users className="w-10 h-10 text-stone-400 mx-auto" />
          <h3 className="text-sm font-semibold text-ink">No Customer Records Found</h3>
          <p className="text-sm text-ink-muted max-w-md mx-auto">
            Customers will automatically appear here as you record orders in the Order Book.
          </p>
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 font-medium text-black text-xs active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Create Customer Order
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCustomers.map((customer) => {
            const isExpanded = expandedCustomer === customer.customerName;

            return (
              <div
                key={customer.customerName}
                className={`panel rounded-md overflow-hidden  transition-all border ${
                  customer.totalRemaining > 0
                    ? "border-rose-500/20 hover:border-rose-500/40"
                    : "border-border-ui hover:border-emerald-500/30"
                }`}
              >
                {/* Main Customer Summary Row */}
                <div
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none"
                  onClick={() => setExpandedCustomer(isExpanded ? null : customer.customerName)}
                >
                  {/* Left: Customer Info & Articles summary */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 shrink-0 rounded-md bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-teal-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-base shadow-inner">
                      {customer.customerName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg font-black text-ink tracking-tight">{customer.customerName}</h2>
                        {customer.totalRemaining > 0 ? (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-700/60 font-medium tabular-nums">
                            Due: {formatCurrency(customer.totalRemaining)}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-medium tabular-nums">
                            ✓ All Settled
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white text-ink border border-border-ui font-medium">
                          {customer.totalOrders} Order{customer.totalOrders > 1 ? "s" : ""}
                        </span>
                        {customer.lastPaymentDate && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/40 text-emerald-700 border border-emerald-800/40 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Paid: {new Date(customer.lastPaymentDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Contact row */}
                      <div className="flex items-center gap-3 flex-wrap text-xs text-ink-muted font-medium">
                        {customer.customerPhone && (
                          <span className="flex items-center gap-1 text-ink">
                            <Phone className="w-3.5 h-3.5 text-orange-400" />
                            {customer.customerPhone}
                          </span>
                        )}
                        {customer.customerAddress && (
                          <span className="flex items-center gap-1 text-ink-muted">
                            <MapPin className="w-3.5 h-3.5 text-orange-400" />
                            {customer.customerAddress}
                          </span>
                        )}
                      </div>

                      {/* Ordered Articles Preview chips */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[11px] text-ink-muted font-medium">Ordered:</span>
                        {customer.articles.slice(0, 4).map((art, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white text-amber-300 border border-border-ui tabular-nums font-semibold"
                          >
                            {art.articleCode} ({art.color}) × {art.quantity} pairs
                          </span>
                        ))}
                        {customer.articles.length > 4 && (
                          <span className="text-[10px] text-ink-muted">+{customer.articles.length - 4} more</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Financial Statement Box */}
                  <div className="flex items-center gap-4 lg:gap-6 flex-wrap justify-between lg:justify-end border-t lg:border-t-0 border-stone-100 pt-3 lg:pt-0">
                    <div className="text-left lg:text-right space-y-0.5">
                      <span className="text-[10px] font-medium text-ink-muted block">Total Pairs</span>
                      <span className="text-base font-black text-ink tabular-nums">{customer.totalPairs.toLocaleString()} Pairs</span>
                    </div>

                    <div className="text-left lg:text-right space-y-0.5">
                      <span className="text-[10px] font-medium text-ink-muted block">Total Billed</span>
                      <span className="text-base font-black text-orange-400 tabular-nums">{formatCurrency(customer.totalBilled)}</span>
                    </div>

                    <div className="text-left lg:text-right space-y-0.5">
                      <span className="text-[10px] font-medium text-emerald-700 block">Paid</span>
                      <span className="text-base font-black text-emerald-700 tabular-nums">{formatCurrency(customer.totalPaid)}</span>
                    </div>

                    <div className="text-left lg:text-right space-y-0.5 min-w-[110px]">
                      <span className="text-[10px] font-medium text-rose-600 block">To Pay / Due</span>
                      <span className={`text-xl font-black tabular-nums ${customer.totalRemaining > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                        {formatCurrency(customer.totalRemaining)}
                      </span>
                    </div>

                    <div className="text-ink-muted">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-orange-400" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Customer Details: All Articles Breakdown + Order History & Payments */}
                {isExpanded && (
                  <div className="border-t border-border-ui bg-stone-50 p-5 space-y-5">
                    {/* 1. Complete Articles Ordered Summary */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-orange-400" />
                          <h3 className="text-xs font-medium text-ink">
                            Summary of What {customer.customerName} Ordered
                          </h3>
                        </div>
                        <span className="text-xs text-ink-muted tabular-nums font-medium">
                          {customer.totalPairs} Total Pairs
                        </span>
                      </div>

                      <div className="rounded-md bg-stone-100 border border-border-ui overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="text-[10px] uppercase text-ink-muted border-b border-stone-100 bg-white">
                            <tr>
                              <th className="px-4 py-2.5 text-left">Article Code</th>
                              <th className="px-3 py-2.5 text-left">Model Name</th>
                              <th className="px-3 py-2.5 text-left">Color</th>
                              <th className="px-3 py-2.5 text-left">Sizes</th>
                              <th className="px-3 py-2.5 text-right">Total Quantity</th>
                              <th className="px-4 py-2.5 text-right">Total Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-50">
                            {customer.articles.map((art, idx) => (
                              <tr key={idx} className="hover:bg-white/[0.02]">
                                <td className="px-4 py-2.5 tabular-nums font-medium text-amber-700">{art.articleCode}</td>
                                <td className="px-3 py-2.5 text-ink font-semibold">{art.articleName || "—"}</td>
                                <td className="px-3 py-2.5 text-ink font-medium">{art.color}</td>
                                <td className="px-3 py-2.5 text-ink tabular-nums">{art.sizes}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums font-medium text-ink">
                                  {art.quantity} Pairs
                                </td>
                                <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-orange-400">
                                  {formatCurrency(art.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t border-border-ui bg-white">
                            <tr>
                              <td colSpan={4} className="px-4 py-2.5 text-right font-medium text-ink uppercase text-[10px]">
                                Overall Customer Total
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-ink">
                                {customer.totalPairs} Pairs
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-orange-400 text-sm">
                                {formatCurrency(customer.totalBilled)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* 2. Customer Order Invoices & Payment Dates */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-orange-400" />
                          <h3 className="text-xs font-medium text-ink">
                            Order Invoices & Payment Dates ({customer.orders.length})
                          </h3>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {customer.orders.map((order) => (
                          <div
                            key={order.id}
                            className="p-3.5 rounded-md bg-white border border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-white/[0.12] transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="tabular-nums text-xs font-medium text-accent bg-accent/10 px-2.5 py-1 rounded-md border border-accent/20">
                                {order.orderCode}
                              </span>
                              <div className="text-xs">
                                <span className="text-ink font-semibold block">
                                  Ordered: {new Date(order.orderDate).toLocaleDateString()} • {order.items.length} Article(s)
                                </span>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-[11px] text-ink-muted">
                                    Status: <strong className="text-ink">{order.status}</strong>
                                  </span>
                                  {order.paymentDate && (
                                    <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/30">
                                      <Calendar className="w-3 h-3" />
                                      Payment Date: <strong>{new Date(order.paymentDate).toLocaleDateString()}</strong>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 justify-between md:justify-end flex-wrap">
                              <div className="text-right text-xs">
                                <span className="text-ink-muted block text-[10px]">Total / Paid</span>
                                <span className="tabular-nums font-medium text-ink">
                                  {formatCurrency(order.totalAmount)}
                                </span>{" "}
                                /{" "}
                                <span className="tabular-nums font-medium text-emerald-700">
                                  {formatCurrency(order.amountPaid)}
                                </span>
                              </div>

                              <div className="text-right text-xs min-w-[80px]">
                                <span className="text-ink-muted block text-[10px]">Remaining Due</span>
                                <span
                                  className={`tabular-nums font-semibold ${
                                    order.amountRemaining > 0 ? "text-rose-600" : "text-emerald-700"
                                  }`}
                                >
                                  {formatCurrency(order.amountRemaining)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {order.paymentStatus !== "PAID" && (
                                  <button
                                    onClick={() => handleQuickSettleOrder(order, "PAID")}
                                    className="px-2 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 text-[11px] font-medium transition-all active:scale-95"
                                  >
                                    ✓ Full Settle
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenPayModal(order)}
                                  className="px-2.5 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 font-medium text-[11px] active:scale-95 transition-all flex items-center gap-1"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Record Payment</span>
                                </button>
                                {order.paymentStatus !== "UNPAID" && (
                                  <button
                                    onClick={() => handleQuickSettleOrder(order, "UNPAID")}
                                    className="p-1 rounded-lg hover:bg-rose-950/50 text-stone-400 hover:text-rose-600 transition-colors"
                                    title="Reset to Unpaid"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FULL PAYMENT MODAL WITH OPTIONS & PAYMENT DATE */}
      {payOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="panel bg-white border border-border-ui rounded-md max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-ui pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="text-base font-semibold text-ink">Record Customer Payment</h3>
                  <p className="text-xs text-ink-muted">
                    Order: <span className="tabular-nums text-amber-700">{payOrder.orderCode}</span> ({payOrder.customerName})
                  </p>
                </div>
              </div>
              <button onClick={() => setPayOrder(null)} className="text-ink-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4">
              {/* Order Financial Summary */}
              <div className="p-3 rounded-md bg-stone-50 border border-border-ui space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-ink-muted">Total Order Amount:</span>
                  <span className="tabular-nums font-medium text-ink">{formatCurrency(payOrder.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-muted">Currently Paid:</span>
                  <span className="tabular-nums font-medium text-emerald-700">{formatCurrency(payOrder.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-stone-100 pt-1">
                  <span className="text-rose-600 font-medium">Remaining Balance Due:</span>
                  <span className="tabular-nums font-medium text-rose-600">{formatCurrency(payOrder.amountRemaining)}</span>
                </div>
              </div>

              {/* 3 Payment Mode Options */}
              <div className="space-y-1.5">
                <label className="block text-[10px] text-ink-muted font-medium uppercase">Select Payment Option:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePaymentOptionSelect("PAID")}
                    className={`px-2 py-2 rounded-md border text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      payPaymentOption === "PAID"
                        ? "bg-emerald-950 border-emerald-500 text-emerald-300  scale-[1.02]"
                        : "bg-white border-border-ui text-ink-muted hover:text-ink"
                    }`}
                  >
                    <span>🟢</span>
                    <span>Fully Paid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePaymentOptionSelect("PARTIAL")}
                    className={`px-2 py-2 rounded-md border text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      payPaymentOption === "PARTIAL"
                        ? "bg-accent/10 border-accent/20 text-accent  scale-[1.02]"
                        : "bg-white border-border-ui text-ink-muted hover:text-ink"
                    }`}
                  >
                    <span>🟡</span>
                    <span>Partially Paid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePaymentOptionSelect("UNPAID")}
                    className={`px-2 py-2 rounded-md border text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      payPaymentOption === "UNPAID"
                        ? "bg-rose-950 border-rose-500 text-rose-300  scale-[1.02]"
                        : "bg-white border-border-ui text-ink-muted hover:text-ink"
                    }`}
                  >
                    <span>🔴</span>
                    <span>Unpaid</span>
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Amount Paid by Customer ({CURRENCY}) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  disabled={payPaymentOption === "PAID" || payPaymentOption === "UNPAID"}
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 text-base tabular-nums font-medium focus:outline-none ${
                    payPaymentOption === "PAID"
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                      : payPaymentOption === "UNPAID"
                      ? "bg-rose-950/40 border-rose-500/50 text-rose-300"
                      : "bg-white border-border-ui text-ink focus:border-orange-500"
                  }`}
                />

                {payPaymentOption === "PARTIAL" && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(Math.round(payOrder.totalAmount * 0.25)))}
                      className="text-[10px] px-2 py-0.5 rounded bg-white border border-border-ui text-ink hover:text-ink font-medium"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(Math.round(payOrder.totalAmount * 0.5)))}
                      className="text-[10px] px-2 py-0.5 rounded bg-white border border-border-ui text-ink hover:text-ink font-medium"
                    >
                      50% (Half)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayAmount(String(Math.round(payOrder.totalAmount * 0.75)))}
                      className="text-[10px] px-2 py-0.5 rounded bg-white border border-border-ui text-ink hover:text-ink font-medium"
                    >
                      75%
                    </button>
                  </div>
                )}
              </div>

              {/* PAYMENT DATE PICKER */}
              <div>
                <label className="block text-xs font-medium text-ink mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-orange-400" />
                  <span>Payment Date *</span>
                </label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-white border border-border-ui rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div className="flex justify-between text-xs tabular-nums pt-1">
                <span className="text-ink-muted">New Remaining Due:</span>
                <span className="font-medium text-rose-600">
                  {formatCurrency(
                    Math.max(
                      0,
                      payOrder.totalAmount -
                        (payPaymentOption === "PAID"
                          ? payOrder.totalAmount
                          : payPaymentOption === "UNPAID"
                          ? 0
                          : parseFloat(payAmount) || 0)
                    )
                  )}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-ui">
                <button
                  type="button"
                  onClick={() => setPayOrder(null)}
                  className="px-4 py-2 rounded-md text-xs font-semibold text-ink-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="px-5 py-2 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 font-semibold text-black text-xs active:scale-95"
                >
                  {paySubmitting ? "Updating..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
