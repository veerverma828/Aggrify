import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, X, ChevronRight, Activity, BrainCircuit } from 'lucide-react';

export default function AiAgentPanel({ isOpen, onClose, locationParam }) {
  const [messages, setMessages] = useState([
    { role: 'agent', type: 'text', content: 'Hi! I am your AI Shopping Agent. How can I help you today? (e.g. "Get me a weekly grocery list under ₹1500")' }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', type: 'text', content: userMessage }]);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userMessage, location: locationParam })
      });

      if (!response.body) throw new Error("No response stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let currentEvent = null;
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); 
        
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            if (!dataStr) continue;
            
            try {
              const data = JSON.parse(dataStr);
              
              if (currentEvent === 'status') {
                setMessages(prev => [...prev, { role: 'system', type: 'status', ...data }]);
              } else if (currentEvent === 'result') {
                setMessages(prev => [...prev, { role: 'agent', type: 'result', content: data.text, insights: data.insights }]);
              } else if (currentEvent === 'error') {
                setMessages(prev => [...prev, { role: 'agent', type: 'error', content: data.message }]);
              }
            } catch (e) {
              console.error('Failed to parse SSE JSON:', e, 'Data:', dataStr);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'agent', type: 'error', content: 'Connection failed.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] md:w-[450px] bg-bg/95 backdrop-blur-2xl border-l border-white/10 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out font-sans">
      {/* Header */}
      <div className="px-6 h-16 border-b border-white/5 flex items-center justify-between bg-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 flex items-center justify-center text-white rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">AI Agent</h2>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Active
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-ink-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer border-none bg-transparent outline-none">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm hide-scrollbar">
        {messages.map((msg, idx) => {
          if (msg.role === 'system') {
            return (
              <div key={idx} className="flex flex-col gap-1 px-4 py-3 bg-white/[0.02] border border-white/5 rounded-2xl text-xs max-w-[85%] mx-auto">
                <div className="flex items-center gap-1.5 text-ink-muted font-mono">
                  {msg.state === 'running' ? <Activity className="w-3 h-3 animate-pulse text-emerald-400" /> : <ChevronRight className="w-3 h-3" />}
                  <span className="font-medium text-[10px]">{msg.agent}</span>
                </div>
                <div className="text-ink-muted opacity-80 font-mono ml-4 text-[10px]">{msg.message}</div>
              </div>
            );
          }
          
          if (msg.role === 'user') {
            return (
              <div key={idx} className="flex justify-end">
                <div className="bg-white text-black px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%] font-medium text-[15px] leading-relaxed shadow-sm">
                  {msg.content}
                </div>
              </div>
            );
          }

          if (msg.role === 'agent' && msg.type === 'result') {
            return (
              <div key={idx} className="flex gap-4">
                <div className="w-8 h-8 bg-white/10 flex-shrink-0 flex items-center justify-center rounded-lg mt-1">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                  <div className="text-white text-[15px] leading-relaxed prose prose-invert prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  </div>
                  
                  {msg.insights?.optimization?.bestBasket && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mt-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-medium text-xs mb-2">
                        <Sparkles className="w-3 h-3" /> Optimizer Findings
                      </div>
                      <div className="text-xs text-white space-y-1">
                        <div className="font-medium">Total Cost: <span className="text-emerald-400 font-semibold text-sm">₹{msg.insights.optimization.totalCost}</span></div>
                        <div className="text-emerald-400/80 leading-relaxed">{msg.insights.optimization.reasoning}</div>
                      </div>
                    </div>
                  )}
                  
                  {msg.insights?.deals?.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-2">
                      <div className="flex items-center gap-2 text-white font-medium text-xs mb-3">
                        <Sparkles className="w-3 h-3" /> Best Deals
                      </div>
                      <ul className="text-xs text-ink-muted space-y-2 pl-4 list-disc opacity-90 leading-relaxed marker:text-white/30">
                        {msg.insights.deals.map((d, i) => (
                          <li key={i}><span className="text-white font-medium">{d.name}</span> from {d.store} &mdash; <span>{d.reason}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="flex gap-4">
              <div className="w-8 h-8 bg-white/10 flex-shrink-0 flex items-center justify-center rounded-lg mt-1">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="text-white text-[15px] leading-relaxed pt-1">
                {msg.content}
              </div>
            </div>
          );
        })}
        
        {isProcessing && (
          <div className="flex gap-2 items-center text-ink-muted text-xs font-medium ml-12 mt-4">
            <BrainCircuit className="w-4 h-4 animate-pulse text-white" /> Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-transparent border-t border-white/5">
        <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-white/20 focus-within:border-white/20 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI anything..."
            className="flex-1 bg-transparent px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none transition-colors font-sans"
            disabled={isProcessing}
          />
          <button 
            type="submit" 
            disabled={isProcessing || !input.trim()}
            className="bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:hover:bg-white p-2.5 rounded-xl transition-colors border-none cursor-pointer outline-none flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .hide-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .hide-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
        }
        .hide-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
