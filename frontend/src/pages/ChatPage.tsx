import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { AxiosError } from "axios";
import { io } from "socket.io-client";
import { api } from "../api/client";
import type { ChatMessage, UserProfile } from "../types/api";

const API_ROOT = (window.location.port === "5000" ? "/api" : "http://localhost:5000/api").replace(/\/api$/, "");

export const ChatPage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [socketEnabled, setSocketEnabled] = useState(true);
  const [weight, setWeight] = useState("");
  const [error, setError] = useState("");
  const [chatStats, setChatStats] = useState<UserProfile | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    api.get("/chat-history").then((response) => setMessages(response.data.data || []));
    api.get("/user").then((response) => setChatStats(response.data.data));
  }, []);

  useEffect(() => {
    if (!socketEnabled) return undefined;
    const token = localStorage.getItem("nutriai_token");
    if (!token) return undefined;

    const socket = io(API_ROOT, { auth: { token } });
    socketRef.current = socket;

    let streamed = "";

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
      socket.disconnect();
    };
  }, [socketEnabled]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const canUseSocket = useMemo(() => socketEnabled && socketRef.current?.connected, [socketEnabled, messages.length]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = text.trim();
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

  const clearHistory = async () => {
    await api.delete("/chat-history");
    setMessages([]);
  };

  const logWeight = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await api.post("/weight-log", { weight_kg: Number(weight) });
    setWeight("");
    const response = await api.get("/user");
    setChatStats(response.data.data);
  };

  return (
    <section className="chat-layout">
      <aside className="card sidebar">
        <h3>Profile snapshot</h3>
        <p>{chatStats?.name}</p>
        <p>Goal: {chatStats?.goal_type || "-"}</p>
        <p>BMI: {chatStats?.bmi ? Number(chatStats.bmi).toFixed(1) : "-"}</p>
        <div className="targets">
          <p>Calories: {chatStats?.daily_targets?.calorie_target || "-"}</p>
          <p>Protein: {chatStats?.daily_targets?.protein_grams || "-"} g</p>
          <p>Water: {chatStats?.daily_targets?.water_liters || "-"} L</p>
          <p>Steps: {chatStats?.daily_targets?.steps_goal || "-"}</p>
        </div>
        <form className="stack" onSubmit={logWeight}>
          <input type="number" step="0.1" min="1" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="Log weight (kg)" required />
          <button className="solid-btn" type="submit">Save weight</button>
        </form>
        <button type="button" className="ghost-btn" onClick={() => setSocketEnabled((prev) => !prev)}>
          {socketEnabled ? "Disable" : "Enable"} Socket Stream
        </button>
        <button type="button" className="ghost-btn" onClick={clearHistory}>Clear chat</button>
      </aside>
      <div className="card chat-panel">
        <div className="message-list" ref={listRef}>
          {messages.length === 0 ? <p>Ask your first nutrition question.</p> : null}
          {messages.map((message) => (
            <article key={message.id} className={`bubble ${message.role}`}>
              <p>{message.content}</p>
            </article>
          ))}
        </div>
        <form className="chat-form" onSubmit={sendMessage}>
          <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask about nutrition or fitness..." required />
          <button className="solid-btn" type="submit" disabled={loading}>{loading ? "Sending..." : "Send"}</button>
        </form>
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </section>
  );
};
