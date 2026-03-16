type LogLevel = "info" | "warn" | "error" | "debug";

type LogContext = Record<string, unknown> & { requestId?: string };

const service = process.env.SERVICE_NAME || "admissions-app";
const env = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";

function write(level: LogLevel, message: string, context: LogContext = {}) {
  const payload = {
    level,
    message,
    service,
    env,
    timestamp: new Date().toISOString(),
    ...context,
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else if (level === "debug") {
    console.debug(line);
  } else {
    console.log(line);
  }
}

export const log = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
  debug: (message: string, context?: LogContext) => write("debug", message, context),
};
