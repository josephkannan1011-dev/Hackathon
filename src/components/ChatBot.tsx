import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, CornerDownLeft, Sparkles, FileText, Check } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatBotProps {
  onPrefillComplaint?: (data: { title: string; description: string; category: string }) => void;
}

export default function ChatBot({ onPrefillComplaint }: ChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'msg-init',
          role: 'model',
          content: `Hello! I am **CivicLens AI**, your Smart Governance Assistant. 🏛️✨\n\nYou can describe any public issues you notice around your neighborhood—like broken street lights, road potholes, water leakages, or overflowing trash bins. I will suggest the responsible department, estimate priority, and help draft a complaint instantly!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    }
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Package full history for context
      const chatHistory = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (!res.ok) throw new Error('Network error chatting with AI');

      const data = await res.json();

      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        role: 'model',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedDepartment: data.suggestedDept,
        prefillForm: data.prefillForm
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('Chat bot error:', error);
      // Local mock fallback
      const mockBotMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot-err`,
        role: 'model',
        content: `I am currently analyzing your message in offline/fallback mode. Based on keywords, this concerns a public municipal infrastructure issue. Would you like to draft a formal complaint form directly?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        prefillForm: {
          title: textToSend.length > 35 ? textToSend.substring(0, 35) + '...' : textToSend,
          description: textToSend,
          category: 'General Infrastructure'
        }
      };
      setMessages(prev => [...prev, mockBotMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestClick = (promptText: string) => {
    handleSendMessage(promptText);
  };

  return (
    <div className="flex flex-col h-[500px] rounded-2xl overflow-hidden glass-panel border border-white/5 shadow-xl text-slate-100">
      {/* Bot Header */}
      <div className="bg-white/5 border-b border-white/10 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-sky-500/25 border border-sky-500/50 p-1.5 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-sky-300 animate-pulse" />
          </div>
          <div>
            <h4 className="font-semibold text-sm flex items-center gap-1 font-display">
              CivicLens Smart Assistant
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            </h4>
            <span className="text-[10px] text-sky-300 font-medium">Hybrid Decision Model Active</span>
          </div>
        </div>
        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-2.5 py-0.5 rounded-full font-mono font-bold">
          ● ONLINE
        </span>
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && !loading && (
        <div className="bg-white/5 p-3 border-b border-white/10">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Predefined quick issues:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSuggestClick('The street light near Pillar 20 has been broken for a week')}
              className="bg-white/5 border border-white/10 hover:border-sky-400 hover:bg-sky-500/10 transition-all text-slate-200 text-xs px-2.5 py-1.5 rounded-lg cursor-pointer shadow-sm font-medium"
            >
              💡 Broken Street Light
            </button>
            <button
              onClick={() => handleSuggestClick('A major pipeline burst is flooding our main street with fresh drinking water')}
              className="bg-white/5 border border-white/10 hover:border-sky-400 hover:bg-sky-500/10 transition-all text-slate-200 text-xs px-2.5 py-1.5 rounded-lg cursor-pointer shadow-sm font-medium"
            >
              💧 Pipeline Water Leak
            </button>
            <button
              onClick={() => handleSuggestClick('There is an overflowing garbage pile behind the primary school gate causing bad smells')}
              className="bg-white/5 border border-white/10 hover:border-sky-400 hover:bg-sky-500/10 transition-all text-slate-200 text-xs px-2.5 py-1.5 rounded-lg cursor-pointer shadow-sm font-medium"
            >
              🗑️ Overflowing Garbage pile
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Box */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-white/10 border border-white/10 text-white' : 'bg-sky-500/20 border border-sky-400/20 text-sky-300'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className="space-y-1.5">
              <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-sky-500/20 border border-sky-500/30 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-slate-100 rounded-tl-none'}`}>
                {/* Parse minor markdown italics/bold in simple text rendering */}
                <div className="whitespace-pre-line font-normal">
                  {msg.content.split('**').map((chunk, idx) => (
                    idx % 2 === 1 ? <strong key={idx} className="font-bold text-sky-300">{chunk}</strong> : chunk
                  ))}
                </div>
              </div>

              {/* Bot Pre-fill Interactive Form Card */}
              {msg.role === 'model' && msg.prefillForm && onPrefillComplaint && (
                <div className="border border-sky-500/20 bg-sky-500/5 p-3 rounded-xl shadow-md space-y-2 flex flex-col max-w-sm animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-sky-400 text-xs font-semibold">
                    <FileText className="w-4 h-4 text-sky-400" />
                    AI Auto-Drafted Complaint
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-0.5 font-mono">
                    <p><strong className="text-white">Title:</strong> {msg.prefillForm.title}</p>
                    <p><strong className="text-white">Category:</strong> {msg.prefillForm.category}</p>
                    <p className="line-clamp-2"><strong className="text-white">Desc:</strong> {msg.prefillForm.description}</p>
                  </div>
                  <button
                    onClick={() => onPrefillComplaint(msg.prefillForm!)}
                    className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-md cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Auto-Fill & Open Complaint Form
                  </button>
                </div>
              )}

              <span className="text-[9px] text-slate-500 block px-1 font-mono">{msg.timestamp}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/20 text-sky-300 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-md">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(input);
        }}
        className="p-3 bg-white/2 border-t border-white/10 flex gap-2 items-center"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your civic issue to draft a form..."
          disabled={loading}
          className="flex-1 bg-white/5 focus:bg-slate-950/40 focus:border-sky-400/50 text-xs border border-white/10 text-white px-3 py-2 rounded-lg outline-none transition-all placeholder:text-slate-500 disabled:opacity-50 focus:ring-0"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-sky-500 hover:bg-sky-400 text-slate-950 disabled:opacity-40 p-2 rounded-lg transition-all flex items-center justify-center shrink-0 cursor-pointer font-bold shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
