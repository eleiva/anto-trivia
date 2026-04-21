"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";

export default function ResultsPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);

  useEffect(() => {
    const adminSession = localStorage.getItem("admin_session_id");
    const participantSession = localStorage.getItem("session_id");
    const pid = localStorage.getItem("participant_id");
    const sid = adminSession ?? participantSession;
    if (!sid) {
      router.push("/");
      return;
    }
    setSessionId(sid);
    setMyParticipantId(pid);
  }, [router]);

  const rankings = trpc.participant.getRankings.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId, refetchInterval: 5000 },
  );

  const sessionState = trpc.participant.getSessionState.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId, refetchInterval: 5000 },
  );

  if (!sessionId) {
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

  const allRankings = rankings.data ?? [];
  const top10 = allRankings.slice(0, 10);
  const rest = allRankings.slice(10);
  const displayedRankings = showAll ? allRankings : top10;
  const sessionStatus = sessionState.data?.session?.status;

  const myRank = allRankings.find((p) => p.id === myParticipantId);
  const myPosition = myRank ? allRankings.indexOf(myRank) + 1 : null;

  function handleWhatsApp() {
    const top3 = allRankings.slice(0, 3);
    const medals = ["🥇", "🥈", "🥉"];
    const podiumText = top3
      .map((p, i) => `${medals[i]} ${p.emoji} ${p.name} — ${p.score} pts`)
      .join("\n");
    const myText =
      myRank && myPosition
        ? `\n\nMi resultado: puesto #${myPosition} con ${myRank.score} puntos ${myRank.emoji}`
        : "";
    const text = `🎵 *Trivia de Música*\n\n🏆 Podio:\n${podiumText}${myText}\n\n¡Jugá vos también!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  const medalEmoji = (pos: number) => {
    if (pos === 1) return "🥇";
    if (pos === 2) return "🥈";
    if (pos === 3) return "🥉";
    return null;
  };

  const rowStyle = (pos: number, isMe: boolean): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      borderRadius: "16px",
      padding: "16px 20px",
      border: isMe ? "2px solid rgba(168,85,247,0.7)" : "1.5px solid",
      transition: "all 0.2s",
      position: "relative",
      overflow: "hidden",
    };
    if (pos === 1)
      return {
        ...base,
        borderColor: "rgba(234,179,8,0.5)",
        background:
          "linear-gradient(135deg,rgba(161,120,0,0.18),rgba(120,80,0,0.1))",
      };
    if (pos === 2)
      return {
        ...base,
        borderColor: "rgba(156,163,175,0.4)",
        background: "rgba(75,85,99,0.15)",
      };
    if (pos === 3)
      return {
        ...base,
        borderColor: "rgba(180,120,40,0.45)",
        background: "rgba(120,70,20,0.15)",
      };
    return {
      ...base,
      borderColor: "rgba(139,92,246,0.2)",
      background: "rgba(255,255,255,0.02)",
    };
  };

  const scoreColor = (pos: number) => {
    if (pos === 1) return "#facc15";
    if (pos === 2) return "#d1d5db";
    if (pos === 3) return "#d97706";
    return "#a78bfa";
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        backgroundColor: "#0a0a14",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 16px 60px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: "600px" }}>
        {/* ── Header ── */}
        <div
          style={{ textAlign: "center", marginBottom: "48px" }}
          className="fade-in"
        >
          <div
            style={{ fontSize: "80px", marginBottom: "16px" }}
            className="animate-bounce"
          >
            🏆
          </div>
          <h1
            style={{
              fontSize: "clamp(2.2rem,6vw,3.5rem)",
              fontWeight: 900,
              background: "linear-gradient(135deg,#c084fc,#7c3aed)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: "10px",
              lineHeight: 1.1,
            }}
          >
            Resultados
          </h1>
          <p style={{ color: "#a78bfa", fontSize: "18px", fontWeight: 500 }}>
            {sessionStatus === "finished"
              ? "¡El quiz ha finalizado!"
              : "Resultados en tiempo real"}
          </p>

          {/* My result pill */}
          {myRank && myPosition && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                marginTop: "20px",
                backgroundColor: "rgba(124,58,237,0.15)",
                border: "1.5px solid rgba(168,85,247,0.4)",
                borderRadius: "999px",
                padding: "10px 20px",
              }}
            >
              <span style={{ fontSize: "24px" }}>{myRank.emoji}</span>
              <span
                style={{ color: "white", fontWeight: 700, fontSize: "16px" }}
              >
                {myRank.name}
              </span>
              <span style={{ color: "#c4b5fd", fontSize: "14px" }}>·</span>
              <span
                style={{ color: "#c4b5fd", fontSize: "15px", fontWeight: 600 }}
              >
                Puesto #{myPosition}
              </span>
              <span style={{ color: "#c4b5fd", fontSize: "14px" }}>·</span>
              <span
                style={{ color: "#facc15", fontWeight: 800, fontSize: "16px" }}
              >
                {myRank.score} pts
              </span>
            </div>
          )}
        </div>

        {/* ── Podium (top 3) ── */}
        {allRankings.length >= 2 && (
          <div style={{ marginBottom: "40px" }} className="fade-in">
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                gap: "12px",
                height: "200px",
              }}
            >
              {/* 2nd */}
              {allRankings[1] && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flex: 1,
                    maxWidth: "150px",
                  }}
                >
                  <div style={{ fontSize: "36px", marginBottom: "6px" }}>
                    {allRankings[1].emoji}
                  </div>
                  <p
                    style={{
                      color: "#d1d5db",
                      fontSize: "14px",
                      fontWeight: 700,
                      textAlign: "center",
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      padding: "0 4px",
                    }}
                  >
                    {allRankings[1].name}
                  </p>
                  <p
                    style={{
                      color: "#9ca3af",
                      fontSize: "13px",
                      marginBottom: "8px",
                      fontWeight: 600,
                    }}
                  >
                    {allRankings[1].score} pts
                  </p>
                  <div
                    style={{
                      width: "100%",
                      background: "linear-gradient(to top,#4b5563,#9ca3af)",
                      borderRadius: "12px 12px 0 0",
                      height: "90px",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "center",
                      paddingTop: "10px",
                      fontSize: "28px",
                    }}
                  >
                    🥈
                  </div>
                </div>
              )}
              {/* 1st */}
              {allRankings[0] && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flex: 1,
                    maxWidth: "170px",
                  }}
                >
                  <div
                    style={{ fontSize: "44px", marginBottom: "6px" }}
                    className="animate-bounce"
                  >
                    {allRankings[0].emoji}
                  </div>
                  <p
                    style={{
                      color: "#fef08a",
                      fontSize: "15px",
                      fontWeight: 800,
                      textAlign: "center",
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      padding: "0 4px",
                    }}
                  >
                    {allRankings[0].name}
                  </p>
                  <p
                    style={{
                      color: "#facc15",
                      fontSize: "14px",
                      marginBottom: "8px",
                      fontWeight: 800,
                    }}
                  >
                    {allRankings[0].score} pts
                  </p>
                  <div
                    style={{
                      width: "100%",
                      background: "linear-gradient(to top,#a16207,#facc15)",
                      borderRadius: "12px 12px 0 0",
                      height: "130px",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "center",
                      paddingTop: "10px",
                      fontSize: "32px",
                      boxShadow: "0 0 30px rgba(250,204,21,0.3)",
                    }}
                  >
                    🥇
                  </div>
                </div>
              )}
              {/* 3rd */}
              {allRankings[2] && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flex: 1,
                    maxWidth: "150px",
                  }}
                >
                  <div style={{ fontSize: "36px", marginBottom: "6px" }}>
                    {allRankings[2].emoji}
                  </div>
                  <p
                    style={{
                      color: "#d97706",
                      fontSize: "14px",
                      fontWeight: 700,
                      textAlign: "center",
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      padding: "0 4px",
                    }}
                  >
                    {allRankings[2].name}
                  </p>
                  <p
                    style={{
                      color: "#b45309",
                      fontSize: "13px",
                      marginBottom: "8px",
                      fontWeight: 600,
                    }}
                  >
                    {allRankings[2].score} pts
                  </p>
                  <div
                    style={{
                      width: "100%",
                      background: "linear-gradient(to top,#78350f,#d97706)",
                      borderRadius: "12px 12px 0 0",
                      height: "65px",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "center",
                      paddingTop: "10px",
                      fontSize: "28px",
                    }}
                  >
                    🥉
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Rankings list ── */}
        <div
          style={{
            backgroundColor: "#12122a",
            border: "1.5px solid rgba(139,92,246,0.3)",
            borderRadius: "24px",
            padding: "32px 28px",
            boxShadow: "0 8px 40px rgba(124,58,237,0.15)",
            marginBottom: "24px",
          }}
          className="fade-in"
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "24px",
            }}
          >
            <h2
              style={{
                color: "white",
                fontWeight: 800,
                fontSize: "20px",
                margin: 0,
              }}
            >
              📊 Clasificación
            </h2>
            <span style={{ color: "#a78bfa", fontSize: "14px" }}>
              {allRankings.length} participante
              {allRankings.length !== 1 ? "s" : ""}
            </span>
          </div>

          {rankings.isLoading ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 0",
                color: "#a78bfa",
              }}
              className="animate-pulse"
            >
              Cargando resultados...
            </div>
          ) : allRankings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎵</div>
              <p style={{ color: "#6b7280", fontSize: "16px" }}>
                No hay participantes todavía
              </p>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {displayedRankings.map((participant, index) => {
                  const position = index + 1;
                  const medal = medalEmoji(position);
                  const isMe = participant.id === myParticipantId;

                  return (
                    <div key={participant.id} style={rowStyle(position, isMe)}>
                      {/* Gold shimmer for 1st */}
                      {position === 1 && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background:
                              "linear-gradient(90deg,transparent,rgba(250,204,21,0.04),transparent)",
                            pointerEvents: "none",
                          }}
                        />
                      )}

                      {/* Position / medal */}
                      <div
                        style={{
                          flexShrink: 0,
                          width: "36px",
                          height: "36px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {medal ? (
                          <span style={{ fontSize: "28px" }}>{medal}</span>
                        ) : (
                          <span
                            style={{
                              color: "#6b7280",
                              fontWeight: 700,
                              fontSize: "16px",
                            }}
                          >
                            {position}
                          </span>
                        )}
                      </div>

                      {/* Emoji */}
                      <span style={{ fontSize: "32px", flexShrink: 0 }}>
                        {participant.emoji}
                      </span>

                      {/* Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <p
                            style={{
                              color: scoreColor(position),
                              fontWeight: position <= 3 ? 800 : 600,
                              fontSize: position === 1 ? "18px" : "16px",
                              margin: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {participant.name}
                          </p>
                          {isMe && (
                            <span
                              style={{
                                fontSize: "12px",
                                backgroundColor: "rgba(124,58,237,0.3)",
                                border: "1px solid rgba(168,85,247,0.5)",
                                color: "#c4b5fd",
                                padding: "2px 10px",
                                borderRadius: "999px",
                                flexShrink: 0,
                                fontWeight: 600,
                              }}
                            >
                              Tú
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Score */}
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <p
                          style={{
                            color: scoreColor(position),
                            fontWeight: 800,
                            fontSize: "22px",
                            margin: 0,
                            lineHeight: 1,
                          }}
                        >
                          {participant.score}
                        </p>
                        <p
                          style={{
                            color: "#4b5563",
                            fontSize: "12px",
                            margin: "2px 0 0",
                          }}
                        >
                          pts
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {rest.length > 0 && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  style={{
                    width: "100%",
                    marginTop: "16px",
                    padding: "14px",
                    borderRadius: "12px",
                    border: "1.5px solid rgba(139,92,246,0.3)",
                    backgroundColor: "rgba(124,58,237,0.08)",
                    color: "#a78bfa",
                    fontWeight: 600,
                    fontSize: "15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  Ver más ({rest.length} más) ↓
                </button>
              )}
              {showAll && rest.length > 0 && (
                <button
                  onClick={() => setShowAll(false)}
                  style={{
                    width: "100%",
                    marginTop: "16px",
                    padding: "14px",
                    borderRadius: "12px",
                    border: "1.5px solid rgba(139,92,246,0.3)",
                    backgroundColor: "rgba(124,58,237,0.08)",
                    color: "#a78bfa",
                    fontWeight: 600,
                    fontSize: "15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  Ver menos ↑
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Actions ── */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          className="fade-in"
        >
          {/* WhatsApp share */}
          {allRankings.length > 0 && (
            <button
              onClick={handleWhatsApp}
              style={{
                width: "100%",
                padding: "18px",
                borderRadius: "16px",
                border: "none",
                background: "linear-gradient(135deg,#15803d,#22c55e)",
                color: "white",
                fontWeight: 800,
                fontSize: "17px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: "0 4px 20px rgba(34,197,94,0.35)",
                transition: "all 0.2s",
                letterSpacing: "0.02em",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Compartir por WhatsApp
            </button>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <a
              href="/"
              style={{
                flex: 1,
                textAlign: "center",
                padding: "16px",
                borderRadius: "14px",
                border: "1.5px solid rgba(139,92,246,0.3)",
                backgroundColor: "rgba(124,58,237,0.08)",
                color: "#a78bfa",
                fontWeight: 600,
                fontSize: "15px",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
            >
              ← Volver al inicio
            </a>
            {sessionStatus === "active" && (
              <a
                href="/play"
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "16px",
                  borderRadius: "14px",
                  border: "none",
                  background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "15px",
                  textDecoration: "none",
                  boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
                  transition: "all 0.2s",
                }}
              >
                🎮 Volver al juego
              </a>
            )}
          </div>
        </div>

        {/* Live indicator */}
        {sessionStatus === "active" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "20px",
              color: "#4ade80",
              fontSize: "14px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                backgroundColor: "#4ade80",
                borderRadius: "50%",
              }}
              className="animate-pulse"
            />
            Actualizando en tiempo real
          </div>
        )}
      </div>
    </main>
  );
}
