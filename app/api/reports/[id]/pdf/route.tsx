import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToStream } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { formatRupees } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type ReportContent = {
  title?: string;
  generatedAt?: string;
  summary?: {
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    monthlyCommitments: number;
    debtToAssetRatio: number;
    liquidAssets: number;
    illiquidAssets: number;
  };
  highlights?: string[];
  goals?: { name: string; progressPercent: number }[];
  aiInsight?: { recommendationsJson?: unknown } | null;
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: "#152017", fontFamily: "Helvetica" },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  muted: { color: "#6b665d", marginBottom: 14 },
  section: { marginTop: 18 },
  h2: { fontSize: 14, fontWeight: 700, marginBottom: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "48%", padding: 10, border: "1px solid #e7e2d8", borderRadius: 6 },
  label: { color: "#6b665d", marginBottom: 4 },
  value: { fontSize: 15, fontWeight: 700 },
  line: { paddingVertical: 5, borderBottom: "1px solid #eee9df" },
  disclaimer: { marginTop: 20, padding: 10, backgroundColor: "#f5f7f2", color: "#6b665d" }
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const report = await prisma.report.findFirst({ where: { id, userId } });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const content = report.contentJson as ReportContent;
  const recommendations = ((content.aiInsight as { recommendationsJson?: { recommendations?: { title: string; action: string }[] } } | null)?.recommendationsJson?.recommendations ?? []).slice(0, 5);
  const stream = await renderToStream(
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{content.title ?? "Monthly Wealth Report"}</Text>
        <Text style={styles.muted}>Generated {content.generatedAt ? new Date(content.generatedAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN")}</Text>
        <View style={styles.grid}>
          <View style={styles.tile}><Text style={styles.label}>Net worth</Text><Text style={styles.value}>{formatRupees(content.summary?.netWorth ?? 0, { compact: true })}</Text></View>
          <View style={styles.tile}><Text style={styles.label}>Assets</Text><Text style={styles.value}>{formatRupees(content.summary?.totalAssets ?? 0, { compact: true })}</Text></View>
          <View style={styles.tile}><Text style={styles.label}>Liabilities</Text><Text style={styles.value}>{formatRupees(content.summary?.totalLiabilities ?? 0, { compact: true })}</Text></View>
          <View style={styles.tile}><Text style={styles.label}>Monthly commitments</Text><Text style={styles.value}>{formatRupees(content.summary?.monthlyCommitments ?? 0, { compact: true })}</Text></View>
        </View>
        <View style={styles.section}>
          <Text style={styles.h2}>Highlights</Text>
          {(content.highlights ?? []).map((highlight) => <Text key={highlight} style={styles.line}>{highlight}</Text>)}
        </View>
        <View style={styles.section}>
          <Text style={styles.h2}>Goal Progress</Text>
          {(content.goals ?? []).slice(0, 6).map((goal) => <Text key={goal.name} style={styles.line}>{goal.name}: {goal.progressPercent.toFixed(1)}%</Text>)}
        </View>
        <View style={styles.section}>
          <Text style={styles.h2}>Advisor Notes</Text>
          {recommendations.length ? recommendations.map((item) => <Text key={item.title} style={styles.line}>{item.title}: {item.action}</Text>) : <Text style={styles.line}>Generate an AI advisor insight to include recommendations.</Text>}
        </View>
        <Text style={styles.disclaimer}>Educational report only. This is not SEBI-registered investment advice.</Text>
      </Page>
    </Document>
  );

  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="wealth-report-${report.id}.pdf"`
    }
  });
}
