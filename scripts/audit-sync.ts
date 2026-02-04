import { prisma } from "../lib/prisma";
import { list } from "@vercel/blob";
import * as fs from "fs";
import * as path from "path";

interface ExtractionLog {
  fileUrl: string;
}

async function checkSync() {
  const reportPath = path.join(process.cwd(), "sync_report.txt");
  if (fs.existsSync(reportPath)) fs.unlinkSync(reportPath);

  function log(msg: string) {
    fs.appendFileSync(reportPath, msg + "\n");
  }

  log("🔍 RAPPORT DÉTAILLÉ DE SYNCHRONISATION");

  try {
    const dbPayslips = await prisma.payslip.findMany({
      orderBy: { createdAt: "desc" },
    });
    const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
    const extractionLogs = await (
      prisma as unknown as {
        extractionLog: { findMany: () => Promise<ExtractionLog[]> };
      }
    ).extractionLog.findMany();

    log(
      `📊 Stats: DB=${dbPayslips.length}, Blob=${blobs.length}, Logs=${extractionLogs.length}`,
    );

    const blobUrls = new Set(blobs.map((b) => b.url));
    const payslipUrls = new Set(dbPayslips.map((p) => p.fileUrl));

    log("\n--- ÉTAT DES PAYSLIPS ---");
    for (const p of dbPayslips) {
      const hasBlob = blobUrls.has(p.fileUrl);
      const logStatus = extractionLogs.filter(
        (l: ExtractionLog) => l.fileUrl === p.fileUrl,
      );
      log(
        `${hasBlob ? "✅" : "❌"} [${p.id}] ${p.fileName} | Status: ${p.processingStatus} | Logs associated: ${logStatus.length}`,
      );
      if (!hasBlob) log(`   ⚠️ URL MANQUANTE DANS BLOB: ${p.fileUrl}`);
    }

    log("\n--- ÉTAT DES BLOBS ---");
    for (const b of blobs) {
      const hasPayslip = payslipUrls.has(b.url);
      const logStatus = extractionLogs.filter(
        (l: ExtractionLog) => l.fileUrl === b.url,
      );
      log(
        `${hasPayslip ? "✅" : "⚠️"} ${b.pathname} | Has Payslip: ${hasPayslip} | Logs associated: ${logStatus.length}`,
      );
    }

    // Calcul du stockage réel (Vercel) vs perçu (DB)
    const vercelSize = blobs.reduce((acc, b) => acc + b.size, 0);
    const dbSize = dbPayslips.reduce((acc, p) => acc + p.fileSize, 0);
    log(
      `\n📦 Stockage Vercel RÉEL : ${(vercelSize / (1024 * 1024)).toFixed(2)} Mo`,
    );
    log(`📊 Stockage DB PERÇU   : ${(dbSize / (1024 * 1024)).toFixed(2)} Mo`);
    log(
      `💾 Différence : ${((vercelSize - dbSize) / (1024 * 1024)).toFixed(2)} Mo`,
    );
  } catch (error) {
    log(`\n❌ Erreur: ${error}`);
  } finally {
    await prisma.$disconnect();
  }
}

checkSync();
