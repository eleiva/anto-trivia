import { router } from "../trpc";
import { adminRouter } from "./admin";
import { participantRouter } from "./participant";

export const appRouter = router({
  admin: adminRouter,
  participant: participantRouter,
});

export type AppRouter = typeof appRouter;
