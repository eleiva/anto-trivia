"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";

const EMOJIS = [
  "🎵",
  "🎶",
  "🎸",
  "🥁",
  "🎺",
  "🎻",
  "🎷",
  "🎹",
  "🎤",
  "🎧",
  "🦁",
  "🐯",
  "🦊",
  "🐺",
  "🦝",
  "🌟",
  "⭐",
  "🌈",
  "🔥",
  "⚡",
];

export default function HomePage() {
  const router = useRouter();

  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const [userName, setUserName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [userError, setUserError] = useState("");
  const [userLoading, setUserLoading] = useState(false);

  const loginMutation = trpc.admin.login.useMutation();
  const createSessionMutation = trpc.admin.createSession.useMutation();
  const joinSessionMutation = trpc.participant.joinSession.useMutation();
  const getSessionQuery = trpc.admin.getWaitingOrActiveSession.useQuery(
    undefined,
    { refetchInterval: 3000 },
  );

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);
    try {
      const result = await loginMutation.mutateAsync({
        username: adminUsername,
        password: adminPassword,
      });
      localStorage.setItem("admin_token", result.token);

      const existingSession = getSessionQuery.data;
      let sessionId: string;
      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        const session = await createSessionMutation.mutateAsync();
        sessionId = session.id;
      }
      localStorage.setItem("admin_session_id", sessionId);
      router.push("/admin");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al iniciar sesión";
      setAdminError(
        message.includes("Invalid")
          ? "Usuario o contraseña incorrectos"
          : message,
      );
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setUserError("");
    if (!userName.trim()) {
      setUserError("Por favor ingresa tu nombre");
      return;
    }
    if (!selectedEmoji) {
      setUserError("Por favor elige un emoji");
      return;
    }

    setUserLoading(true);
    try {
      const session = getSessionQuery.data;
      if (!session) {
        setUserError("No hay una sesión activa. Espera al administrador.");
        setUserLoading(false);
        return;
      }
      const participant = await joinSessionMutation.mutateAsync({
        sessionId: session.id,
        name: userName.trim(),
        emoji: selectedEmoji,
      });
      localStorage.setItem("participant_id", participant.id);
      localStorage.setItem("session_id", session.id);
      localStorage.setItem("participant_name", participant.name);
      localStorage.setItem("participant_emoji", participant.emoji);
      router.push("/play");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al unirse";
      setUserError(message);
    } finally {
      setUserLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#0a0a14",
    border: "1.5px solid rgba(139, 92, 246, 0.4)",
    borderRadius: "12px",
    padding: "14px 18px",
    color: "white",
    fontSize: "16px",
    outline: "none",
    transition: "border-color 0.2s",
    marginTop: "6px",
  };

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
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ── HEADER ── */}
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <div
          style={{ fontSize: "72px", marginBottom: "16px", display: "block" }}
          className="pulse-music"
        >
          🎶
        </div>
        <h1
          style={{
            fontSize: "clamp(2.4rem, 6vw, 4rem)",
            fontWeight: 900,
            letterSpacing: "-1px",
            background: "linear-gradient(135deg, #c084fc, #a855f7, #7c3aed)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "10px",
            lineHeight: 1.1,
          }}
        >
          Trivia de Música
        </h1>
        <p style={{ color: "#a78bfa", fontSize: "18px", fontWeight: 500 }}>
          Quiz Musical Interactivo
        </p>
      </div>

      {/* ── CARDS GRID ── */}
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
        }}
      >
        {/* ── JOIN CARD ── */}
        <div
          style={{
            backgroundColor: "#12122a",
            border: "1.5px solid rgba(139, 92, 246, 0.35)",
            borderRadius: "24px",
            padding: "36px 32px",
            boxShadow: "0 8px 40px rgba(124, 58, 237, 0.15)",
          }}
        >
          {/* Card header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                flexShrink: 0,
              }}
            >
              🎮
            </div>
            <div>
              <h2
                style={{
                  color: "white",
                  fontWeight: 800,
                  fontSize: "20px",
                  margin: 0,
                }}
              >
                ¡Únete al Quiz!
              </h2>
              <p
                style={{
                  color: "#9f67fa",
                  fontSize: "14px",
                  margin: "3px 0 0",
                }}
              >
                Elige tu nombre y emoji
              </p>
            </div>
          </div>

          {/* Session pill */}
          <div style={{ marginBottom: "24px" }}>
            {getSessionQuery.isLoading ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "rgba(100,100,100,0.15)",
                  border: "1px solid rgba(100,100,100,0.3)",
                  borderRadius: "999px",
                  padding: "6px 14px",
                  fontSize: "13px",
                  color: "#9ca3af",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#6b7280",
                    display: "inline-block",
                  }}
                />
                Buscando sesión...
              </span>
            ) : getSessionQuery.data ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.35)",
                  borderRadius: "999px",
                  padding: "6px 14px",
                  fontSize: "13px",
                  color: "#6ee7b7",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#10b981",
                    display: "inline-block",
                  }}
                  className="animate-pulse"
                />
                Sesión disponible ✓
              </span>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "rgba(245,158,11,0.12)",
                  border: "1px solid rgba(245,158,11,0.35)",
                  borderRadius: "999px",
                  padding: "6px 14px",
                  fontSize: "13px",
                  color: "#fcd34d",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#f59e0b",
                    display: "inline-block",
                  }}
                  className="animate-pulse"
                />
                Esperando al administrador...
              </span>
            )}
          </div>

          <form onSubmit={handleJoin}>
            {/* Name input */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  color: "#c4b5fd",
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                }}
              >
                Tu nombre
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Ej: María García"
                maxLength={50}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#a855f7")}
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(139, 92, 246, 0.4)")
                }
              />
            </div>

            {/* Emoji grid */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  color: "#c4b5fd",
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                  display: "block",
                  marginBottom: "12px",
                }}
              >
                Elige tu emoji
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "8px",
                }}
              >
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    style={{
                      fontSize: "28px",
                      padding: "10px 6px",
                      borderRadius: "12px",
                      border:
                        selectedEmoji === emoji
                          ? "2px solid #a855f7"
                          : "2px solid transparent",
                      backgroundColor:
                        selectedEmoji === emoji
                          ? "rgba(168, 85, 247, 0.2)"
                          : "rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      transform:
                        selectedEmoji === emoji ? "scale(1.12)" : "scale(1)",
                      lineHeight: 1,
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {selectedEmoji && (
                <p
                  style={{
                    textAlign: "center",
                    color: "#a78bfa",
                    fontSize: "14px",
                    marginTop: "10px",
                  }}
                >
                  Elegiste: {selectedEmoji}
                </p>
              )}
            </div>

            {userError && (
              <div
                style={{
                  backgroundColor: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  color: "#fca5a5",
                  fontSize: "14px",
                  marginBottom: "16px",
                }}
              >
                {userError}
              </div>
            )}

            <button
              type="submit"
              disabled={userLoading || !getSessionQuery.data}
              style={{
                width: "100%",
                background:
                  userLoading || !getSessionQuery.data
                    ? "linear-gradient(135deg, #374151, #4b5563)"
                    : "linear-gradient(135deg, #7c3aed, #a855f7)",
                color: "white",
                fontWeight: 800,
                fontSize: "17px",
                padding: "16px",
                borderRadius: "14px",
                border: "none",
                cursor:
                  userLoading || !getSessionQuery.data
                    ? "not-allowed"
                    : "pointer",
                transition: "all 0.2s",
                boxShadow:
                  userLoading || !getSessionQuery.data
                    ? "none"
                    : "0 4px 20px rgba(124, 58, 237, 0.35)",
                letterSpacing: "0.02em",
              }}
            >
              {userLoading ? "Uniéndose..." : "Continuar 🎵"}
            </button>
          </form>
        </div>

        {/* ── ADMIN CARD ── */}
        <div
          style={{
            backgroundColor: "#12122a",
            border: "1.5px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "24px",
            padding: "36px 32px",
            boxShadow: "0 8px 40px rgba(99, 102, 241, 0.1)",
          }}
        >
          {/* Card header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                flexShrink: 0,
              }}
            >
              🔐
            </div>
            <div>
              <h2
                style={{
                  color: "white",
                  fontWeight: 800,
                  fontSize: "20px",
                  margin: 0,
                }}
              >
                Administrador
              </h2>
              <p
                style={{
                  color: "#818cf8",
                  fontSize: "14px",
                  margin: "3px 0 0",
                }}
              >
                Panel de control del quiz
              </p>
            </div>
          </div>

          <form onSubmit={handleAdminLogin}>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  color: "#c4b5fd",
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                }}
              >
                Usuario
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="Usuario"
                autoComplete="username"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#818cf8")}
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(139, 92, 246, 0.4)")
                }
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  color: "#c4b5fd",
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                }}
              >
                Contraseña
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#818cf8")}
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(139, 92, 246, 0.4)")
                }
              />
            </div>

            {adminError && (
              <div
                style={{
                  backgroundColor: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  color: "#fca5a5",
                  fontSize: "14px",
                  marginBottom: "20px",
                }}
              >
                {adminError}
              </div>
            )}

            <button
              type="submit"
              disabled={adminLoading}
              style={{
                width: "100%",
                background: adminLoading
                  ? "linear-gradient(135deg, #374151, #4b5563)"
                  : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                color: "white",
                fontWeight: 800,
                fontSize: "17px",
                padding: "16px",
                borderRadius: "14px",
                border: "none",
                cursor: adminLoading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: adminLoading
                  ? "none"
                  : "0 4px 20px rgba(79, 70, 229, 0.35)",
                letterSpacing: "0.02em",
              }}
            >
              {adminLoading ? "Entrando..." : "Iniciar sesión →"}
            </button>
          </form>

          <div
            style={{
              marginTop: "28px",
              paddingTop: "20px",
              borderTop: "1px solid rgba(99, 102, 241, 0.2)",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#4b5563", fontSize: "13px" }}>
              Acceso restringido al administrador
            </p>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ marginTop: "48px", textAlign: "center" }}>
        <p style={{ color: "#374151", fontSize: "13px" }}>
          🎵 Trivia de Música — Quiz Interactivo
        </p>
      </div>
    </main>
  );
}
