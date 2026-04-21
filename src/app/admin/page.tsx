"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";

export default function AdminPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("admin_token");
    const storedSession = localStorage.getItem("admin_session_id");
    if (!storedToken) {
      router.push("/");
      return;
    }
    setToken(storedToken);
    setSessionId(storedSession);
  }, [router]);

  const sessionDetails = trpc.admin.getSessionWithDetails.useQuery(
    { sessionId: sessionId! },
    {
      enabled: !!sessionId && !!token,
      refetchInterval: 2000,
    },
  );

  const activateSessionMutation = trpc.admin.activateSession.useMutation({
    onSuccess: () => sessionDetails.refetch(),
  });

  const advanceQuestionMutation = trpc.admin.advanceQuestion.useMutation({
    onSuccess: () => sessionDetails.refetch(),
  });

  const finishSessionMutation = trpc.admin.finishSession.useMutation({
    onSuccess: () => sessionDetails.refetch(),
  });

  const currentQuestionIndex =
    sessionDetails.data?.session.currentQuestionIndex ?? 0;
  const currentQuestion =
    sessionDetails.data?.session.status === "active"
      ? (sessionDetails.data?.questions[currentQuestionIndex] ?? null)
      : null;

  const answerStats = trpc.admin.getAnswerStats.useQuery(
    {
      sessionId: sessionId!,
      questionId: currentQuestion?.id ?? "",
    },
    {
      enabled: !!sessionId && !!currentQuestion?.id,
      refetchInterval: 2000,
    },
  );

  function playAudio(filename: string) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingAudio === filename) {
      setPlayingAudio(null);
      return;
    }
    const audio = new Audio(`/audio/${filename}`);
    audioRef.current = audio;
    audio.play();
    setPlayingAudio(filename);
    audio.onended = () => {
      setPlayingAudio(null);
      audioRef.current = null;
    };
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_session_id");
    router.push("/");
  }

  if (!sessionId || !token) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-purple-400 text-xl animate-pulse">Cargando...</div>
      </div>
    );
  }

  const session = sessionDetails.data?.session;
  const questions = sessionDetails.data?.questions ?? [];
  const participantCount = sessionDetails.data?.participants.length ?? 0;

  return (
    <main className="min-h-dvh bg-[#0f0f1a] p-5 md:p-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-black gradient-text flex items-center gap-3">
              🎛️ Panel de Control
            </h1>
            <p className="text-purple-400 text-base mt-2">
              Administrador del Quiz Musical
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/results"
              className="bg-purple-900/50 hover:bg-purple-800/50 border border-purple-700/40 text-purple-300 hover:text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              🏆 Ver Resultados
            </a>
            <button
              onClick={handleLogout}
              className="bg-red-900/30 hover:bg-red-800/40 border border-red-700/40 text-red-300 hover:text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Session Status Card */}
        <div className="bg-[#1a1a2e] border border-purple-800/40 rounded-2xl p-7 mb-8 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div
                className={`w-5 h-5 rounded-full flex-shrink-0 ${
                  session?.status === "active"
                    ? "bg-green-400 animate-pulse"
                    : session?.status === "finished"
                      ? "bg-gray-500"
                      : "bg-yellow-400 animate-pulse"
                }`}
              />
              <div>
                <p className="text-white font-bold text-xl">
                  {session?.status === "active"
                    ? "🟢 Sesión Activa"
                    : session?.status === "finished"
                      ? "⭕ Sesión Finalizada"
                      : "🟡 En Espera"}
                </p>
                <p className="text-purple-400 text-base mt-1">
                  {participantCount} participante
                  {participantCount !== 1 ? "s" : ""} conectado
                  {participantCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {session?.status === "waiting" && (
                <button
                  onClick={() =>
                    activateSessionMutation.mutate({ sessionId: sessionId })
                  }
                  disabled={activateSessionMutation.isPending}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold px-7 py-3 rounded-2xl transition-all shadow-lg hover:shadow-green-500/25 text-base"
                >
                  {activateSessionMutation.isPending
                    ? "Activando..."
                    : "▶ Iniciar Quiz"}
                </button>
              )}

              {session?.status === "active" && (
                <>
                  <button
                    onClick={() =>
                      advanceQuestionMutation.mutate({ sessionId: sessionId })
                    }
                    disabled={advanceQuestionMutation.isPending}
                    className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold px-7 py-3 rounded-2xl transition-all shadow-lg hover:shadow-purple-500/25 text-base"
                  >
                    {advanceQuestionMutation.isPending
                      ? "Avanzando..."
                      : "⏭ Siguiente Pregunta"}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("¿Seguro que quieres finalizar el quiz?")) {
                        finishSessionMutation.mutate({ sessionId: sessionId });
                      }
                    }}
                    disabled={finishSessionMutation.isPending}
                    className="bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold px-7 py-3 rounded-2xl transition-all text-base"
                  >
                    {finishSessionMutation.isPending
                      ? "Finalizando..."
                      : "⏹ Finalizar Quiz"}
                  </button>
                </>
              )}

              {session?.status === "finished" && (
                <a
                  href="/results"
                  className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-bold px-7 py-3 rounded-2xl transition-all shadow-lg hover:shadow-yellow-500/25 text-base"
                >
                  🏆 Ver Resultados Finales
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Live Answer Stats (shown only when session is active) */}
        {session?.status === "active" && currentQuestion && (
          <div className="bg-[#1a1a2e] border border-green-700/40 rounded-2xl p-7 mb-8 shadow-xl">
            <h2 className="text-green-400 font-bold text-xl mb-6 flex items-center gap-3">
              <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse inline-block" />
              Pregunta Actual — En Vivo
            </h2>
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <div className="flex-1">
                <p className="text-white font-semibold text-xl mb-2">
                  {currentQuestion.questionText}
                </p>
                <p className="text-purple-400 text-base">
                  Pregunta {currentQuestionIndex + 1} de {questions.length}
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center bg-green-900/30 border border-green-700/40 rounded-2xl px-6 py-4">
                  <p className="text-4xl font-black text-green-400">
                    {answerStats.data?.answered ?? 0}
                  </p>
                  <p className="text-green-300 text-sm mt-1 font-medium">
                    Respondieron
                  </p>
                </div>
                <div className="text-center bg-yellow-900/30 border border-yellow-700/40 rounded-2xl px-6 py-4">
                  <p className="text-4xl font-black text-yellow-400">
                    {answerStats.data?.pending ?? 0}
                  </p>
                  <p className="text-yellow-300 text-sm mt-1 font-medium">
                    Faltan
                  </p>
                </div>
                <div className="text-center bg-purple-900/30 border border-purple-700/40 rounded-2xl px-6 py-4">
                  <p className="text-4xl font-black text-purple-400">
                    {answerStats.data?.total ?? 0}
                  </p>
                  <p className="text-purple-300 text-sm mt-1 font-medium">
                    Total
                  </p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {(answerStats.data?.total ?? 0) > 0 && (
              <div className="mt-6">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Progreso de respuestas</span>
                  <span className="font-semibold text-white">
                    {Math.round(
                      ((answerStats.data?.answered ?? 0) /
                        (answerStats.data?.total ?? 1)) *
                        100,
                    )}
                    %
                  </span>
                </div>
                <div className="h-3 bg-gray-700/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(
                        ((answerStats.data?.answered ?? 0) /
                          (answerStats.data?.total ?? 1)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Questions List */}
        <div className="bg-[#1a1a2e] border border-purple-800/40 rounded-2xl p-7 shadow-xl">
          <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-3">
            🎵 Preguntas del Quiz
            <span className="text-purple-400 text-sm font-normal">
              ({questions.length} en total)
            </span>
          </h2>

          {sessionDetails.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-purple-400 animate-pulse text-base">
                Cargando preguntas...
              </div>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-base">
              No hay preguntas en esta sesión
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => {
                const isCurrentQuestion =
                  session?.status === "active" &&
                  index === currentQuestionIndex;
                const isPast =
                  session?.status === "active" && index < currentQuestionIndex;
                const isFuture =
                  session?.status === "active" && index > currentQuestionIndex;

                return (
                  <div
                    key={question.id}
                    className={`rounded-2xl p-5 border transition-all ${
                      isCurrentQuestion
                        ? "border-green-500/60 bg-green-900/20"
                        : isPast
                          ? "border-gray-700/40 bg-gray-900/20 opacity-50"
                          : "border-purple-800/30 bg-[#0f0f1a]/50"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base font-bold ${
                            isCurrentQuestion
                              ? "bg-green-500 text-white"
                              : isPast
                                ? "bg-gray-600 text-gray-400"
                                : "bg-purple-700/50 text-purple-300"
                          }`}
                        >
                          {isPast ? "✓" : index + 1}
                        </div>
                        <div>
                          <p
                            className={`font-semibold text-base ${isCurrentQuestion ? "text-green-300" : "text-white"}`}
                          >
                            {question.questionText}
                          </p>
                          <p className="text-purple-400 text-sm mt-1 flex items-center gap-1">
                            🎵 {question.audioFile}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {(question.options as string[]).map((opt) => (
                              <span
                                key={opt}
                                className={`text-sm px-3 py-1 rounded-full border font-medium ${
                                  opt === question.correctAnswer
                                    ? "border-green-600/60 bg-green-900/30 text-green-300"
                                    : "border-purple-700/30 bg-purple-900/20 text-purple-400"
                                }`}
                              >
                                {opt === question.correctAnswer ? "✓ " : ""}
                                {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 ml-14 sm:ml-0 flex-shrink-0">
                        {isCurrentQuestion && (
                          <span className="text-sm bg-green-900/50 text-green-400 border border-green-700/40 px-3 py-1.5 rounded-full font-medium">
                            ▶ Activa
                          </span>
                        )}
                        <button
                          onClick={() => playAudio(question.audioFile)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            playingAudio === question.audioFile
                              ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                              : "bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/40 text-purple-300 hover:text-white"
                          }`}
                        >
                          {playingAudio === question.audioFile ? (
                            <>
                              <span className="flex gap-0.5 items-end h-4">
                                <span
                                  className="w-1 bg-white rounded animate-bounce"
                                  style={{
                                    animationDelay: "0ms",
                                    height: "10px",
                                  }}
                                />
                                <span
                                  className="w-1 bg-white rounded animate-bounce"
                                  style={{
                                    animationDelay: "100ms",
                                    height: "16px",
                                  }}
                                />
                                <span
                                  className="w-1 bg-white rounded animate-bounce"
                                  style={{
                                    animationDelay: "200ms",
                                    height: "10px",
                                  }}
                                />
                              </span>
                              Detener
                            </>
                          ) : (
                            <>▶ Reproducir</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Participants */}
        {participantCount > 0 && (
          <div className="bg-[#1a1a2e] border border-purple-800/40 rounded-2xl p-7 shadow-xl mt-8">
            <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-3">
              👥 Participantes
              <span className="text-purple-400 text-sm font-normal">
                ({participantCount})
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {sessionDetails.data?.participants
                .sort((a, b) => b.score - a.score)
                .map((p) => (
                  <div
                    key={p.id}
                    className="bg-[#0f0f1a] border border-purple-800/30 rounded-2xl p-4 flex items-center gap-3"
                  >
                    <span className="text-3xl">{p.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-white text-base font-semibold truncate">
                        {p.name}
                      </p>
                      <p className="text-purple-400 text-sm mt-0.5">
                        {p.score} pt{p.score !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
