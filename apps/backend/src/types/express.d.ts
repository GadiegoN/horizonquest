export {};

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; profileId?: string; role: string };
    }
  }
}
