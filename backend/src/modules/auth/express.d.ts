import type { CurrentUser } from "./domain/types";

declare global {
  namespace Express {
    interface Request {
      authUser?: CurrentUser;
    }
  }
}

export {};
