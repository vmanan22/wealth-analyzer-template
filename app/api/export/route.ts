import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await requireUserId();
  const [user, assets, liabilities, goals, imports, auditLogs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, createdAt: true } }),
    prisma.asset.findMany({ where: { userId }, include: { snapshots: true, transactions: true } }),
    prisma.liability.findMany({ where: { userId }, include: { snapshots: true } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.importBatch.findMany({ where: { userId } }),
    prisma.auditLog.findMany({ where: { userId } })
  ]);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    user,
    assets,
    liabilities,
    goals,
    imports,
    auditLogs
  });
}
