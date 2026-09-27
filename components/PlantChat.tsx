"use client";

import { useEffect, useRef, useState } from "react";
import { Leaf, MessageCircle, Send, Sparkles, Square, X } from "lucide-react";
import { useCareAIConfiguration } from "./CareAIProvider";
import LeafLoader from "./LeafLoader";
import { usePurunStore } from "@/store/usePurunStore";
import { aiStatusMessages, isAIStatus, type AIStatus } from "@/lib/ai-status";
import { chatResponseSchema, localChatReply, type ChatMessage } from "@/lib/plant-chat";

type Turn = ChatMessage & {
  id: string; source?: "ai-enhanced" | "local-rules"; model?: string;
  readingAt?: string; score?: number; outcome?: AIStatus;
};
const starters = ["How is my Purun doing?", "What should I do first?", "Why this health score?"];
const readingTime = (timestamp: string) => new Date(timestamp).toLocaleString("en-SG", {
  day: "numeric", month: "short", hour: "numeric", minute: "2-digit", second: "2-digit",
});

export default function PlantChat() {
  const config = useCareAIConfiguration();
  const reading = usePurunStore((state) => state.currentReading);
  const assessment = usePurunStore((state) => state.currentAssessment);
  const model = usePurunStore((state) => state.selectedAIModel);
  const ready = usePurunStore((state) => state.hasHydrated);
  const dialog = useRef<HTMLDialogElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const pending = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) { dialog.current?.close(); return; }
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [open]);
  useEffect(() => {
    if (pending.current) {
      pending.current.abort();
      setNotice("The reading or model changed. Send your question again for the latest context.");
    }
  }, [reading, model]);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => { if (log.current) log.current.scrollTop = turns.length || loading ? log.current.scrollHeight : 0; }, [turns, loading, notice, open]);

  function stop() {
    if (pending.current) {
      pending.current.abort();
      setNotice("Reply stopped. You can send another question whenever you’re ready.");
    }
  }
  function close() { stop(); setOpen(false); }

  async function sendMessage(text: string) {
    const question = text.trim();
    if (!question || question.length > 1000 || pending.current || !ready) return;
    const state = usePurunStore.getState();
    const user: Turn = { id: crypto.randomUUID(), role: "user", content: question };
    const messages: ChatMessage[] = [...turns.slice(-10), user].map(({ role, content }) => ({ role, content }));
    const controller = new AbortController();
    pending.current = controller;
    setTurns((previous) => [...previous, user].slice(-40));
    setDraft("");
    setNotice("");
    setLoading(true);
    const fallback = { reply: localChatReply(state.currentAssessment, question), source: "local-rules" as const };
    let answer: { reply: string; source: "local-rules" | "ai-enhanced" } = fallback;
    let outcome: AIStatus = config.status;
    let received = false;
    const timer = window.setTimeout(() => controller.abort("timeout"), 25000);
    try {
      if (config.status === "ready") {
        const response = await fetch("/api/plant-chat", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({ model: state.selectedAIModel || config.defaultModel, reading: state.currentReading,
            isSimulationMode: state.isSimulationMode, messages }),
        });
        if (!response.ok) throw new Error("Chat unavailable");
        received = true;
        answer = chatResponseSchema.parse(await response.json());
        const status = response.headers.get("X-Care-AI-Status");
        outcome = answer.source === "ai-enhanced" ? "enhanced" : isAIStatus(status) && status !== "enhanced" ? status : "provider-error";
      }
    } catch {
      outcome = controller.signal.reason === "timeout" ? "timeout" : received ? "invalid-output" : "network-error";
      answer = fallback;
    } finally {
      window.clearTimeout(timer);
      pending.current = null;
      setLoading(false);
    }
    const latest = usePurunStore.getState();
    if ((controller.signal.aborted && controller.signal.reason !== "timeout") || latest.currentReading !== state.currentReading || latest.selectedAIModel !== state.selectedAIModel) return;
    const reply: Turn = {
      id: crypto.randomUUID(), role: "assistant", content: answer.reply, source: answer.source,
      model: config.models.find((entry) => entry.id === state.selectedAIModel)?.name ?? state.selectedAIModel,
      readingAt: state.currentReading.timestamp, score: state.currentAssessment.score, outcome,
    };
    setTurns((previous) => [...previous, reply].slice(-40));
  }

  return <>
    <button type="button" className="plant-chat-launch" aria-haspopup="dialog" aria-controls="plant-chat" onClick={() => setOpen(true)} disabled={!ready}>
      <MessageCircle size={18} aria-hidden="true" /> Ask Purun
    </button>
    <dialog ref={dialog} id="plant-chat" className="plant-chat-dialog" aria-labelledby="plant-chat-title" aria-describedby="plant-chat-description" onCancel={close} onClose={close}>
      <div className="plant-chat-panel">
        <header className="plant-chat-heading">
          <span className="plant-chat-mark"><Leaf size={25} aria-hidden="true" /></span>
          <div><h2 id="plant-chat-title">A little plant talk</h2><p id="plant-chat-description">Ask Purun about its simulated care.</p></div>
          <button type="button" className="simulation-close" aria-label="Close plant chat" onClick={close}><X size={20} aria-hidden="true" /></button>
        </header>
        <section className="plant-chat-context" aria-label="Current plant context">
          <p><span className={`plant-chat-health plant-chat-health-${assessment.status}`}>{assessment.score}/100 · {assessment.status}</span><span>Simulated context</span></p>
          <div><span>Water <strong>{reading.waterLevelPct}%</strong></span><span>Light <strong>{reading.lightLux.toLocaleString("en-SG")} lux</strong></span><span>PM2.5 <strong>{reading.pm25UgM3} µg/m³</strong></span><span>Water <strong>{reading.waterTempC}°C</strong></span></div>
          <p className="plant-chat-context-note">Each question uses the latest reading. Earlier replies keep their original context.</p>
        </section>
        <div className="plant-chat-model">
          <label htmlFor="plant-chat-model">Reply model</label>
          <select id="plant-chat-model" value={model} onChange={(event) => usePurunStore.getState().setAIModel(event.target.value)} disabled={!config.models.length}>
            {!model && <option value="">No model selected</option>}
            {config.models.map((entry) => <option key={entry.id} value={entry.id} disabled={!entry.selectable}>{entry.name}{!entry.selectable ? " · unavailable for chat" : ""}</option>)}
          </select>
          <button type="button" className="plant-chat-reset" disabled={!turns.length || loading} onClick={() => { setTurns([]); setNotice(""); }}>Clear chat</button>
        </div>
        <div ref={log} className="plant-chat-log" role="log" aria-label="Plant conversation" aria-live="polite" aria-relevant="additions text">
          {!turns.length && <div className="plant-chat-welcome">
            <Sparkles size={25} aria-hidden="true" /><h3>Start with what’s growing.</h3>
            <p>I have your current simulated reading and care assessment. Ask about the next care step, or what a condition means.</p>
            <div className="plant-chat-starters">{starters.map((question) => <button type="button" key={question} onClick={() => void sendMessage(question)}>{question}<Send size={14} aria-hidden="true" /></button>)}</div>
          </div>}
          {turns.map((turn) => <article key={turn.id} className={`plant-chat-turn plant-chat-turn-${turn.role}`} aria-label={turn.role === "user" ? "You" : "Purun"}>
            <span className="plant-chat-speaker">{turn.role === "user" ? "You" : turn.source === "ai-enhanced" ? `Purun · AI reply · ${turn.model}` : "Purun · Local care logic"}</span>
            {turn.source === "local-rules" && <p className="plant-chat-fallback">{turn.outcome && aiStatusMessages[turn.outcome]} Here’s a local care recap; conversational replies need AI.</p>}
            <p>{turn.content}</p>
            {turn.readingAt && <span className="plant-chat-stamp">Simulated reading · {readingTime(turn.readingAt)} · score {turn.score}</span>}
          </article>)}
          {loading && <LeafLoader compact label="Thinking about your Purun…" detail="Reading the latest conditions and your question." />}
        </div>
        <form className="plant-chat-compose" onSubmit={(event) => { event.preventDefault(); void sendMessage(draft); }}>
          <p className="plant-chat-notice" role="status">{notice}</p>
          <label htmlFor="plant-chat-question">Your question</label>
          <div>
            <textarea id="plant-chat-question" rows={2} maxLength={1000} value={draft} placeholder="What does my Purun need today?" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void sendMessage(draft); }
            }} />
            {loading ? <button type="button" onClick={stop} aria-label="Stop reply"><Square size={18} aria-hidden="true" /></button>
              : <button type="submit" disabled={!draft.trim()} aria-label="Send question"><Send size={20} aria-hidden="true" /></button>}
          </div>
          <p>AI can be mistaken. Chat explains; it never changes your plant’s score or controls.</p>
          <p>{config.status === "ready" ? "Messages and simulated readings go to your configured AI provider. " : "AI is unavailable; local care recaps still work. "}Chat clears on reload; only recent turns are remembered.</p>
        </form>
      </div>
    </dialog>
  </>;
}
