import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Sparkles, X, ChevronRight, Activity, DollarSign, BrainCircuit } from 'lucide-react';

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
        buffer = lines.pop(); // Keep the last partial line in the buffer
        
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
    <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] md:w-[450px] bg-bg border-l-2 border-ink z-50 flex flex-col transform transition-transform duration-300 ease-in-out font-sans">
      {/* Header */}
      <div className="px-6 py-4 border-b-2 border-ink flex items-center justify-between bg-bg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent flex items-center justify-center text-white rounded-[2px]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-ink uppercase tracking-widest font-mono">AI Agent</h2>
            <div className="text-[10px] text-emerald-500 flex items-center gap-1 font-mono uppercase font-bold mt-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Active
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-ink hover:text-accent hover:bg-ink-faint rounded-[2px] transition-colors cursor-pointer border-none bg-transparent">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm hide-scrollbar bg-bg">
        {messages.map((msg, idx) => {
          if (msg.role === 'system') {
            return (
              <div key={idx} className="flex flex-col gap-1 px-4 py-3 bg-ink-faint border border-ink-faint rounded-[2px] text-xs">
                <div className="flex items-center gap-1.5 text-ink opacity-70 font-mono">
                  {msg.state === 'running' ? <Activity className="w-3 h-3 animate-pulse text-accent" /> : <ChevronRight className="w-3 h-3" />}
                  <span className="font-bold uppercase tracking-widest text-[10px]">{msg.agent}</span>
                </div>
                <div className="text-ink opacity-60 font-mono ml-4 text-[10px]">{msg.message}</div>
              </div>
            );
          }
          
          if (msg.role === 'user') {
            return (
              <div key={idx} className="flex justify-end">
                <div className="bg-ink text-bg px-4 py-3 rounded-[2px] max-w-[85%] font-medium">
                  {msg.content}
                </div>
              </div>
            );
          }

          if (msg.role === 'agent' && msg.type === 'result') {
            return (
              <div key={idx} className="flex gap-3">
                <div className="w-8 h-8 bg-ink-faint flex-shrink-0 flex items-center justify-center mt-1 rounded-[2px]">
                  <Bot className="w-4 h-4 text-ink" />
                </div>
                <div className="flex flex-col gap-4 flex-1">
                  <div className="bg-ink-faint text-ink px-4 py-4 rounded-[2px] prose prose-invert prose-sm max-w-none border border-transparent">
                    <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  </div>
                  {msg.insights?.optimization?.bestBasket && (
                    <div className="glass p-4">
                      <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[10px] font-mono uppercase tracking-widest mb-3">
                        <DollarSign className="w-3.5 h-3.5" /> Optimizer Findings
                      </div>
                      <div className="text-xs text-ink space-y-2">
                        <div className="font-mono">Total Cost: <span className="text-emerald-500 font-bold text-sm">₹{msg.insights.optimization.totalCost}</span></div>
                        <div className="opacity-70 leading-relaxed">{msg.insights.optimization.reasoning}</div>
                      </div>
                    </div>
                  )}
                  {msg.insights?.deals?.length > 0 && (
                    <div className="glass p-4 border-accent/20">
                      <div className="flex items-center gap-1.5 text-accent font-bold text-[10px] font-mono uppercase tracking-widest mb-3">
                        <Sparkles className="w-3.5 h-3.5" /> Best Deals
                      </div>
                      <ul className="text-xs text-ink space-y-2 pl-4 list-square opacity-90 leading-relaxed">
                        {msg.insights.deals.map((d, i) => (
                          <li key={i}><span className="font-bold">{d.name}</span> from {d.store} &mdash; <span className="opacity-70">{d.reason}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="flex gap-3">
              <div className="w-8 h-8 bg-ink-faint flex-shrink-0 flex items-center justify-center mt-1 rounded-[2px]">
                <Bot className="w-4 h-4 text-ink" />
              </div>
              <div className="bg-ink-faint text-ink px-4 py-3 rounded-[2px] leading-relaxed">
                {msg.content}
              </div>
            </div>
          );
        })}
        
        {isProcessing && (
          <div className="flex gap-2 items-center text-ink opacity-50 text-[10px] uppercase tracking-widest font-mono ml-11 mt-4">
            <BrainCircuit className="w-3 h-3 animate-pulse text-accent" /> Agent is analyzing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 border-t-2 border-ink bg-bg">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your request here..."
            className="flex-1 bg-ink-faint border border-transparent rounded-[2px] px-4 py-3 text-sm text-ink placeholder-ink/40 focus:outline-none focus:border-accent transition-colors font-sans"
            disabled={isProcessing}
          />
          <button 
            type="submit" 
            disabled={isProcessing || !input.trim()}
            className="bg-accent hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-accent text-white p-3 rounded-[2px] transition-colors border-none cursor-pointer outline-none"
          >
            <Send className="w-5 h-5" />
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
          background-color: var(--ink-faint);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
