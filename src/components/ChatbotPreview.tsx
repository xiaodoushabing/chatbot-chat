import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  TrendingUp,
  Home,
  Wallet,
  Info,
  ChevronRight,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  type?: 'text' | 'what-if' | 'contextual' | 'life-event';
  data?: any;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'bot',
    content: "Hello! I'm your Next-Gen Retirement Assistant. I have access to your dashboard data. How can I help you plan for the future today?",
    type: 'text'
  }
];

export default function ChatbotPreview() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const simulateResponse = (userInput: string) => {
    setIsTyping(true);
    setTimeout(() => {
      let botResponse: Message = {
        id: Date.now().toString(),
        role: 'bot',
        content: "I'm analyzing your profile now...",
        type: 'text'
      };

      const lowerInput = userInput.toLowerCase();
      if (lowerInput.includes('retire at 65')) {
        botResponse = {
          id: Date.now().toString(),
          role: 'bot',
          content: "Great question! If you retire at 65 instead of 55, your projected monthly payout increases from $2,400 to $3,150. This is due to an additional 10 years of compounding in your CPF Special Account and a higher CPF LIFE payout tier.",
          type: 'what-if',
          data: { label: 'Projected Payout', old: 2400, new: 3150, unit: 'SGD/mo' }
        };
      } else if (lowerInput.includes('house') || lowerInput.includes('home')) {
        botResponse = {
          id: Date.now().toString(),
          role: 'bot',
          content: "Buying a house is a major life event. Based on your current assets ($450k), a $1.2M property would require a $240k downpayment. This reduces your liquid retirement nest egg by 40%, potentially delaying your 'Full Retirement' milestone by 3 years.",
          type: 'life-event',
          data: { impact: '-3 Years', category: 'Retirement Timeline' }
        };
      } else if (lowerInput.includes('balance') || lowerInput.includes('assets')) {
        botResponse = {
          id: Date.now().toString(),
          role: 'bot',
          content: "Your total assets currently stand at $842,500. This includes your CPF Ordinary Account ($120k), Special Account ($280k), and private investments ($442.5k). Your current allocation is 65% low-risk, which is optimal for your age bracket.",
          type: 'contextual',
          data: { total: 842500, allocation: '65% Low-Risk' }
        };
      } else {
        botResponse = {
          id: Date.now().toString(),
          role: 'bot',
          content: "I can help with that! Would you like to see a 'What-If' scenario for your retirement age, or should we analyze the impact of a major purchase like a house?",
          type: 'text'
        };
      }

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      type: 'text'
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    simulateResponse(input);
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
      {/* Chat Header - OCBC Theme */}
      <div className="bg-[#E3000F] p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
            <Bot size={24} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm">Retirement AI Assistant</span>
            <span className="text-[10px] text-red-100 flex items-center gap-1 uppercase tracking-widest font-bold">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Next-Gen Hybrid Model
            </span>
          </div>
        </div>
        <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50/50 custom-scrollbar"
      >
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
              "flex flex-col gap-2 max-w-[85%]",
              msg.role === 'user' ? "ml-auto items-end" : "items-start"
            )}
          >
            <div className={cn(
              "p-3 rounded-2xl text-sm leading-relaxed shadow-sm",
              msg.role === 'user' ? "bg-[#E3000F] text-white rounded-tr-none" : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
            )}>
              {msg.content}
            </div>

            {/* Rich Components for Bot Responses */}
            {msg.role === 'bot' && msg.type === 'what-if' && (
              <div className="w-full bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">What-If Analysis</span>
                  <TrendingUp size={14} className="text-emerald-600" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-emerald-600 uppercase font-bold">Current</span>
                    <span className="text-sm font-bold text-slate-400 line-through">${msg.data.old}</span>
                  </div>
                  <ArrowRight size={14} className="text-emerald-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-emerald-600 uppercase font-bold">Projected</span>
                    <span className="text-lg font-black text-emerald-700">${msg.data.new} <span className="text-[10px]">{msg.data.unit}</span></span>
                  </div>
                </div>
              </div>
            )}

            {msg.role === 'bot' && msg.type === 'life-event' && (
              <div className="w-full bg-amber-50 border border-amber-100 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Life Event Impact</span>
                  <Home size={14} className="text-amber-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">{msg.data.category}</span>
                  <span className="text-sm font-black text-amber-700">{msg.data.impact}</span>
                </div>
              </div>
            )}

            {msg.role === 'bot' && msg.type === 'contextual' && (
              <div className="w-full bg-red-50 border border-red-100 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#E3000F] uppercase tracking-widest">Dashboard Context</span>
                  <Wallet size={14} className="text-[#E3000F]" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Total Assets</span>
                  <span className="text-sm font-black text-[#E3000F]">${msg.data.total.toLocaleString()}</span>
                </div>
              </div>
            )}
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 text-slate-400">
            <Bot size={16} className="animate-bounce" />
            <span className="text-xs font-medium">Assistant is thinking...</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => { setInput("What if I retire at 65?"); handleSend(); }}
          className="whitespace-nowrap px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 hover:border-[#E3000F] hover:text-[#E3000F] transition-all"
        >
          Retire at 65?
        </button>
        <button
          onClick={() => { setInput("How does buying a house affect me?"); handleSend(); }}
          className="whitespace-nowrap px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 hover:border-[#E3000F] hover:text-[#E3000F] transition-all"
        >
          Buy a house?
        </button>
        <button
          onClick={() => { setInput("Show my asset balance"); handleSend(); }}
          className="whitespace-nowrap px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 hover:border-[#E3000F] hover:text-[#E3000F] transition-all"
        >
          My Balance
        </button>
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your retirement..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E3000F] transition-all"
        />
        <button
          type="submit"
          className="bg-[#E3000F] text-white p-2.5 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
