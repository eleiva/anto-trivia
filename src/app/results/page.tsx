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
    // Try admin session first, then participant session
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
    {
      enabled: !!sessionId,
      refetchInterval: 5000,
    }
  );

  const sessionState = trpc.participant.getSessionState.useQuery(
    { sessionId: sessionId! },
    {
      enabled: !!sessionId,
      refetchInterval: 5000,
    }
  );

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-purple-400 text-xl animate-pulse">Cargando...</div>
      </div>
    );
  }

  const allRankings = rankings.data ?? [];
  const top10 = allRankings.slice(0, 10);
  const rest = allRankings.slice(10);
  const displayedRankings = showAll ? allRankings : top10;
  const sessionStatus = sessionState.data?.session?.status;

  const medalEmoji = (position: number) => {
    if (position === 1) return "🥇";
    if (position === 2) return "🥈";
    if (position === 3) return "🥉";
    return null;
  };

  const podiumColors = (position: number) => {
    if (position === 1)
      return "border-yellow-500/60 bg-gradient-to-br from-yellow-900/30 to-amber-900/20";
    if (position === 2)
      return "border-gray-400/60 bg-gradient-to-br from-gray-700/30 to-gray-800/20";
    if (position === 3)
      return "border-amber-700/60 bg-gradient-to-br from-amber-900/30 to-orange-900/20";
    return "border-purple-800/30 bg-[#0f0f1a]/60";
  };

  const positionTextColor = (position: number) => {
    if (position === 1) return "text-yellow-400";
    if (position === 2) return "text-gray-300";
    if (position === 3) return "text-amber-600";
    return "text-purple-400";
  };

  return (
    <main className="min-h-screen bg-[#0f0f1a] p-4 flex flex-col items-center">
      <div className="w-full max-w-2xl py-8">
        {/* Header */}
        <div className="text-center mb-10 fade-in">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-2">
            Resultados
          </h1>
          <p className="text-purple-400 text-lg">
            {sessionStatus === "finished"
              ? "¡El quiz ha finalizado!"
              : "Resultados en tiempo real"}
          </p>
        </div>

        {/* Top 3 Podium (only if we have results) */}
        {allRankings.length >= 3 && (
          <div className="mb-8 fade-in">
            <div className="flex items-end justify-center gap-3 h-48">
              {/* 2nd place */}
              {allRankings[1] && (
                <div className="flex flex-col items-center flex-1 max-w-[140px]">
                  <div className="text-3xl mb-1">{allRankings[1].emoji}</div>
                  <p className="text-white text-sm font-semibold text-center truncate w-full px-1">
                    {allRankings[1].name}
                  </p>
                  <p className="text-gray-300 text-xs mb-2">
                    {allRankings[1].score} pts
                  </p>
                  <div className="w-full bg-gradient-to-t from-gray-600 to-gray-400 rounded-t-xl h-24 flex items-start justify-center pt-2">
                    <span className="text-3xl">🥈</span>
                  </div>
                </div>
              )}

              {/* 1st place */}
              {allRankings[0] && (
                <div className="flex flex-col items-center flex-1 max-w-[160px]">
                  <div className="text-4xl mb-1 animate-bounce">
                    {allRankings[0].emoji}
                  </div>
                  <p className="text-white text-sm font-bold text-center truncate w-full px-1">
                    {allRankings[0].name}
                  </p>
                  <p className="text-yellow-400 text-xs font-bold mb-2">
                    {allRankings[0].score} pts
                  </p>
                  <div className="w-full bg-gradient-to-t from-yellow-700 to-yellow-400 rounded-t-xl h-36 flex items-start justify-center pt-2">
                    <span className="text-3xl">🥇</span>
                  </div>
                </div>
              )}

              {/* 3rd place */}
              {allRankings[2] && (
                <div className="flex flex-col items-center flex-1 max-w-[140px]">
                  <div className="text-3xl mb-1">{allRankings[2].emoji}</div>
                  <p className="text-white text-sm font-semibold text-center truncate w-full px-1">
                    {allRankings[2].name}
                  </p>
                  <p className="text-amber-600 text-xs mb-2">
                    {allRankings[2].score} pts
                  </p>
                  <div className="w-full bg-gradient-to-t from-amber-800 to-amber-600 rounded-t-xl h-16 flex items-start justify-center pt-2">
                    <span className="text-3xl">🥉</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rankings List */}
        <div className="bg-[#1a1a2e] border border-purple-800/40 rounded-2xl p-5 shadow-xl fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-bold text-xl flex items-center gap-2">
              📊 Clasificación
            </h2>
            <span className="text-purple-400 text-sm">
              {allRankings.length} participante
              {allRankings.length !== 1 ? "s" : ""}
            </span>
          </div>

          {rankings.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-purple-400 animate-pulse">
                Cargando resultados...
              </div>
            </div>
          ) : allRankings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">🎵</div>
              <p>No hay participantes todavía</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {displayedRankings.map((participant, index) => {
                  const position = index + 1;
                  const medal = medalEmoji(position);
                  const isMe = participant.id === myParticipantId;

                  return (
                    <div
                      key={participant.id}
                      className={`flex items-center gap-4 rounded-xl p-4 border-2 transition-all ${podiumColors(position)} ${
                        isMe ? "ring-2 ring-purple-500/50" : ""
                      }`}
                    >
                      {/* Position */}
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          position <= 3
                            ? "bg-transparent"
                            : "bg-purple-900/40 border border-purple-700/40"
                        }`}
                      >
                        {medal ? (
                          <span className="text-2xl">{medal}</span>
                        ) : (
                          <span className={positionTextColor(position)}>
                            {position}
                          </span>
                        )}
                      </div>

                      {/* Emoji */}
                      <div className="text-3xl flex-shrink-0">
                        {participant.emoji}
                      </div>

                      {/* Name & "you" badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`font-semibold truncate ${
                              position === 1
                                ? "text-yellow-300 text-lg"
                                : position === 2
                                  ? "text-gray-200"
                                  : position === 3
                                    ? "text-amber-400"
                                    : "text-white"
                            }`}
                          >
                            {participant.name}
                          </p>
                          {isMe && (
                            <span className="text-xs bg-purple-700/50 border border-purple-600/50 text-purple-300 px-2 py-0.5 rounded-full flex-shrink-0">
                              Tú
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Score */}
                      <div className="flex-shrink-0 text-right">
                        <p
                          className={`font-bold text-xl ${
                            position === 1
                              ? "text-yellow-400"
                              : position === 2
                                ? "text-gray-300"
                                : position === 3
                                  ? "text-amber-500"
                                  : "text-purple-300"
                          }`}
                        >
                          {participant.score}
                        </p>
                        <p className="text-gray-500 text-xs">
                          pt{participant.score !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Show more button */}
              {rest.length > 0 && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full mt-4 bg-purple-900/30 hover:bg-purple-800/40 border border-purple-700/40 text-purple-300 hover:text-white font-medium py-3 px-6 rounded-xl transition-all text-sm"
                >
                  Ver más ({rest.length} más) ↓
                </button>
              )}

              {showAll && rest.length > 0 && (
                <button
                  onClick={() => setShowAll(false)}
                  className="w-full mt-4 bg-purple-900/30 hover:bg-purple-800/40 border border-purple-700/40 text-purple-300 hover:text-white font-medium py-3 px-6 rounded-xl transition-all text-sm"
                >
                  Ver menos ↑
                </button>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 fade-in">
          <a
            href="/"
            className="flex-1 text-center bg-[#1a1a2e] hover:bg-purple-900/30 border border-purple-700/40 text-purple-300 hover:text-white font-medium py-3 px-6 rounded-xl transition-all"
          >
            ← Volver al inicio
          </a>
          {sessionStatus === "active" && (
            <a
              href="/play"
              className="flex-1 text-center bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-purple-500/25"
            >
              🎮 Volver al juego
            </a>
          )}
        </div>

        {/* Live indicator */}
        {sessionStatus === "active" && (
          <div className="flex items-center justify-center gap-2 mt-4 text-green-400 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Actualizando en tiempo real
          </div>
        )}
      </div>
    </main>
  );
}
