import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import receiverAssistantService from '../../services/receiverAssistantService';
import ChatMarkdown from './ChatMarkdown';

const roleSettings = {
  receiver: {
    title: 'ShareMeal AI',
    suggestions: ['How do I request food?', 'আমার NID কিভাবে verify করবো?', 'Wallet theke NGO ke kivabe pay korbo?', 'Healthy budget meal ideas'],
    contactPath: '/receiver/notifications'
  },
  donor: {
    title: 'ShareMeal AI',
    suggestions: ['How do I post a donation?', 'Food safety tips for donated food', 'Donation er por ki hoy?', 'How does verification work?'],
    contactPath: '/donor/notifications'
  },
  ngo: {
    title: 'ShareMeal AI',
    suggestions: ['How do I handle receiver requests?', 'Pickup code kivabe verify korbo?', 'Write a thank-you note to donors', 'Where are wallet payments?'],
    contactPath: '/ngo/profile'
  },
  admin: {
    title: 'ShareMeal AI',
    suggestions: ['How do I verify a user?', 'Where are bot & fraud alerts?', 'Summarise good moderation practices', 'Draft an announcement for users'],
    contactPath: '/admin/users'
  }
};

const GREETING = 'Hi! I\'m **ShareMeal AI**, powered by Gemini. Ask me anything — ShareMeal help, general questions, writing, study or code. You can write in English, বাংলা or Banglish.';
const MAX_CONTEXT_MESSAGES = 16;
const MAX_INPUT = 4000;

const storageKey = (role) => `sharemeal_ai_chat_${role}`;

const loadMessages = (role) => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(role)) || 'null');
    if (Array.isArray(saved) && saved.length) return saved.filter((m) => !m.pending);
  } catch {
    // Storage unavailable or corrupted: start fresh.
  }
  return [{ id: 1, sender: 'assistant', text: GREETING, greeting: true }];
};

const TypingDots = () => (
  <span aria-label="ShareMeal AI is thinking" style={{ display: 'inline-flex', gap: 4, padding: '4px 2px' }}>
    {[0, 1, 2].map((n) => (
      <span key={n} style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563eb', animation: `sm-ai-dot 1.2s ${n * 0.15}s infinite ease-in-out` }} />
    ))}
  </span>
);

const iconButton = {
  border: 0, background: 'rgba(255,255,255,0.16)', color: '#ffffff', borderRadius: 8,
  height: 30, minWidth: 30, padding: '0 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
};

export const ShareMealHelpChatbot = ({ role = 'receiver' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const settings = roleSettings[role] || roleSettings.receiver;
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState(() => loadMessages(role));
  const [isResponding, setIsResponding] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const conversationRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(role), JSON.stringify(messages.filter((m) => !m.pending).slice(-40)));
    } catch {
      // Ignore storage errors (private mode, quota).
    }
  }, [messages, role]);

  useEffect(() => {
    if (conversationRef.current) conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const resizeInput = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const goTo = useCallback((path) => {
    navigate(path);
    if (window.innerWidth < 640) setIsOpen(false);
  }, [navigate]);

  const askQuestion = async (value, baseMessages = messages) => {
    const trimmedQuestion = value.trim().slice(0, MAX_INPUT);
    if (!trimmedQuestion || isResponding) return;

    const userMessage = { id: Date.now(), sender: 'user', text: trimmedQuestion };
    const assistantMessageId = userMessage.id + 1;
    const nextMessages = [...baseMessages, userMessage];
    setQuestion('');
    requestAnimationFrame(resizeInput);
    setMessages([...nextMessages, { id: assistantMessageId, sender: 'assistant', text: '', pending: true }]);
    setIsResponding(true);

    const context = nextMessages
      .filter((message) => !message.greeting && !message.error && message.text)
      .slice(-MAX_CONTEXT_MESSAGES)
      .map((message) => ({ role: message.sender === 'assistant' ? 'model' : 'user', text: message.text }));
    while (context[0]?.role === 'model') context.shift();

    const controller = new AbortController();
    abortRef.current = controller;
    let partial = '';

    try {
      const { answer, truncated } = await receiverAssistantService.ask(context, (_chunk, soFar) => {
        partial = soFar;
        setMessages((current) => current.map((message) => (
          message.id === assistantMessageId ? { ...message, text: soFar } : message
        )));
      }, {
        signal: controller.signal,
        page: location.pathname,
        onStatus: (status) => setMessages((current) => current.map((message) => (
          message.id === assistantMessageId ? { ...message, status } : message
        )))
      });
      setMessages((current) => current.map((message) => (
        message.id === assistantMessageId
          ? { id: message.id, sender: 'assistant', text: answer, truncated }
          : message
      )));
    } catch (error) {
      const stopped = error?.name === 'AbortError';
      setMessages((current) => current.map((message) => {
        if (message.id !== assistantMessageId) return message;
        if (stopped) {
          return partial
            ? { id: message.id, sender: 'assistant', text: partial, stopped: true }
            : { id: message.id, sender: 'assistant', text: 'Stopped.', error: true, retryText: trimmedQuestion };
        }
        return {
          id: message.id,
          sender: 'assistant',
          text: error instanceof Error ? error.message : 'The AI assistant could not answer right now. Please try again.',
          error: true,
          retryText: trimmedQuestion
        };
      }));
    } finally {
      abortRef.current = null;
      setIsResponding(false);
    }
  };

  const retry = (message) => {
    // Drop the failed answer and the question it belonged to, then ask again.
    const index = messages.findIndex((m) => m.id === message.id);
    const base = messages.slice(0, Math.max(0, index - 1));
    askQuestion(message.retryText, base);
  };

  const newChat = () => {
    abortRef.current?.abort();
    setMessages([{ id: Date.now(), sender: 'assistant', text: GREETING, greeting: true }]);
    setQuestion('');
    inputRef.current?.focus();
  };

  const copyAnswer = async (message) => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setCopiedId(null);
    }
  };

  const onlyGreeting = messages.length === 1 && messages[0].greeting;
  const panelSize = expanded
    ? { width: 'min(760px, calc(100vw - 32px))', height: 'min(86vh, calc(100vh - 100px))' }
    : { width: 'min(400px, calc(100vw - 32px))', height: 'min(600px, calc(100vh - 110px))' };

  return (
    <div style={{ position: 'fixed', right: '16px', bottom: '16px', zIndex: 1500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @keyframes sm-ai-dot { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        @keyframes sm-ai-caret { 50% { opacity: 0; } }
      `}</style>
      {isOpen && (
        <section
          aria-label="ShareMeal AI assistant"
          style={{ ...panelSize, marginBottom: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '18px', boxShadow: '0 16px 48px rgba(15, 23, 42, 0.22)' }}
        >
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '12px 14px', color: '#ffffff', background: 'linear-gradient(135deg, #2563eb, #7c3aed 55%, #0f766e)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span aria-hidden="true" style={{ width: 32, height: 32, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 10, background: 'rgba(255,255,255,0.18)', fontSize: 17 }}>✦</span>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: '14px' }}>{settings.title}</strong>
                <span style={{ fontSize: '11px', opacity: 0.9 }}>{isResponding ? 'Thinking…' : 'Powered by Gemini'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button type="button" onClick={newChat} title="Start a new chat" style={iconButton}>＋ New</button>
              <button type="button" onClick={() => setExpanded((v) => !v)} title={expanded ? 'Make smaller' : 'Make larger'} aria-label={expanded ? 'Make chat smaller' : 'Make chat larger'} style={iconButton}>{expanded ? '⤡' : '⤢'}</button>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close assistant" style={{ ...iconButton, fontSize: 18 }}>×</button>
            </div>
          </header>

          <div ref={conversationRef} aria-live="polite" style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc' }}>
            {messages.map((message) => {
              const isUser = message.sender === 'user';
              return (
                <div key={message.id} style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: isUser ? '85%' : '94%', minWidth: 0 }}>
                  <div style={{ padding: '10px 12px', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isUser ? '#2563eb' : message.error ? '#fef2f2' : '#ffffff', border: isUser ? 0 : `1px solid ${message.error ? '#fecaca' : '#e5e7eb'}`, color: isUser ? '#ffffff' : message.error ? '#991b1b' : '#1f2937', fontSize: '13.5px', lineHeight: 1.55 }}>
                    {isUser ? (
                      <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.text}</span>
                    ) : message.pending && !message.text ? (
                      <div>
                        <TypingDots />
                        {message.status && <div style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>{message.status}</div>}
                      </div>
                    ) : (
                      <>
                        <ChatMarkdown text={message.text} onNavigate={goTo} />
                        {message.pending && <span aria-hidden="true" style={{ display: 'inline-block', width: 7, height: 14, background: '#2563eb', verticalAlign: 'text-bottom', animation: 'sm-ai-caret 1s steps(1) infinite' }} />}
                      </>
                    )}
                  </div>

                  {!isUser && !message.pending && !message.greeting && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 4, paddingLeft: 4, fontSize: 11.5 }}>
                      {message.error ? (
                        <>
                          {message.retryText && <button type="button" onClick={() => retry(message)} disabled={isResponding} style={{ border: 0, background: 'transparent', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: 0 }}>↻ Retry</button>}
                          <button type="button" onClick={() => goTo(settings.contactPath)} style={{ border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer', padding: 0 }}>Contact support →</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => copyAnswer(message)} style={{ border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer', padding: 0 }}>{copiedId === message.id ? 'Copied ✓' : '⧉ Copy'}</button>
                          {(message.truncated || message.stopped) && (
                            <button type="button" onClick={() => askQuestion('Please continue.')} disabled={isResponding} style={{ border: 0, background: 'transparent', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Continue →</button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {onlyGreeting && (
            <div style={{ padding: '10px 12px 0', display: 'flex', gap: '6px', flexWrap: 'wrap', background: '#ffffff' }}>
              {settings.suggestions.map((prompt) => (
                <button key={prompt} type="button" onClick={() => askQuestion(prompt)} disabled={isResponding} style={{ border: '1px solid #dbeafe', borderRadius: '999px', padding: '6px 10px', background: '#eff6ff', color: '#1d4ed8', fontSize: '11.5px', cursor: isResponding ? 'not-allowed' : 'pointer' }}>
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(event) => { event.preventDefault(); askQuestion(question); }}
            style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '10px 12px 6px', background: '#ffffff', borderTop: onlyGreeting ? 0 : '1px solid #f1f5f9' }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={question}
              onChange={(event) => { setQuestion(event.target.value); resizeInput(); }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  askQuestion(question);
                }
              }}
              maxLength={MAX_INPUT}
              placeholder="Ask ShareMeal AI anything…"
              aria-label="Ask ShareMeal AI"
              style={{ minWidth: 0, flex: 1, resize: 'none', maxHeight: 140, border: '1px solid #d1d5db', borderRadius: '12px', padding: '10px 12px', fontSize: '13.5px', lineHeight: 1.45, fontFamily: 'inherit', outlineColor: '#2563eb' }}
            />
            {isResponding ? (
              <button type="button" onClick={() => abortRef.current?.abort()} aria-label="Stop generating" style={{ flexShrink: 0, height: 40, border: 0, borderRadius: '12px', padding: '0 14px', background: '#0f172a', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>
                ■ Stop
              </button>
            ) : (
              <button type="submit" disabled={!question.trim()} aria-label="Send message" style={{ flexShrink: 0, height: 40, border: 0, borderRadius: '12px', padding: '0 14px', background: !question.trim() ? '#94a3b8' : '#2563eb', color: '#ffffff', fontWeight: 700, cursor: !question.trim() ? 'not-allowed' : 'pointer' }}>
                Send ➤
              </button>
            )}
          </form>
          <p style={{ margin: 0, padding: '0 12px 10px', background: '#ffffff', color: '#94a3b8', fontSize: '10.5px', lineHeight: 1.4 }}>
            Enter to send · Shift+Enter for a new line. Messages go to Google Gemini; AI can make mistakes. Never share your password, NID or OTP.
          </p>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close ShareMeal AI' : 'Open ShareMeal AI'}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginLeft: 'auto', border: 0, borderRadius: '999px', padding: '12px 18px', background: 'linear-gradient(135deg, #2563eb, #7c3aed 55%, #0f766e)', color: '#ffffff', fontSize: '13px', fontWeight: 700, boxShadow: '0 8px 22px rgba(37, 99, 235, 0.35)', cursor: 'pointer' }}
      >
        <span aria-hidden="true">✦</span>
        {isOpen ? 'Close' : 'Ask ShareMeal AI'}
      </button>
    </div>
  );
};

export default ShareMealHelpChatbot;
