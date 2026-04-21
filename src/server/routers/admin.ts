import { z } from "zod";
import { SignJWT } from "jose";
import { router, publicProcedure, adminProcedure } from "../trpc";
import { db } from "@/db";
import { sessions, questions, participants, answers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const ADMIN_USER = "antonio";
const ADMIN_PASS = "anto1234";

const SEED_QUESTIONS = [
  {
    questionText: "¿Qué instrumento es este?",
    audioFile: "djembe.mp3",
    orderIndex: 0,
    correctAnswer: "Djembe",
    options: ["Djembe", "Tambor", "Bongó", "Conga"],
  },
  {
    questionText: "¿Qué instrumento es este?",
    audioFile: "tambor.mp3",
    orderIndex: 1,
    correctAnswer: "Tambor",
    options: ["Tambor", "Djembe", "Redoblante", "Tamboril"],
  },
  {
    questionText: "¿Qué instrumento es este?",
    audioFile: "bongoe.mp3",
    orderIndex: 2,
    correctAnswer: "Bongó",
    options: ["Bongó", "Conga", "Djembe", "Pandero"],
  },
  {
    questionText: "¿Qué instrumento es este?",
    audioFile: "conga.mp3",
    orderIndex: 3,
    correctAnswer: "Conga",
    options: ["Conga", "Bongó", "Tambor", "Djembe"],
  },
  {
    questionText: "¿Qué instrumento es este?",
    audioFile: "pandereta.mp3",
    orderIndex: 4,
    correctAnswer: "Pandereta",
    options: ["Pandereta", "Pandero", "Tamboril", "Redoblante"],
  },
  {
    questionText: "¿Qué instrumento es este?",
    audioFile: "pandero.mp3",
    orderIndex: 5,
    correctAnswer: "Pandero",
    options: ["Pandero", "Pandereta", "Bongó", "Tambor"],
  },
  {
    questionText: "¿Qué instrumento es este?",
    audioFile: "redoblante.mp3",
    orderIndex: 6,
    correctAnswer: "Redoblante",
    options: ["Redoblante", "Batería", "Tamboril", "Tambor"],
  },
  {
    questionText: "¿Qué instrumento es este?",
    audioFile: "bateria.mp3",
    orderIndex: 7,
    correctAnswer: "Batería",
    options: ["Batería", "Redoblante", "Conga", "Djembe"],
  },
  {
    questionText: "¿Qué instrumento es este?",
    audioFile: "tamboril.mp3",
    orderIndex: 8,
    correctAnswer: "Tamboril",
    options: ["Tamboril", "Tambor", "Pandereta", "Redoblante"],
  },
];

export const adminRouter = router({
  login: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.username !== ADMIN_USER || input.password !== ADMIN_PASS) {
        throw new Error("Invalid credentials");
      }

      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
      const token = await new SignJWT({ adminId: ADMIN_USER })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("24h")
        .sign(secret);

      return { token };
    }),

  createSession: adminProcedure.mutation(async ({ ctx }) => {
    const [session] = await db
      .insert(sessions)
      .values({
        adminId: ctx.adminId,
        status: "waiting",
        currentQuestionIndex: 0,
      })
      .returning();

    // Seed questions for the session
    await db.insert(questions).values(
      SEED_QUESTIONS.map((q) => ({
        ...q,
        sessionId: session.id,
      })),
    );

    return session;
  }),

  getSessions: adminProcedure.query(async () => {
    return db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt))
      .limit(10);
  }),

  getActiveSession: publicProcedure.query(async () => {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, "active"))
      .limit(1);
    return result[0] ?? null;
  }),

  getWaitingOrActiveSession: publicProcedure.query(async () => {
    // Return the most recent session that is waiting or active
    const activeResult = await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, "active"))
      .orderBy(desc(sessions.createdAt))
      .limit(1);

    if (activeResult[0]) return activeResult[0];

    const waitingResult = await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, "waiting"))
      .orderBy(desc(sessions.createdAt))
      .limit(1);

    return waitingResult[0] ?? null;
  }),

  getSessionWithDetails: adminProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, input.sessionId))
        .limit(1);

      if (!session) throw new Error("Session not found");

      const sessionQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.sessionId, input.sessionId))
        .orderBy(questions.orderIndex);

      const sessionParticipants = await db
        .select()
        .from(participants)
        .where(eq(participants.sessionId, input.sessionId));

      return {
        session,
        questions: sessionQuestions,
        participants: sessionParticipants,
      };
    }),

  activateSession: adminProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // Set all other sessions to waiting first (only one can be active)
      await db
        .update(sessions)
        .set({ status: "waiting", updatedAt: new Date() })
        .where(eq(sessions.status, "active"));

      const [updated] = await db
        .update(sessions)
        .set({
          status: "active",
          currentQuestionIndex: 0,
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, input.sessionId))
        .returning();

      return updated;
    }),

  advanceQuestion: adminProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, input.sessionId))
        .limit(1);

      if (!session) throw new Error("Session not found");

      const sessionQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.sessionId, input.sessionId))
        .orderBy(questions.orderIndex);

      const nextIndex = session.currentQuestionIndex + 1;

      if (nextIndex >= sessionQuestions.length) {
        // Finish the session
        const [finished] = await db
          .update(sessions)
          .set({ status: "finished", updatedAt: new Date() })
          .where(eq(sessions.id, input.sessionId))
          .returning();
        return { session: finished, finished: true };
      }

      const [updated] = await db
        .update(sessions)
        .set({ currentQuestionIndex: nextIndex, updatedAt: new Date() })
        .where(eq(sessions.id, input.sessionId))
        .returning();

      return { session: updated, finished: false };
    }),

  finishSession: adminProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(sessions)
        .set({ status: "finished", updatedAt: new Date() })
        .where(eq(sessions.id, input.sessionId))
        .returning();
      return updated;
    }),

  getAnswerStats: adminProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        questionId: z.string().uuid(),
      }),
    )
    .query(async ({ input }) => {
      const sessionParticipants = await db
        .select()
        .from(participants)
        .where(eq(participants.sessionId, input.sessionId));

      const questionAnswers = await db
        .select()
        .from(answers)
        .where(eq(answers.questionId, input.questionId));

      return {
        total: sessionParticipants.length,
        answered: questionAnswers.length,
        pending: sessionParticipants.length - questionAnswers.length,
      };
    }),
});
