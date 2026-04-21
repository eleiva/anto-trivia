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

  const handleActiveSession = useCallback(async () => {
    if (!activeSessionQuery.data || !participantId || !participantName) return;
    const activeId = activeSessionQuery.data.id;
    const storedSid = localStorage.getItem("session_id");
    if (storedSid !== activeId) {
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

  const sessionState = trpc.participant.getSessionState.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId, refetchInterval: 2000 },
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
      <div
        style={{
          minHeight: "100dvh",
          backgroundColor: "#0a0a14",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{ color: "#a78bfa", fontSize: "20px" }}
          className="animate-pulse"
        >
          Cargando...
        </div>
      </div>
    );
  }

  const session = sessionState.data?.session;
  const currentQuestion = sessionState.data?.currentQuestion;
  const alreadyAnswered = hasAnswered.data?.answered ?? hasSubmitted;

  const sortedOptions: string[] = currentQuestion
    ? [...(currentQuestion.options as string[])].sort((a, b) =>
        a.localeCompare(b),
      )
    : [];

  // ── Finished ──
  if (session?.status === "finished") {
    return (
      <main
        style={{
          minHeight: "100dvh",
          backgroundColor: "#0a0a14",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }} className="fade-in">
          <div style={{ fontSize: "96px", marginBottom: "24px" }}>🏆</div>
          <h1
            style={{
              fontSize: "clamp(2rem,6vw,3.5rem)",
              fontWeight: 900,
              background: "linear-gradient(135deg,#c084fc,#7c3aed)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: "16px",
            }}
          >
            ¡Quiz Finalizado!
          </h1>
          <p
            style={{ color: "#c4b5fd", fontSize: "20px", marginBottom: "40px" }}
          >
            Gracias por participar, {participantEmoji} {participantName}!
          </p>
          <a
            href="/results"
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg,#d97706,#f59e0b)",
              color: "#000",
              fontWeight: 900,
              fontSize: "20px",
              padding: "20px 56px",
              borderRadius: "16px",
              textDecoration: "none",
              boxShadow: "0 8px 30px rgba(245,158,11,0.4)",
            }}
          >
            🏆 Ver Resultados
          </a>
        </div>
      </main>
    );
  }

  // ── Waiting screens ──
  const WaitingScreen = ({ message }: { message: string }) => (
    <main
      style={{
        minHeight: "100dvh",
        backgroundColor: "#0a0a14",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }} className="fade-in">
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "12px",
            backgroundColor: "#12122a",
            border: "1.5px solid rgba(139,92,246,0.35)",
            borderRadius: "999px",
            padding: "12px 24px",
            marginBottom: "48px",
          }}
        >
          <span style={{ fontSize: "32px" }}>{participantEmoji}</span>
          <span style={{ color: "white", fontWeight: 700, fontSize: "18px" }}>
            {participantName}
          </span>
        </div>
        <div
          style={{ fontSize: "80px", marginBottom: "32px" }}
          className="pulse-music"
        >
          🎵
        </div>
        <h2
          style={{
            fontSize: "clamp(1.6rem,4vw,2.4rem)",
            fontWeight: 800,
            color: "white",
            marginBottom: "16px",
          }}
        >
          {message}
        </h2>
        <p style={{ color: "#a78bfa", fontSize: "18px", marginBottom: "48px" }}>
          El administrador activará el quiz en breve
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: "8px",
            height: "56px",
          }}
        >
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="animate-bounce"
              style={{
                width: "10px",
                background: "linear-gradient(to top,#6d28d9,#8b5cf6)",
                borderRadius: "999px",
                animationDelay: `${i * 100}ms`,
                height: `${20 + Math.sin(i) * 14}px`,
              }}
            />
          ))}
        </div>
      </div>
    </main>
  );

  if (!activeSessionQuery.data && !activeSessionQuery.isLoading) {
    return <WaitingScreen message="Esperando que el admin inicie el quiz..." />;
  }
  if (!currentQuestion || session?.status === "waiting") {
    return <WaitingScreen message="Esperando la siguiente pregunta..." />;
  }

  // ── Active question ──
  return (
    <main
      style={{
        minHeight: "100dvh",
        backgroundColor: "#0a0a14",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "32px 16px 48px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: "560px" }}>
        {/* Player badge */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              backgroundColor: "#12122a",
              border: "1.5px solid rgba(139,92,246,0.35)",
              borderRadius: "999px",
              padding: "10px 24px",
            }}
          >
            <span style={{ fontSize: "28px" }}>{participantEmoji}</span>
            <span style={{ color: "white", fontWeight: 700, fontSize: "17px" }}>
              {participantName}
            </span>
          </div>
        </div>

        {/* Question card */}
        <div
          style={{
            backgroundColor: "#12122a",
            border: "1.5px solid rgba(139,92,246,0.3)",
            borderRadius: "24px",
            padding: "36px 32px",
            boxShadow: "0 8px 40px rgba(124,58,237,0.18)",
          }}
          className="fade-in"
        >
          {/* Card header + question + audio — only shown before answering */}
          {!alreadyAnswered && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                }}
              >
                <span
                  style={{
                    color: "#a855f7",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  🎵 Pregunta
                </span>
                <span
                  style={{
                    color: "#6b7280",
                    fontSize: "12px",
                    backgroundColor: "#0a0a14",
                    border: "1px solid rgba(139,92,246,0.2)",
                    borderRadius: "999px",
                    padding: "4px 12px",
                  }}
                >
                  Escucha el audio
                </span>
              </div>

              <h2
                style={{
                  color: "white",
                  fontSize: "clamp(1.5rem,4vw,2rem)",
                  fontWeight: 800,
                  lineHeight: 1.3,
                  marginBottom: "28px",
                }}
              >
                {currentQuestion.questionText}
              </h2>

              <button
                onClick={() => playAudio(currentQuestion.audioFile)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  padding: "18px 24px",
                  borderRadius: "16px",
                  border: "none",
                  background: audioPlaying
                    ? "linear-gradient(135deg,#6d28d9,#7c3aed)"
                    : "linear-gradient(135deg,#7c3aed,#a855f7)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "17px",
                  cursor: "pointer",
                  marginBottom: "32px",
                  boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                  transition: "all 0.2s",
                }}
              >
                {audioPlaying ? (
                  <>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: "3px",
                        height: "22px",
                      }}
                    >
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className="animate-bounce"
                          style={{
                            width: "4px",
                            backgroundColor: "white",
                            borderRadius: "999px",
                            display: "inline-block",
                            animationDelay: `${i * 80}ms`,
                            height: `${10 + Math.sin(i * 1.2) * 8}px`,
                          }}
                        />
                      ))}
                    </span>
                    <span>Reproduciendo... (toca para detener)</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "20px" }}>▶</span>
                    <span>Reproducir Audio</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Answered / options */}
          {alreadyAnswered ? (
            <div
              style={{ textAlign: "center", padding: "32px 0 16px" }}
              className="fade-in"
            >
              <div style={{ fontSize: "72px", marginBottom: "20px" }}>🎵</div>
              <h3
                style={{
                  color: "white",
                  fontSize: "28px",
                  fontWeight: 900,
                  marginBottom: "12px",
                }}
              >
                ¡Respuesta enviada!
              </h3>
              <p
                style={{
                  color: "#a78bfa",
                  fontSize: "17px",
                  marginBottom: "40px",
                }}
              >
                Esperando la siguiente pregunta...
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  gap: "6px",
                  height: "40px",
                }}
              >
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-bounce"
                    style={{
                      width: "8px",
                      background: "linear-gradient(to top,#6d28d9,#8b5cf6)",
                      borderRadius: "999px",
                      animationDelay: `${i * 120}ms`,
                      height: `${14 + Math.sin(i) * 10}px`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p
                style={{
                  color: "#c4b5fd",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "16px",
                }}
              >
                Selecciona tu respuesta:
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {sortedOptions.map((option) => {
                  const isSelected = selectedAnswer === option;
                  return (
                    <button
                      key={option}
                      onClick={() => setSelectedAnswer(option)}
                      disabled={submitAnswerMutation.isPending}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "18px 20px",
                        borderRadius: "14px",
                        border: isSelected
                          ? "2px solid #a855f7"
                          : "2px solid rgba(139,92,246,0.25)",
                        backgroundColor: isSelected
                          ? "rgba(168,85,247,0.15)"
                          : "rgba(255,255,255,0.03)",
                        color: isSelected ? "white" : "#d1d5db",
                        fontSize: "17px",
                        fontWeight: isSelected ? 700 : 500,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        boxShadow: isSelected
                          ? "0 0 0 4px rgba(168,85,247,0.1)"
                          : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                      }}
                    >
                      {/* Radio dot */}
                      <span
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          border: isSelected
                            ? "2px solid #a855f7"
                            : "2px solid #4b5563",
                          backgroundColor: isSelected
                            ? "#a855f7"
                            : "transparent",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s",
                        }}
                      >
                        {isSelected && (
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: "white",
                              display: "block",
                            }}
                          />
                        )}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={!selectedAnswer || submitAnswerMutation.isPending}
                style={{
                  width: "100%",
                  marginTop: "20px",
                  padding: "18px",
                  borderRadius: "14px",
                  border: "none",
                  background:
                    !selectedAnswer || submitAnswerMutation.isPending
                      ? "linear-gradient(135deg,#374151,#4b5563)"
                      : "linear-gradient(135deg,#7c3aed,#a855f7)",
                  color: "white",
                  fontWeight: 800,
                  fontSize: "17px",
                  cursor:
                    !selectedAnswer || submitAnswerMutation.isPending
                      ? "not-allowed"
                      : "pointer",
                  boxShadow: !selectedAnswer
                    ? "none"
                    : "0 4px 20px rgba(124,58,237,0.35)",
                  transition: "all 0.2s",
                  letterSpacing: "0.02em",
                }}
              >
                {submitAnswerMutation.isPending
                  ? "Enviando..."
                  : "Confirmar respuesta ✓"}
              </button>

              {submitAnswerMutation.isError && (
                <div
                  style={{
                    marginTop: "12px",
                    backgroundColor: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.4)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    color: "#fca5a5",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                >
                  Error al enviar. Intenta de nuevo.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
