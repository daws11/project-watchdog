import type { Request, Response, NextFunction } from "express";

/**
 * Middleware to log all requests for audit trail
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const start = Date.now();

  // Log after response finishes
  res.on("finish", () => {
    const duration = Date.now() - start;
    const user = req.user?.email || "anonymous";
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    console.log({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      user,
      ip,
    });
  });

  next();
};
