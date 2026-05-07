import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import type { AxiosError } from "axios";
import { io } from "socket.io-client";
import { API_ROOT, api } from "../api/client";
import type { ChatMessage, UserProfile, WeightLog } from "../types/api";

const quickPrompts = [
  "Create a high-protein meal plan for today",
  "Review my macros for muscle gain",
  "Give me a simple grocery list",
  "Suggest a post-workout recovery meal",
];

const MESSAGE_LIMIT = 2400;

const formatGoal = (goal?: UserProfile["goal_type"]) => {
  if (!goal) return "-";
  return goal.replace(/_/g, " ");
};

const renderInline = (value: string): ReactNode[] => {
  return value.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const ChatContent = ({ content }: { content: string }) => {
  const lines = content.split(/\r?\n/);

  return (
    <div className="message-content">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        const key = `${index}-${trimmed}`;

        if (!trimmed) {
          return <span key={key} className="message-break" aria-hidden="true" />;
        }

        const heading = trimmed.match(/^\*\*(.+):\*\*$/);
        if (heading) {
          return <h4 key={key}>{heading[1]}</h4>;
        }

        const bullet = trimmed.match(/^[-*]\s+(.+)$/);
        if (bullet) {
          return (
            <p key={key} className="message-list-item">
              <span aria-hidden="true" />
              <span>{renderInline(bullet[1])}</span>
            </p>
          );
        }

        const numbered = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (numbered) {
          return (
            <p key={key} className="message-list-item numbered">
              <span>{numbered[1]}</span>
              <span>{renderInline(numbered[2])}</span>
            </p>
          );
        }

        return <p key={key}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
};

export const ChatPage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [socketEnabled, setSocketEnabled] = useState(true);
  const [weight, setWeight] = useState("");
  const [error, setError] = useState("");
  const [chatStats, setChatStats] = useState<UserProfile | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    api.get("/chat-history").then((response) => setMessages(response.data.data || []));
    api.get("/user").then((response) => setChatStats(response.data.data));
    api.get("/weight-log").then((response) => setWeightLogs(response.data.data || []));
  }, []);

  useEffect(() => {
    if (!socketEnabled) return undefined;
    const token = localStorage.getItem("nutriai_token");
    if (!token) return undefined;

    const socket = io(API_ROOT, { auth: { token } });
    socketRef.current = socket;

    let streamed = "";

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("chat_status", (payload) => {
      if (payload.status === "typing") {
        streamed = "";
        setMessages((prev) => [...prev, { id: `stream-${Date.now()}`, role: "assistant", content: "" }]);
      }
      if (payload.status === "done") {
        setLoading(false);
      }
    });

    socket.on("chat_token", ({ token: chunk }) => {
      streamed += chunk;
      setMessages((prev) => {
        const clone = [...prev];
        for (let idx = clone.length - 1; idx >= 0; idx -= 1) {
          if (clone[idx].role === "assistant") {
            clone[idx] = { ...clone[idx], content: streamed };
            break;
          }
        }
        return clone;
      });
    });

    socket.on("chat_error", ({ error: chatError }) => {
      setError(chatError || "Socket chat failed.");
      setLoading(false);
    });

    return () => {
      setSocketConnected(false);
      socket.disconnect();
    };
  }, [socketEnabled]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const canUseSocket = useMemo(() => socketEnabled && socketConnected, [socketConnected, socketEnabled]);

  const weightTrend = useMemo(() => {
    if (weightLogs.length < 2) return null;
    const latest = weightLogs[0];
    const previous = weightLogs[1];
    const diff = latest.weight_kg - previous.weight_kg;
    return {
      label: diff === 0 ? "No change" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg since last log`,
      direction: diff === 0 ? "steady" : diff > 0 ? "up" : "down",
    };
  }, [weightLogs]);

  const targetGap = useMemo(() => {
    if (!chatStats?.target_weight || !chatStats.weight_kg) return null;
    const diff = chatStats.weight_kg - chatStats.target_weight;
    if (Math.abs(diff) < 0.1) return "At target weight";
    return `${Math.abs(diff).toFixed(1)} kg ${diff > 0 ? "above" : "below"} target`;
  }, [chatStats]);

  const completionScore = useMemo(() => {
    if (!chatStats) return 0;
    const fields = [
      chatStats.age,
      chatStats.gender,
      chatStats.height_cm,
      chatStats.weight_kg,
      chatStats.goal_type,
      chatStats.activity_level,
      chatStats.target_weight,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [chatStats]);

  const submitMessage = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    setError("");
    setLoading(true);
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: trimmed }]);
    setText("");

    if (canUseSocket) {
      socketRef.current.emit("chat_message", { message: trimmed });
      return;
    }

    try {
      const response = await api.post("/chat", { message: trimmed });
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", content: response.data.response }]);
    } catch (requestError) {
      const err = requestError as AxiosError<{ error?: string }>;
      setError(err.response?.data?.error || "Message failed.");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitMessage(text);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void submitMessage(text);
  };

  const copyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(""), 1400);
    } catch {
      setError("Copy failed.");
    }
  };

  const retryLastPrompt = () => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
    if (lastUserMessage) {
      void submitMessage(lastUserMessage.content);
    }
  };

  const clearHistory = async () => {
    await api.delete("/chat-history");
    setMessages([]);
  };

  const logWeight = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextWeight = Number(weight);
    if (!(nextWeight >= 20 && nextWeight <= 300)) {
      setError("Weight must be between 20 and 300 kg.");
      return;
    }

    try {
      await api.post("/weight-log", { weight_kg: nextWeight });
      setWeight("");
      setError("");
      const [userResponse, weightResponse] = await Promise.all([api.get("/user"), api.get("/weight-log")]);
      setChatStats(userResponse.data.data);
      setWeightLogs(weightResponse.data.data || []);
    } catch {
      setError("Weight log failed.");
    }
  };

  return (
    <section className="member-workspace">
      <div className="member-hero">
        <div>
          <p className="eyebrow">Training Dashboard</p>
          <h1>Welcome back{chatStats?.name ? `, ${chatStats.name.split(" ")[0]}` : ""}.</h1>
          <p>Plan meals, check targets, and keep your nutrition coach in sync with your current goal.</p>
        </div>
        <div className="hero-metrics" aria-label="Daily nutrition summary">
          <article>
            <span>Target</span>
            <strong>{chatStats?.daily_targets?.calorie_target || "-"}</strong>
            <small>calories</small>
          </article>
          <article>
            <span>Protein</span>
            <strong>{chatStats?.daily_targets?.protein_grams || "-"}</strong>
            <small>grams</small>
          </article>
          <article>
            <span>Profile</span>
            <strong>{completionScore}%</strong>
            <small>complete</small>
          </article>
        </div>
      </div>
      <div className="chat-layout">
      <aside className="card sidebar">
        <div className="profile-card-top">
          <div className="avatar-mark">{chatStats?.name?.charAt(0).toUpperCase() || "N"}</div>
          <div>
            <p className="eyebrow">Athlete Console</p>
            <h3>{chatStats?.name || "Your profile"}</h3>
          </div>
        </div>
        <div className="profile-pills">
          <span>{formatGoal(chatStats?.goal_type)}</span>
          <span>BMI {chatStats?.bmi ? Number(chatStats.bmi).toFixed(1) : "-"}</span>
        </div>
        {targetGap ? <p className="target-gap">{targetGap}</p> : null}
        <div className="targets">
          <p><span>Calories</span><strong>{chatStats?.daily_targets?.calorie_target || "-"}</strong></p>
          <p><span>Protein</span><strong>{chatStats?.daily_targets?.protein_grams || "-"} g</strong></p>
          <p><span>Water</span><strong>{chatStats?.daily_targets?.water_liters || "-"} L</strong></p>
          <p><span>Steps</span><strong>{chatStats?.daily_targets?.steps_goal || "-"}</strong></p>
        </div>
        <div className="weight-panel">
          <div>
            <h4>Weight trend</h4>
            <p className={`trend ${weightTrend?.direction || "steady"}`}>{weightTrend?.label || "Add two logs to see a trend"}</p>
          </div>
          {weightLogs.length ? (
            <ol className="weight-list" aria-label="Recent weight logs">
              {weightLogs.slice(0, 5).map((log) => (
                <li key={log.id}>
                  <span>{new Date(log.created_at).toLocaleDateString()}</span>
                  <strong>{log.weight_kg.toFixed(1)} kg</strong>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
        <form className="stack" onSubmit={logWeight}>
          <input type="number" step="0.1" min="20" max="300" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="Log weight (kg)" required />
          <button className="solid-btn" type="submit">Save weight</button>
        </form>
        <button type="button" className="ghost-btn" onClick={() => setSocketEnabled((prev) => !prev)}>
          {socketEnabled ? "Disable" : "Enable"} Socket Stream{socketEnabled ? ` (${socketConnected ? "live" : "connecting"})` : ""}
        </button>
        <button type="button" className="ghost-btn" onClick={retryLastPrompt} disabled={!messages.some((message) => message.role === "user") || loading}>Retry last prompt</button>
        <button type="button" className="ghost-btn" onClick={clearHistory}>Clear chat</button>
      </aside>
      <div className="card chat-panel">
        <div className="chat-header">
          <div>
            <p className="eyebrow">Coach Chat</p>
            <h2>Ask for meal plans, macros, cuts, bulks, or recovery ideas.</h2>
          </div>
          <span className={socketConnected ? "status-pill live" : "status-pill"}>{socketConnected ? "Live" : "Fallback"}</span>
        </div>
        <div className="quick-prompts" aria-label="Suggested prompts">
          {quickPrompts.map((prompt) => (
            <button key={prompt} type="button" className="prompt-chip" onClick={() => setText(prompt)}>
              {prompt}
            </button>
          ))}
        </div>
        <div className="message-list" ref={listRef}>
          {messages.length === 0 ? <p className="empty-chat">Ask your first nutrition question.</p> : null}
          {messages.map((message) => (
            <article key={message.id} className={`bubble ${message.role}`}>
              <div className="bubble-toolbar">
                <span>{message.role === "assistant" ? "Coach" : "You"}</span>
                <button type="button" className="mini-btn" onClick={() => void copyMessage(message)}>
                  {copiedId === message.id ? "Copied" : "Copy"}
                </button>
              </div>
              <ChatContent content={message.content} />
            </article>
          ))}
          {loading ? <p className="typing-note">Coach is preparing your answer...</p> : null}
        </div>
        <form className="chat-form" onSubmit={sendMessage}>
          <div className="composer">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Ask about nutrition or fitness..."
              rows={2}
              maxLength={MESSAGE_LIMIT}
              required
            />
            <span>{text.length}/{MESSAGE_LIMIT}</span>
          </div>
          <button className="solid-btn" type="submit" disabled={loading}>{loading ? "Sending..." : "Send"}</button>
        </form>
        {error ? <p className="error-text">{error}</p> : null}
      </div>
      </div>
    </section>
  );
};
