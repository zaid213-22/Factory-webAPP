import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/orders - List all orders with items
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");

    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (paymentStatus && paymentStatus !== "ALL") where.paymentStatus = paymentStatus;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/orders - Create order with multiple article items
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderCode,
      customerName,
      customerPhone,
      customerAddress,
      amountPaid,
      orderDate,
      deliveryDate,
      notes,
      items,
    } = body;

    if (!customerName || !customerName.trim()) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one article item is required" }, { status: 400 });
    }

    // Validate items
    const validItems: any[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.articleCode || !it.articleCode.trim()) continue;
      if (!it.color || !it.color.trim()) continue;
      if (!it.sizes || !it.sizes.trim()) continue;

      const qty = parseInt(it.quantityPairs, 10) || 0;
      const price = parseFloat(it.pricePerPair) || 0;
      if (qty <= 0) continue;

      const lineTotal = Number((qty * price).toFixed(2));
      validItems.push({
        articleCode: it.articleCode.trim().toUpperCase(),
        articleName: it.articleName?.trim() || null,
        color: it.color.trim(),
        sizes: it.sizes.trim(),
        quantityPairs: qty,
        pricePerPair: price,
        lineTotal,
        notes: it.notes?.trim() || null,
      });
    }

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: "At least one valid article with code, color, sizes, and quantity is required" },
        { status: 400 }
      );
    }

    const totalAmount = validItems.reduce((s: number, it: any) => s + it.lineTotal, 0);
    const paid = parseFloat(amountPaid) || 0;
    const remaining = Number((totalAmount - paid).toFixed(2));

    let paymentStatus = "UNPAID";
    if (paid >= totalAmount && totalAmount > 0) paymentStatus = "PAID";
    else if (paid > 0) paymentStatus = "PARTIAL";

    // Auto-generate order code
    let finalCode = orderCode?.trim().toUpperCase();
    if (!finalCode) {
      const count = await prisma.order.count();
      finalCode = `ORD-${String(count + 1).padStart(3, "0")}`;
    }

    const existing = await prisma.order.findUnique({ where: { orderCode: finalCode } });
    if (existing) {
      return NextResponse.json({ error: `Order code ${finalCode} already exists` }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        orderCode: finalCode,
        customerName: customerName.trim(),
        customerPhone: customerPhone?.trim() || null,
        customerAddress: customerAddress?.trim() || null,
        totalAmount,
        amountPaid: paid,
        amountRemaining: remaining < 0 ? 0 : remaining,
        status: "PENDING",
        paymentStatus,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        paymentDate: paid > 0 ? (body.paymentDate ? new Date(body.paymentDate) : new Date()) : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        notes: notes?.trim() || null,
        items: {
          create: validItems,
        },
      },
      include: { items: true },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/orders - Update order (payment, status, items)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, items, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // If items are provided, rebuild them
    let totalAmount = existing.totalAmount;
    if (items && Array.isArray(items)) {
      // Delete old items and recreate
      await prisma.orderItem.deleteMany({ where: { orderId: id } });

      const validItems: any[] = [];
      for (const it of items) {
        if (!it.articleCode || !it.articleCode.trim()) continue;
        const qty = parseInt(it.quantityPairs, 10) || 0;
        const price = parseFloat(it.pricePerPair) || 0;
        if (qty <= 0) continue;
        const lineTotal = Number((qty * price).toFixed(2));
        validItems.push({
          orderId: id,
          articleCode: it.articleCode.trim().toUpperCase(),
          articleName: it.articleName?.trim() || null,
          color: (it.color || "").trim(),
          sizes: (it.sizes || "").trim(),
          quantityPairs: qty,
          pricePerPair: price,
          lineTotal,
          notes: it.notes?.trim() || null,
        });
      }

      if (validItems.length > 0) {
        await prisma.orderItem.createMany({ data: validItems });
        totalAmount = validItems.reduce((s: number, it: any) => s + it.lineTotal, 0);
      }
    }

    const paid = updates.amountPaid !== undefined ? parseFloat(updates.amountPaid) : existing.amountPaid;
    const remaining = Number((totalAmount - paid).toFixed(2));

    let paymentStatus = "UNPAID";
    if (paid >= totalAmount && totalAmount > 0) paymentStatus = "PAID";
    else if (paid > 0) paymentStatus = "PARTIAL";

    const updateData: any = {};
    if (updates.customerName) updateData.customerName = updates.customerName.trim();
    if (updates.customerPhone !== undefined) updateData.customerPhone = updates.customerPhone?.trim() || null;
    if (updates.customerAddress !== undefined) updateData.customerAddress = updates.customerAddress?.trim() || null;
    if (updates.status) updateData.status = updates.status;
    if (updates.deliveryDate) updateData.deliveryDate = new Date(updates.deliveryDate);
    if (updates.notes !== undefined) updateData.notes = updates.notes?.trim() || null;
    if (updates.status === "DELIVERED" && !existing.deliveredDate) {
      updateData.deliveredDate = new Date();
    }

    updateData.totalAmount = totalAmount;
    updateData.amountPaid = paid;
    updateData.amountRemaining = remaining < 0 ? 0 : remaining;
    updateData.paymentStatus = paymentStatus;

    if (updates.paymentDate !== undefined) {
      updateData.paymentDate = updates.paymentDate ? new Date(updates.paymentDate) : null;
    } else if (paid > 0 && !existing.paymentDate) {
      updateData.paymentDate = new Date();
    } else if (paid === 0) {
      updateData.paymentDate = null;
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });

    return NextResponse.json(order);
  } catch (error: any) {
    console.error("PUT /api/orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/orders?id=...
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
