import { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, UserRound, Volume2, VolumeX } from 'lucide-react';
import type { ChatMessage } from '@/poker/chat';
import { quickMessageOptions } from '@/poker/chat';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sounds';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function ChatBox({ messages, onSend, collapsed, onToggle }: ChatBoxProps) {
  const [input, setInput] = useState('');
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  }

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-slate-900/80 shadow-lg">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 text-xs font-semibold text-white transition hover:text-gold-300"
        >
          <MessageCircle className="h-3.5 w-3.5 text-gold-300" />
          Table Chat
          <span className="ml-1 rounded-full bg-white/10 px-1.5 text-[9px] tabular-nums text-slate-300">
            {messages.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !soundOn;
            setSoundOn(next);
            setSoundEnabled(next);
          }}
          className="rounded-lg p-1 text-slate-400 transition hover:text-gold-300"
          title={soundOn ? 'Mute sounds' : 'Enable sounds'}
        >
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && (
        <>
          <div ref={scrollRef} className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2" style={{ maxHeight: '200px' }}>
            {messages.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500">
                Chat with the table. Bots will trash talk too.
              </p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex items-start gap-1.5 ${msg.isMe ? 'flex-row-reverse' : ''}`}>
                  <div className="mt-0.5 shrink-0">
                    {msg.isSystem ? (
                      <span className="text-[10px] text-slate-500">SYS</span>
                    ) : msg.isBot ? (
                      <Bot className="h-3 w-3 text-slate-400" />
                    ) : (
                      <UserRound className="h-3 w-3 text-gold-300" />
                    )}
                  </div>
                  <div className={`max-w-[75%] rounded-lg px-2 py-1 text-xs ${
                    msg.isSystem
                      ? 'bg-white/5 text-slate-400'
                      : msg.isMe
                        ? 'bg-gold-400/15 text-gold-100'
                        : msg.isBot
                          ? 'bg-white/5 text-slate-300'
                          : 'bg-sky-500/15 text-sky-100'
                  }`}>
                    {!msg.isSystem && !msg.isMe && (
                      <span className="mr-1 font-semibold opacity-70">{msg.author}:</span>
                    )}
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-1 border-t border-white/10 px-2 py-1.5">
            {quickMessageOptions().slice(0, 6).map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => send(quick)}
                className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-300 transition active:scale-95 hover:bg-white/10 hover:text-white"
              >
                {quick}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-1.5 border-t border-white/10 px-2 py-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Say something..."
              maxLength={120}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-gold-400/50"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex shrink-0 items-center justify-center rounded-lg bg-gold-400/20 p-1.5 text-gold-300 transition active:scale-95 hover:bg-gold-400/30 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
