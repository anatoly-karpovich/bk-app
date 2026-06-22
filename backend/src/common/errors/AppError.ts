export interface AppErrorOptions {
  cause?: unknown;
  code?: string;
  details?: unknown;
  expose?: boolean;
  statusCode: number;
}

export class AppError extends Error {
  public readonly cause?: unknown;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly expose: boolean;
  public readonly statusCode: number;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = new.target.name;
    this.cause = options.cause;
    this.code = options.code ?? "app_error";
    this.details = options.details;
    this.expose = options.expose ?? true;
    this.statusCode = options.statusCode;
  }
}
