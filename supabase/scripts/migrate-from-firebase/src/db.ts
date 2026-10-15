import { readFileSync } from "node:fs";
import pg from "pg";
import type { Report } from "./report.js";

export type Row = Record<string, unknown>;

/** Where imported rows go: Postgres for a real run, nowhere for a dry run. */
export interface Sink {
  /** Checks the connection early, before anything is written anywhere. */
  connect(): Promise<void>;
  begin(): Promise<void>;
  /** Insert or update by `conflict` columns. Returns false (and reports why) if the row was rejected. */
  upsert(table: string, row: Row, conflict: string[], label: string): Promise<boolean>;
  update(table: string, id: string, fields: Row, label: string): Promise<boolean>;
  finish(commit: boolean): Promise<void>;
}

export class DrySink implements Sink {
  constructor(private readonly report: Report) {}
  async connect() {}
  async begin() {}
  async upsert(table: string) {
    this.report.imported(table);
    return true;
  }
  async update(table: string) {
    this.report.imported(table);
    return true;
  }
  async finish() {}
}

const ident = (name: string) => `"${name.replace(/"/g, '""')}"`;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DB_URL_HINT = 'SUPABASE_DB_URL must be the "Session pooler" string from the Supabase dashboard (Connect button).';

const defined = (row: Row) => Object.entries(row).filter(([, value]) => value !== undefined);

/**
 * Imports everything in ONE transaction, so a failed run leaves the database
 * untouched. Triggers are disabled for the duration: historical rows must not
 * create memberships, re-stamp fees or send push notifications. Each row runs
 * in a savepoint, so a rejected row is reported and skipped without aborting
 * the rest.
 */
export class PgSink implements Sink {
  private readonly client: pg.Client;
  private connected = false;
  private tables: string[] = [];

  constructor(
    connectionString: string,
    caCertPath: string | undefined,
    private readonly report: Report,
  ) {
    try {
      this.client = new pg.Client({
        connectionString,
        ssl: caCertPath ? { ca: readFileSync(caCertPath, "utf8") } : { rejectUnauthorized: false },
      });
    } catch (error) {
      throw new Error(
        `SUPABASE_DB_URL is not a valid connection string (${error instanceof Error ? error.message : error}). ` +
          "If the database password has special characters, URL-encode them in the string: " +
          "# -> %23, / -> %2F, ? -> %3F, @ -> %40, % -> %25, : -> %3A.",
      );
    }
  }

  /** host:port the client actually uses (after parsing SUPABASE_DB_URL). */
  get target() {
    return `${this.client.host}:${this.client.port}`;
  }

  async connect() {
    if (this.connected) return;
    try {
      await this.client.connect();
      this.connected = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      let hint = DB_URL_HINT;
      if (/password authentication failed/i.test(message)) {
        const password = String(this.client.password ?? "");
        hint = /^\[.*\]$/.test(password)
          ? "The password in SUPABASE_DB_URL still has the square brackets from [YOUR-PASSWORD]; remove them."
          : "The password in SUPABASE_DB_URL is wrong. It's the database password chosen when the project was " +
            "created (not your Supabase login or an API key). Reset it in Project Settings > Database if needed, " +
            "then wait a minute or two before retrying.";
      } else if (LOCAL_HOSTS.has(this.client.host)) {
        hint = `${this.target} is a database on this computer, not your Supabase project. ${DB_URL_HINT}`;
      } else if (/does not support SSL/i.test(message)) {
        hint = `That server doesn't accept encrypted connections, so it isn't your Supabase database. ${DB_URL_HINT}`;
      }
      throw new Error(`Could not connect to the database at ${this.target} (${message}). ${hint}`);
    }
  }

  async begin() {
    await this.connect();
    await this.client.query("begin");
    const { rows } = await this.client.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public'",
    );
    this.tables = rows.map((r) => r.tablename);
    for (const table of this.tables) {
      await this.client.query(`alter table public.${ident(table)} disable trigger user`);
    }
  }

  async upsert(table: string, row: Row, conflict: string[], label: string) {
    const entries = defined(row);
    const columns = entries.map(([column]) => column);
    const updates = columns.filter((column) => !conflict.includes(column));
    const sql =
      `insert into public.${ident(table)} (${columns.map(ident).join(", ")}) ` +
      `values (${columns.map((_, i) => `$${i + 1}`).join(", ")}) ` +
      `on conflict (${conflict.map(ident).join(", ")}) do ` +
      (updates.length ? `update set ${updates.map((c) => `${ident(c)} = excluded.${ident(c)}`).join(", ")}` : "nothing");
    return this.run(table, label, sql, entries.map(([, value]) => value));
  }

  async update(table: string, id: string, fields: Row, label: string) {
    const entries = defined(fields);
    const sql =
      `update public.${ident(table)} set ${entries.map(([column], i) => `${ident(column)} = $${i + 1}`).join(", ")} ` +
      `where id = $${entries.length + 1}`;
    return this.run(table, label, sql, [...entries.map(([, value]) => value), id], true);
  }

  private async run(table: string, label: string, sql: string, values: unknown[], mustMatch = false) {
    await this.client.query("savepoint import_row");
    try {
      const result = await this.client.query(sql, values);
      if (mustMatch && result.rowCount === 0) throw new Error("row not found");
      await this.client.query("release savepoint import_row");
      this.report.imported(table);
      return true;
    } catch (error) {
      await this.client.query("rollback to savepoint import_row");
      this.report.skipped(table, `${label}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async finish(commit: boolean) {
    try {
      if (commit) {
        for (const table of this.tables) {
          await this.client.query(`alter table public.${ident(table)} enable trigger user`);
        }
        await this.client.query("commit");
      } else {
        await this.client.query("rollback");
      }
    } finally {
      if (this.connected) await this.client.end();
    }
  }
}
