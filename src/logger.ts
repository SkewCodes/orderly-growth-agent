import { appendFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

export interface LogEntry {
  timestamp: string;
  phase: string;
  action: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  dryRun: boolean;
  error?: string;
}

export class AuditLogger {
  private logPath: string;
  private console: boolean;

  constructor(logPath: string, consoleOutput: boolean = true) {
    this.logPath = logPath;
    this.console = consoleOutput;
  }

  async log(phase: string, action: string, data: Record<string, unknown> = {}): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      phase,
      action,
      params: data,
      dryRun: (data.dryRun as boolean) ?? false,
      error: data.error as string | undefined,
    };

    const line = JSON.stringify(entry) + "\n";

    const dir = dirname(this.logPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await appendFile(this.logPath, line, "utf-8");

    if (this.console) {
      const prefix = data.dryRun ? "[DRY-RUN]" : "[ACTION]";
      const status = data.error ? `ERROR: ${data.error}` : "OK";
      console.log(`${prefix} ${phase}/${action} — ${status}`);
    }
  }

  async info(message: string): Promise<void> {
    await this.log("info", message);
  }

  async error(phase: string, message: string, error?: Error): Promise<void> {
    await this.log(phase, "error", {
      error: error ? `${error.name}: ${error.message}` : message,
    });
  }
}
