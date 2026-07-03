type LogLevel = "INFO" | "WARN" | "ERROR";

type LogContext = Record<string, unknown>;

function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack
  };
}

function writeLog(level: LogLevel, message: string, context: LogContext = {}): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...context
  };

  const line = JSON.stringify(payload);

  if (level === "ERROR") {
    console.error(line);
    return;
  }

  if (level === "WARN") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  info(message: string, context: LogContext = {}) {
    writeLog("INFO", message, context);
  },

  warn(message: string, context: LogContext = {}) {
    writeLog("WARN", message, context);
  },

  error(message: string, error?: unknown, context: LogContext = {}) {
    writeLog("ERROR", message, {
      ...context,
      error: serializeError(error)
    });
  }
};
