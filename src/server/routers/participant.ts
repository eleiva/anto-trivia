import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { db } from "@/db";
import {
  sessions,
  questions,
  participants,
  answers,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const participantRouter = router({
  joinSession: publicProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        name: z.string().min(1).max(50),
        emoji: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, input.sessionId))
        .limit(1);

      if (!session) {
        throw new Error("Session not found");
      }

      if (session.status === "finished") {
        throw new Error("Session has already finished");
      }

      const [participant] = await db
        .insert(participants)
        .values({
          sessionId: input.sessionId,
          name: input.name,
          emoji: input.emoji,
          score: 0,
        })
        .returning();

      return participant;
    }),

  getParticipant: publicProcedure
    .input(z.object({ participantId: z.string().uuid() }))
    .query(async ({ input }) => {
      const [participant] = await db
        .select()
        .from(participants)
        .where(eq(participants.id, input.participantId))
        .limit(1);

      return participant ?? null;
    }),

  submitAnswer: publicProcedure
    .input(
      z.object({
        participantId: z.string().uuid(),
        questionId: z.string().uuid(),
        sessionId: z.string().uuid(),
        selectedAnswer: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if already answered
      const existing = await db
        .select()
        .from(answers)
        .where(eq(answers.participantId, input.participantId))
        .then((rows) =>
          rows.find((r) => r.questionId === input.questionId)
        );

      if (existing) {
        return { alreadyAnswered: true, isCorrect: existing.isCorrect };
      }

      // Get the question to check correct answer
      const [question] = await db
        .select()
        .from(questions)
        .where(eq(questions.id, input.questionId))
        .limit(1);

      if (!question) {
        throw new Error("Question not found");
      }

      const isCorrect = question.correctAnswer === input.selectedAnswer;

      await db.insert(answers).values({
        participantId: input.participantId,
        questionId: input.questionId,
        sessionId: input.sessionId,
        selectedAnswer: input.selectedAnswer,
        isCorrect,
      });

      // Update score if correct
      if (isCorrect) {
        const [participant] = await db
          .select()
          .from(participants)
          .where(eq(participants.id, input.participantId))
          .limit(1);

        if (participant) {
          await db
            .update(participants)
            .set({ score: participant.score + 1 })
            .where(eq(participants.id, input.participantId));
        }
      }

      return { alreadyAnswered: false, isCorrect };
    }),

  getSessionState: publicProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, input.sessionId))
        .limit(1);

      if (!session) return null;

      if (session.status === "waiting") {
        return { session, currentQuestion: null };
      }

      const sessionQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.sessionId, input.sessionId))
        .orderBy(questions.orderIndex);

      const currentQuestion =
        session.status === "active"
          ? (sessionQuestions[session.currentQuestionIndex] ?? null)
          : null;

      return { session, currentQuestion };
    }),

  hasAnsweredQuestion: publicProcedure
    .input(
      z.object({
        participantId: z.string().uuid(),
        questionId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(answers)
        .where(eq(answers.participantId, input.participantId))
        .then((rows) =>
          rows.filter((r) => r.questionId === input.questionId)
        );

      return { answered: rows.length > 0, answer: rows[0] ?? null };
    }),

  getRankings: publicProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const sessionParticipants = await db
        .select()
        .from(participants)
        .where(eq(participants.sessionId, input.sessionId))
        .orderBy(desc(participants.score));

      return sessionParticipants.map((p, index) => ({
        ...p,
        position: index + 1,
      }));
    }),
});
