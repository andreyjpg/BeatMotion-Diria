import { writeFileSync } from "node:fs";

type Stats = { read: number; imported: number; skipped: number };
type Note = { area: string; message: string };

/** Counts per destination table plus every warning, printed at the end and saved as JSON. */
export class Report {
  private readonly tables = new Map<string, Stats>();
  private readonly warnings: Note[] = [];

  private stats(table: string): Stats {
    let stats = this.tables.get(table);
    if (!stats) {
      stats = { read: 0, imported: 0, skipped: 0 };
      this.tables.set(table, stats);
    }
    return stats;
  }

  read(table: string) {
    this.stats(table).read++;
  }

  imported(table: string) {
    this.stats(table).imported++;
  }

  skipped(table: string, message: string) {
    this.stats(table).skipped++;
    this.warn(table, `SKIPPED ${message}`);
  }

  warn(area: string, message: string) {
    this.warnings.push({ area, message });
  }

  get skippedCount() {
    return [...this.tables.values()].reduce((sum, s) => sum + s.skipped, 0);
  }

  print() {
    console.log("\n=== Summary ===");
    console.table(Object.fromEntries(this.tables));

    const byArea = new Map<string, string[]>();
    for (const { area, message } of this.warnings) {
      byArea.set(area, [...(byArea.get(area) ?? []), message]);
    }
    if (byArea.size === 0) {
      console.log("No warnings.");
      return;
    }
    console.log("\n=== Warnings (first 5 per area; all of them are in the JSON report) ===");
    for (const [area, messages] of byArea) {
      console.log(`\n[${area}] ${messages.length}`);
      for (const message of messages.slice(0, 5)) console.log(`  - ${message}`);
      if (messages.length > 5) console.log(`  … ${messages.length - 5} more`);
    }
  }

  save(dryRun: boolean): string {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = `migration-report-${stamp}${dryRun ? "-dry-run" : ""}.json`;
    writeFileSync(
      file,
      JSON.stringify({ dryRun, tables: Object.fromEntries(this.tables), warnings: this.warnings }, null, 2),
    );
    return file;
  }
}
