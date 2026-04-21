"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";

export default function PlayPage() {
  const router = useRouter();
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string>("");
  const [participantEmoji, setParticipantEmoji] = useState<string>("");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastQuestionId, setLastQuestionId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const joinMutationRef = useRef(false);

  useEffect(() => {
    const pid = localStorage.getItem("participant_id");
    const name = localStorage.getItem("participant_name") ?? "";
    const emoji = localStorage.getItem("participant_emoji") ?? "";

    if (!pid) {
      router.push("/");
      return;
    }

    setParticipantId(pid);
    setParticipantName(name);
    setParticipantEmoji(emoji);
  }, [router]);

  // Always fetch the global active session — don't rely on localStorage session_id
  const activeSessionQuery = trpc.admin.getActiveSession.useQuery(undefined, {
    refetchInterval: 2000,
    enabled: !!participantId,
  });

  const joinSessionMutation = trpc.participant.joinSession.useMutation({
    onSuccess: (participant) => {
      localStorage.setItem("participant_id", participant.id);
      setParticipantId(participant.id);
      joinMutationRef.current = false;
    },
    onError: () => {
      joinMutationRef.current = false;
    },
  });

  // When we get an active session, update sessionId and re-register participant if they aren't in it
  const handleActiveSession = useCallback(async () => {
    if (!activeSessionQuery.data || !participantId || !participantName) return;
    const activeId = activeSessionQuery.data.id;

    const storedSid = localStorage.getItem("session_id");
    if (storedSid !== activeId) {
      // Session changed — clear stale answer state and re-join with same name/emoji
      localStorage.setItem("session_id", activeId);
      setSelectedAnswer(null);
      setHasSubmitted(false);
      setLastQuestionId(null);

      if (!joinMutationRef.current) {
        joinMutationRef.current = true;
        const emoji = localStorage.getItem("participant_emoji") ?? "🎵";
        joinSessionMutation.mutate({
          sessionId: activeId,
          name: participantName,
          emoji,
        });
      }
    }
    setSessionId(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionQuery.data, participantId, participantName]);

  useEffect(() => {
    handleActiveSession();
  }, [handleActiveSession]);

  // Poll session state using the resolved sessionId
  const sessionState = trpc.participant.getSessionState.useQuery(
    { sessionId: sessionId! },
    {
      enabled: !!sessionId,
      refetchInterval: 2000,
    },
  );

  const hasAnswered = trpc.participant.hasAnsweredQuestion.useQuery(
    {
      participantId: participantId!,
      questionId: sessionState.data?.currentQuestion?.id ?? "",
    },
    {
      enabled:
        !!participantId &&
        !!sessionState.data?.currentQuestion?.id &&
        sessionState.data?.currentQuestion?.id !== "",
      refetchInterval: 2000,
    },
  );

  const submitAnswerMutation = trpc.participant.submitAnswer.useMutation({
    onSuccess: () => {
      setHasSubmitted(true);
      hasAnswered.refetch();
    },
  });

  // Reset answer state when question changes
  useEffect(() => {
    const currentQuestionId = sessionState.data?.currentQuestion?.id ?? null;
    if (currentQuestionId && currentQuestionId !== lastQuestionId) {
      setSelectedAnswer(null);
      setHasSubmitted(false);
      setLastQuestionId(currentQuestionId);
      setAudioPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }
  }, [sessionState.data?.currentQuestion?.id, lastQuestionId]);

  function playAudio(filename: string) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setAudioPlaying(false);
      return;
    }
    const audio = new Audio(`/audio/${filename}`);
    audioRef.current = audio;
    audio.play();
    setAudioPlaying(true);
    audio.onended = () => {
      setAudioPlaying(false);
      audioRef.current = null;
    };
  }

  async function handleSubmit() {
    if (!selectedAnswer || !participantId || !sessionId) return;
    const question = sessionState.data?.currentQuestion;
    if (!question) return;

    submitAnswerMutation.mutate({
      participantId,
      questionId: question.id,
      sessionId,
      selectedAnswer,
    });
  }

  if (!participantId) {
    return (
      <div className="min-h-dvh bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-purple-400 text-xl animate-pulse">Cargando...</div>
      </div>
    );
  }

  const session = sessionState.data?.session;
  const currentQuestion = sessionState.data?.currentQuestion;
  const alreadyAnswered = hasAnswered.data?.answered ?? hasSubmitted;

  // Sort options alphabetically so order is consistent for everyone
  const shuffledOptions: string[] = currentQuestion
    ? [...(currentQuestion.options as string[])].sort((a, b) =>
        a.localeCompare(b),
      )
    : [];

  // Session finished
  if (session?.status === "finished") {
    return (
      <main className="min-h-dvh bg-[#0f0f1a] flex flex-col items-center justify-center p-6">
        <div className="text-center fade-in">
          <div className="text-8xl mb-8">🏆</div>
          <h1 className="text-5xl font-black gradient-text mb-4">
            ¡Quiz Finalizado!
          </h1>
          <p className="text-purple-300 text-xl mb-10">
            Gracias por participar, {participantEmoji} {participantName}!
          </p>
          <a
            href="/results"
            className="inline-block bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black py-5 px-14 rounded-2xl text-2xl transition-all shadow-2xl hover:shadow-yellow-500/40"
          >
            🏆 Ver Resultados
          </a>
        </div>
      </main>
    );
  }

  // No active session at all — waiting for admin
  if (!activeSessionQuery.data && !activeSessionQuery.isLoading) {
    return (
      <main className="min-h-dvh bg-[#0f0f1a] flex flex-col items-center justify-center p-6">
        <div className="text-center fade-in">
          <div className="inline-flex items-center gap-3 bg-[#1a1a2e] border border-purple-700/40 rounded-full px-6 py-3 mb-10">
            <span className="text-3xl">{participantEmoji}</span>
            <span className="text-white font-bold text-lg">
              {participantName}
            </span>
          </div>
          <div className="text-7xl mb-8 pulse-music">🎵</div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Esperando que el admin inicie el quiz...
          </h2>
          <p className="text-purple-400 text-xl">
            El administrador activará el quiz en breve
          </p>
          <div className="flex items-end justify-center gap-2 mt-12 h-14">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="w-2.5 bg-gradient-to-t from-purple-700 to-violet-400 rounded-full animate-bounce"
                style={{
                  animationDelay: `${i * 100}ms`,
                  height: `${20 + Math.sin(i) * 15}px`,
                }}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Waiting for first question or between questions
  if (!currentQuestion || session?.status === "waiting") {
    return (
      <main className="min-h-dvh bg-[#0f0f1a] flex flex-col items-center justify-center p-6">
        <div className="text-center fade-in">
          <div className="inline-flex items-center gap-3 bg-[#1a1a2e] border border-purple-700/40 rounded-full px-6 py-3 mb-10">
            <span className="text-3xl">{participantEmoji}</span>
            <span className="text-white font-bold text-lg">
              {participantName}
            </span>
          </div>

          <div className="text-7xl mb-8 pulse-music">🎵</div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Esperando la siguiente pregunta...
          </h2>
          <p className="text-purple-400 text-xl">
            El administrador activará el quiz en breve
          </p>

          <div className="flex items-end justify-center gap-2 mt-12 h-14">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="w-2.5 bg-gradient-to-t from-purple-700 to-violet-400 rounded-full animate-bounce"
                style={{
                  animationDelay: `${i * 100}ms`,
                  height: `${20 + Math.sin(i) * 15}px`,
                }}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#0f0f1a] p-5 flex flex-col items-center justify-start pt-10">
      <div className="w-full max-w-xl">
        {/* Player badge */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center gap-3 bg-[#1a1a2e] border border-purple-700/40 rounded-full px-6 py-3">
            <span className="text-3xl">{participantEmoji}</span>
            <span className="text-white font-bold text-lg">
              {participantName}
            </span>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-[#1a1a2e] border border-purple-800/40 rounded-2xl p-8 shadow-xl mb-6 fade-in">
          <div className="flex items-center justify-between mb-6">
            <span className="text-purple-400 text-sm font-semibold tracking-wide uppercase">
              🎵 Pregunta
            </span>
            <span className="text-xs text-gray-500 bg-[#0f0f1a] px-3 py-1.5 rounded-full border border-purple-800/30">
              Escucha el audio
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 leading-snug">
            {currentQuestion.questionText}
          </h2>

          {/* Audio Player Button */}
          <button
            onClick={() => playAudio(currentQuestion.audioFile)}
            className={`w-full flex items-center justify-center gap-3 py-5 px-6 rounded-2xl font-bold text-lg transition-all mb-8 ${
              audioPlaying
                ? "bg-gradient-to-r from-purple-700 to-violet-700 text-white shadow-lg shadow-purple-500/30"
                : "bg-gradient-to-r from-purple-600/80 to-violet-600/80 hover:from-purple-600 hover:to-violet-600 text-white border border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/20"
            }`}
          >
            {audioPlaying ? (
              <>
                <span className="flex items-end gap-0.5 h-6">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className="w-1 bg-white rounded-full animate-bounce"
                      style={{
                        animationDelay: `${i * 80}ms`,
                        height: `${12 + Math.sin(i * 1.2) * 8}px`,
                      }}
                    />
                  ))}
                </span>
                <span>Reproduciendo... (toca para detener)</span>
              </>
            ) : (
              <>
                <span className="text-2xl">▶</span>
                <span>Reproducir Audio</span>
              </>
            )}
          </button>

          {/* Answer Options */}
          {!alreadyAnswered ? (
            <div className="space-y-3">
              <p className="text-purple-300 text-sm font-semibold tracking-wide uppercase mb-4">
                Selecciona tu respuesta:
              </p>
              {shuffledOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setSelectedAnswer(option)}
                  disabled={submitAnswerMutation.isPending}
                  className={`w-full text-left pl-6 pr-5 py-5 rounded-2xl border-2 font-medium text-lg transition-all ${
                    selectedAnswer === option
                      ? "border-purple-500 bg-purple-900/50 text-white shadow-lg shadow-purple-500/20"
                      : "border-purple-800/40 bg-[#0f0f1a]/60 text-gray-300 hover:border-purple-600/60 hover:bg-purple-900/20 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-4">
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        selectedAnswer === option
                          ? "border-purple-400 bg-purple-500"
                          : "border-gray-600"
                      }`}
                    >
                      {selectedAnswer === option && (
                        <span className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </span>
                    {option}
                  </span>
                </button>
              ))}

              <button
                onClick={handleSubmit}
                disabled={!selectedAnswer || submitAnswerMutation.isPending}
                className="w-full mt-5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-5 px-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-purple-500/25 text-lg"
              >
                {submitAnswerMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Enviando...
                  </span>
                ) : (
                  "Confirmar respuesta ✓"
                )}
              </button>

              {submitAnswerMutation.isError && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 text-sm text-center">
                  Error al enviar. Intenta de nuevo.
                </div>
              )}
            </div>
          ) : (
            /* Already answered — neutral waiting state, no correct/incorrect feedback */
            <div className="text-center py-10 fade-in">
              <div className="text-6xl mb-6">🎵</div>
              <h3 className="text-3xl font-black text-white mb-3">
                ¡Respuesta enviada!
              </h3>
              <p className="text-purple-300 text-lg mb-10">
                Esperando la siguiente pregunta...
              </p>

              <div className="flex items-end justify-center gap-2 h-10">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 bg-gradient-to-t from-purple-700 to-violet-400 rounded-full animate-bounce"
                    style={{
                      animationDelay: `${i * 120}ms`,
                      height: `${14 + Math.sin(i) * 10}px`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
