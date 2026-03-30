import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Camera, Shuffle, Sparkles, CheckCircle2, ImageIcon, RotateCcw, MessageCircle, Send, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type LifestyleTier = 'enhanced' | 'comfortable' | 'basic';

interface TierResult {
  tier: LifestyleTier;
  reasoning: string;
  advice: string;
}

interface PickerImage {
  id: string;
  url: string;
  tier: LifestyleTier;
}

// ─── Tier config ───────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<LifestyleTier, {
  label: string;
  color: string;
  border: string;
  badge: string;
  products: { name: string; url: string }[];
  desc: string;
}> = {
  enhanced: {
    label: 'Enhanced',
    color: 'text-amber-700',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border border-amber-300',
    products: [
      { name: 'OCBC Premier Banking', url: 'https://www.ocbc.com/premier-banking/why-join-us' },
      { name: 'Wealth Advisory', url: 'https://www.ocbc.com/premier-banking/why-join-us' },
      { name: 'Overseas Investment Fund', url: 'https://www.ocbc.com/personal-banking/investments' },
    ],
    desc: 'Luxury travel, fine dining & premium experiences',
  },
  comfortable: {
    label: 'Comfortable',
    color: 'text-blue-700',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800 border border-blue-300',
    products: [
      { name: 'OCBC RoboInvest', url: 'https://www.ocbc.com/personal-banking/investments/roboinvest' },
      { name: 'CPF Investment Scheme', url: 'https://www.cpf.gov.sg/member/growing-your-savings/earning-higher-returns/investing-your-cpf-savings/cpf-investment-scheme-options' },
      { name: 'SRS Account', url: 'https://www.ocbc.com/personal-banking/investments/supplementary-retirement-scheme-account' },
    ],
    desc: 'Family-oriented, moderate lifestyle & travel',
  },
  basic: {
    label: 'Basic',
    color: 'text-green-700',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-800 border border-green-300',
    products: [
      { name: 'OCBC 360 Account', url: 'https://www.ocbc.com/personal-banking/deposits/360-savings-account' },
      { name: 'CPF Voluntary Top-ups', url: 'https://www.cpf.gov.sg/member/growing-your-savings/saving-more-with-cpf/top-up-to-enjoy-higher-retirement-payouts' },
      { name: 'Life Goals Savings', url: 'https://www.ocbc.com/personal-banking/start-planning' },
    ],
    desc: 'Minimalist, wellness & nature-focused living',
  },
};

// ─── Image pool (local copies in public/lifestyle-images/) ────────────────────

const _I = '/lifestyle-images/';
const ALL_IMAGES: PickerImage[] = [
  // Enhanced — luxury, premium
  { id: 'asp1', url: `${_I}asp1.jpg`, tier: 'enhanced' },
  { id: 'asp4', url: `${_I}asp4.jpg`, tier: 'enhanced' },
  { id: 'asp5', url: `${_I}asp5.jpg`, tier: 'enhanced' },
  { id: 'asp6', url: `${_I}asp6.jpg`, tier: 'enhanced' },
  { id: 'asp7', url: `${_I}asp7.jpg`, tier: 'enhanced' },
  { id: 'g_8rfx', url: `${_I}Gemini_Generated_Image_8rfxn18rfxn18rfx.jpg`, tier: 'enhanced' },
  { id: 'g_fbak', url: `${_I}Gemini_Generated_Image_fbak99fbak99fbak.jpg`, tier: 'enhanced' },
  { id: 'g_x0y6', url: `${_I}Gemini_Generated_Image_x0y6ekx0y6ekx0y6.jpg`, tier: 'enhanced' },
  { id: 'g_xlpf', url: `${_I}Gemini_Generated_Image_xlpftxxlpftxxlpf.jpg`, tier: 'enhanced' },
  { id: 'u_iwood', url: `${_I}iwood-R5v8Xtc0ecg-unsplash.jpg`, tier: 'enhanced' },
  { id: 'u_kyle', url: `${_I}kyle-head-PW8K-W-Kni0-unsplash.jpg`, tier: 'enhanced' },
  { id: 'u_neom', url: `${_I}neom-HXW26Gw8bk4-unsplash.jpg`, tier: 'enhanced' },
  { id: 'u_valeriia', url: `${_I}valeriia-bugaiova-_pPHgeHz1uk-unsplash.jpg`, tier: 'enhanced' },
  { id: 'u_nils', url: `${_I}nils-nedel-ONpGBpns3cs-unsplash.jpg`, tier: 'enhanced' },
  { id: 'u_elena', url: `${_I}elena-mozhvilo-zGppw6GUA40-unsplash.jpg`, tier: 'enhanced' },
  { id: 'u_aleksandr', url: `${_I}aleksandr-popov-hTv8aaPziOQ-unsplash.jpg`, tier: 'enhanced' },
  // Comfortable — family, travel, hobbies
  { id: 'bal2', url: `${_I}bal2.jpg`, tier: 'comfortable' },
  { id: 'bal3', url: `${_I}bal3.jpg`, tier: 'comfortable' },
  { id: 'bal4', url: `${_I}bal4.jpg`, tier: 'comfortable' },
  { id: 'bal5', url: `${_I}bal5.jpg`, tier: 'comfortable' },
  { id: 'bal6', url: `${_I}bal6.jpg`, tier: 'comfortable' },
  { id: 'bal7', url: `${_I}bal7.jpg`, tier: 'comfortable' },
  { id: 'bal8', url: `${_I}bal8.jpg`, tier: 'comfortable' },
  { id: 'g_g3oc', url: `${_I}Gemini_Generated_Image_g3oc9ig3oc9ig3oc.jpg`, tier: 'comfortable' },
  { id: 'g_ny97', url: `${_I}Gemini_Generated_Image_ny976eny976eny97.jpg`, tier: 'comfortable' },
  { id: 'u_aaron', url: `${_I}aaron-burden-cEukkv42O40-unsplash.jpg`, tier: 'comfortable' },
  { id: 'u_charlotte', url: `${_I}charlotte-noelle-98WPMlTl5xo-unsplash.jpg`, tier: 'comfortable' },
  { id: 'u_benjamin', url: `${_I}benjamin-davies-mqN-EV9rNlY-unsplash.jpg`, tier: 'comfortable' },
  { id: 'u_jacqueline', url: `${_I}jacqueline-martinez-5Yx2DKLE6Xw-unsplash.jpg`, tier: 'comfortable' },
  { id: 'u_hans', url: `${_I}hans-jurgen-mager-qQWV91TTBrE-unsplash.jpg`, tier: 'comfortable' },
  { id: 'u_kalen', url: `${_I}kalen-emsley-kGSapVfg8Kw-unsplash.jpg`, tier: 'comfortable' },
  { id: 'u_sagar', url: `${_I}sagar-patil-8UcNYpynFLU-unsplash.jpg`, tier: 'comfortable' },
  { id: 'u_library', url: `${_I}library-of-congress-7LdGlMX1exM-unsplash.jpg`, tier: 'comfortable' },
  { id: 'u_thomas', url: `${_I}thomas-ashlock-RAjND0B3HDw-unsplash.jpg`, tier: 'comfortable' },
  // Basic — wellness, nature, minimalist
  { id: 'ess1', url: `${_I}ess1.jpg`, tier: 'basic' },
  { id: 'ess2', url: `${_I}ess2.jpg`, tier: 'basic' },
  { id: 'ess3', url: `${_I}ess3.jpg`, tier: 'basic' },
  { id: 'ess4', url: `${_I}ess4.jpg`, tier: 'basic' },
  { id: 'ess5', url: `${_I}ess5.jpg`, tier: 'basic' },
  { id: 'ess6', url: `${_I}ess6.jpg`, tier: 'basic' },
  { id: 'g_23qi', url: `${_I}Gemini_Generated_Image_23qiyt23qiyt23qi.jpg`, tier: 'basic' },
  { id: 'g_7cdy', url: `${_I}Gemini_Generated_Image_7cdyd77cdyd77cdy.jpg`, tier: 'basic' },
  { id: 'u_anna', url: `${_I}anna-kolosyuk-D5nh6mCW52c-unsplash.jpg`, tier: 'basic' },
  { id: 'u_andrew', url: `${_I}andrew-neel-cckf4TsHAuw-unsplash.jpg`, tier: 'basic' },
  { id: 'u_harli', url: `${_I}harli-marten-M9jrKDXOQoU-unsplash.jpg`, tier: 'basic' },
  { id: 'u_marc', url: `${_I}marc-najera-SwK6MSxTLDE-unsplash.jpg`, tier: 'basic' },
  { id: 'u_mo', url: `${_I}mo-jiaming-JXQDFY_W2OM-unsplash.jpg`, tier: 'basic' },
  { id: 'u_jon', url: `${_I}jon-eckert-IoIbdFdGCnQ-unsplash.jpg`, tier: 'basic' },
  { id: 'u_or', url: `${_I}or-hakim-S2Eql9vHN3o-unsplash.jpg`, tier: 'basic' },
  { id: 'u_zakaria', url: `${_I}zakaria-ahada-VGR_ReUCqNw-unsplash.jpg`, tier: 'basic' },
];

// Preload all images into browser cache on module load
ALL_IMAGES.forEach(img => {
  const el = new Image();
  el.src = img.url;
});

// Resize + compress image to stay under Claude's 5MB base64 limit
function compressImage(dataUrl: string, mimeType: string): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_DIM = 1024;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
        else { width = Math.round(width * MAX_DIM / height); height = MAX_DIM; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not available')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      // Try quality 0.85 first, drop to 0.7 if still too large (~3.75MB base64 ≈ safe)
      let result = canvas.toDataURL('image/jpeg', 0.85);
      if (result.length > 3_900_000) result = canvas.toDataURL('image/jpeg', 0.7);
      resolve({ dataUrl: result, mimeType: 'image/jpeg' });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick 2 from each tier at random (6 total), then shuffle — excludes already-seen images
function getPickerSet(seen: Set<string> = new Set()): PickerImage[] {
  const pick = (tier: LifestyleTier) => {
    let pool = ALL_IMAGES.filter(i => i.tier === tier && !seen.has(i.id));
    if (pool.length < 2) pool = ALL_IMAGES.filter(i => i.tier === tier);
    return shuffleArray(pool).slice(0, 2);
  };
  return shuffleArray([...pick('enhanced'), ...pick('comfortable'), ...pick('basic')]);
}

function getMajorityTier(selected: PickerImage[]): LifestyleTier {
  const counts: Record<LifestyleTier, number> = { enhanced: 0, comfortable: 0, basic: 0 };
  for (const img of selected) counts[img.tier]++;
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as LifestyleTier;
}

// ─── Shared sub-components ─────────────────────────────────────────────────────

function WelcomeBubble({ message }: { message: string }) {
  return (
    <div className="flex items-end gap-2 px-3 pt-3 pb-1">
      <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
        <Camera size={11} className="text-white" />
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm max-w-[210px]">
        <p className="text-sm text-slate-700 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

function PhoneShell({ headerLabel, children, footer }: {
  headerLabel: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative w-[300px] bg-black rounded-[44px] p-[3px] shadow-2xl" style={{ height: 570 }}>
      <div className="w-full h-full bg-[#F2F2F7] rounded-[42px] overflow-hidden flex flex-col">
        {/* Dynamic island */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-16 h-5 bg-black rounded-full" />
        </div>
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>
        {/* Optional sticky footer */}
        {footer}
      </div>
    </div>
  );
}

function TierResultCard({ result }: { result: TierResult }) {
  const cfg = TIER_CONFIG[result.tier];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('m-3 rounded-2xl border p-3 bg-white', cfg.border)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn('text-xs font-bold px-2.5 py-0.5 rounded-full', cfg.badge)}>
          {cfg.label}
        </span>
      </div>
      <p className="text-sm text-slate-600 mb-2 leading-relaxed">{result.reasoning}</p>
      <p className="text-sm text-slate-700 leading-relaxed mb-2">{result.advice}</p>
      <div className="flex flex-col gap-1">
        {TIER_CONFIG[result.tier].products.map(p => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 hover:text-[#E3000F] hover:border-red-200 transition-colors flex items-center gap-1.5"
          >
            <span className="text-slate-400">→</span>
            <span className="underline underline-offset-2 decoration-slate-300 hover:decoration-red-300">{p.name}</span>
          </a>
        ))}
      </div>
    </motion.div>
  );
}

function TechCard({
  title,
  subtitle,
  pros,
  cons,
  tags,
}: {
  title: string;
  subtitle: string;
  pros: string[];
  cons: string[];
  tags: { text: string; style: string }[];
}) {
  return (
    <div className="w-[240px] flex flex-col gap-2">
      <div>
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug min-h-[28px]">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {tags.map(t => (
          <span key={t.text} className={cn('text-[0.65rem] px-2 py-0.5 rounded-full font-semibold border', t.style)}>
            {t.text}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-0.5">
        {pros.map(p => <p key={p} className="text-xs text-slate-600 flex gap-1"><span className="text-green-500 shrink-0">+</span>{p}</p>)}
        {cons.map(c => <p key={c} className="text-xs text-slate-500 flex gap-1"><span className="text-red-400 shrink-0">−</span>{c}</p>)}
      </div>
    </div>
  );
}

// ─── Analysing indicator (matches WoW chatbot style) ──────────────────────────

function AnalysingBubble() {
  const bars = [
    { delay: 0, opacity: 0.45 },
    { delay: 0.14, opacity: 0.7 },
    { delay: 0.28, opacity: 1 },
    { delay: 0.42, opacity: 0.7 },
    { delay: 0.56, opacity: 0.45 },
  ];
  return (
    <div className="flex items-end gap-2 px-3 py-1.5">
      <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center shrink-0 mb-1">
        <Camera size={11} className="text-white" />
      </div>
      <motion.div
        animate={{
          boxShadow: [
            '0 2px 10px rgba(200,16,46,0.06)',
            '0 2px 18px rgba(200,16,46,0.18)',
            '0 2px 10px rgba(200,16,46,0.06)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="relative overflow-hidden border border-red-200 rounded-2xl rounded-bl-sm px-3 py-2"
        style={{ background: 'linear-gradient(120deg,#fff5f5 0%,#fff 55%,#fef9f9 100%)' }}
      >
        {/* Shimmer sweep */}
        <motion.div
          className="absolute inset-y-0 w-1/2 pointer-events-none"
          style={{ background: 'linear-gradient(90deg,transparent,rgba(200,16,46,0.07),transparent)' }}
          animate={{ x: ['-100%', '300%'] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="flex items-center gap-2 relative z-10">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
            <Sparkles size={13} className="text-[#E3000F]" />
          </motion.div>
          <span className="text-sm font-bold text-[#E3000F] tracking-wide">Analysing</span>
          <div className="flex items-end gap-[2px] h-4">
            {bars.map((bar, i) => (
              <motion.div
                key={i}
                className="w-[3px] rounded-full bg-[#E3000F]"
                style={{ height: i === 2 ? 15 : i === 1 || i === 3 ? 10 : 5, opacity: bar.opacity, transformOrigin: 'bottom' }}
                animate={{ scaleY: [0.25, 1, 0.25] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: bar.delay, ease: 'easeInOut' }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Chat phone: multi-turn conversational lifestyle discovery ───────────────────

const CHAT_TIER_KEYWORDS: Record<LifestyleTier, string[]> = {
  enhanced: [
    'luxury', 'fine dining', 'premium', 'first class', 'business class', 'yacht', 'designer',
    'michelin', 'champagne', 'penthouse', 'villa', 'resort', 'spa', 'golf', 'wine', 'art gallery',
    'couture', 'private', 'exclusive', 'high-end', 'upscale', 'gourmet', 'cruise', 'chauffeur',
    'concierge', 'bespoke', 'platinum', 'vip', 'mansion', 'caviar', 'lobster',
  ],
  comfortable: [
    'family', 'travel', 'hobby', 'hobbies', 'children', 'kids', 'holiday', 'regional', 'dining out',
    'cooking', 'garden', 'gardening', 'pets', 'camping', 'photography', 'sports', 'fitness', 'gym',
    'road trip', 'explore', 'weekend', 'vacation', 'restaurant', 'movie', 'concert', 'music',
    'cycling', 'swimming', 'hiking', 'beach', 'picnic', 'barbecue', 'friends',
  ],
  basic: [
    'simple', 'nature', 'wellness', 'minimalist', 'yoga', 'meditation', 'walking', 'reading',
    'community', 'local', 'peaceful', 'quiet', 'park', 'volunteer', 'morning', 'tea', 'sunrise',
    'modest', 'frugal', 'budget', 'home', 'library', 'temple', 'tai chi', 'calm',
    'slow', 'mindful', 'sustainable', 'organic', 'baking', 'knitting', 'chess',
  ],
};

function scoreTiers(text: string): Record<LifestyleTier, number> {
  const lower = text.toLowerCase();
  const scores: Record<LifestyleTier, number> = { enhanced: 0, comfortable: 0, basic: 0 };
  for (const [tier, keywords] of Object.entries(CHAT_TIER_KEYWORDS) as [LifestyleTier, string[]][]) {
    for (const kw of keywords) {
      if (lower.includes(kw)) scores[tier]++;
    }
  }
  return scores;
}

// Conversation flow: bot asks questions, accumulates keyword signals, then gives result
const CHAT_QUESTIONS = [
  "What does a perfect weekend look like for you?",
  "When you travel, what kind of experience do you look for?",
  "How do you like to unwind after a long day?",
];

interface ChatMsg { role: 'user' | 'bot'; text: string; }

function ChatPhone() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [allUserText, setAllUserText] = useState('');
  const [result, setResult] = useState<TierResult | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, 50);
  };

  const addBotMessage = (text: string) => {
    setMessages(prev => [...prev, { role: 'bot', text }]);
    scrollToBottom();
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isTyping || result) return;
    setInput('');
    const accumulated = allUserText + ' ' + text;
    setAllUserText(accumulated);
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsTyping(true);
    scrollToBottom();

    const nextQ = questionIndex + 1;

    setTimeout(() => {
      if (nextQ < CHAT_QUESTIONS.length) {
        // Ask the next question
        addBotMessage(CHAT_QUESTIONS[nextQ]);
        setQuestionIndex(nextQ);
      } else {
        // All questions answered — produce result
        const scores = scoreTiers(accumulated);
        const sorted = (Object.entries(scores) as [LifestyleTier, number][]).sort((a, b) => b[1] - a[1]);
        const tier = sorted[0][1] === 0 ? 'comfortable' : sorted[0][0];
        const cfg = TIER_CONFIG[tier];
        setResult({
          tier,
          reasoning: `Based on our conversation, your retirement style leans ${tier}. ${cfg.desc}.`,
          advice: `We recommend building your retirement plan around ${cfg.products[0].name} and ${cfg.products[1].name} to support your ${tier} lifestyle goals. Our advisors can help you map out a personalised CPF and investment strategy.`,
        });
        scrollToBottom();
      }
      setIsTyping(false);
    }, 800);
  };

  const chatFooter = (
    <form
      onSubmit={e => { e.preventDefault(); handleSend(); }}
      className="shrink-0 bg-white border-t border-slate-200 px-3 py-2.5 flex items-center gap-2"
    >
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        disabled={isTyping || !!result}
        placeholder="Type your reply..."
        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E3000F] transition-all disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isTyping || !input.trim() || !!result}
        className="w-9 h-9 bg-[#E3000F] rounded-full flex items-center justify-center shrink-0 hover:bg-red-700 transition-colors disabled:opacity-40 shadow-sm"
      >
        <Send size={15} className="text-white" />
      </button>
    </form>
  );

  return (
    <PhoneShell headerLabel="Chat" footer={chatFooter}>
      <div ref={bodyRef} className="flex flex-col pb-3">
        <WelcomeBubble message={`Hi! I'd love to learn about your ideal retirement. ${CHAT_QUESTIONS[0]}`} />

        {messages.map((msg, i) => (
          msg.role === 'user' ? (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="flex justify-end px-3 py-1.5">
              <div className="bg-[#E3000F] rounded-2xl rounded-br-sm px-3 py-2 max-w-[210px] shadow-sm">
                <p className="text-sm text-white leading-relaxed">{msg.text}</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-end gap-2 px-3 py-1.5">
              <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                <MessageCircle size={11} className="text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm max-w-[210px]">
                <p className="text-sm text-slate-700 leading-relaxed">{msg.text}</p>
              </div>
            </motion.div>
          )
        ))}

        <AnimatePresence>
          {isTyping && (
            <motion.div key="typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-end gap-2 px-3 py-1.5">
              <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                <MessageCircle size={11} className="text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {result && (
            <motion.div key="result" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <TierResultCard result={result} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PhoneShell>
  );
}

// ─── Upload phone: AI Vision Upload ──────────────────────────────────────────────

function VisionUploadPhone() {
  const [preview, setPreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TierResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }, 50);
  };

  const analyse = async (dataUrl: string, mime: string) => {
    setLoading(true);
    setError(null);
    scrollToBottom();
    try {
      const res = await fetch('/api/wow-vision', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, mimeType: mime }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data as TierResult);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleFile = (file: File) => {
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = async e => {
      const raw = e.target?.result as string;
      let dataUrl = raw;
      let mime = 'image/jpeg';
      try {
        const compressed = await compressImage(raw, file.type || 'image/jpeg');
        dataUrl = compressed.dataUrl;
        mime = compressed.mimeType;
      } catch { /* use raw */ }
      setPreview(dataUrl);
      setMimeType(mime);
      analyse(dataUrl, mime);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  };

  const handleReset = () => {
    setPreview(null);
    setResult(null);
    setError(null);
    setLoading(false);
  };

  const chatFooter = (
    <div
      className="shrink-0 bg-white border-t border-slate-200 px-3 py-2.5 flex items-center gap-3"
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
    >
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        className="w-11 h-11 bg-[#E3000F] rounded-full flex items-center justify-center shrink-0 hover:bg-red-700 transition-colors disabled:opacity-50 shadow-md"
      >
        <ImageIcon size={20} className="text-white" />
      </button>
      <span className="text-sm text-slate-400 flex-1 select-none">
        {loading ? 'Analysing…' : preview ? 'Upload another photo' : 'Tap to upload a lifestyle photo'}
      </span>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
    </div>
  );

  return (
    <PhoneShell headerLabel="Upload and Analyse" footer={chatFooter}>
      <div ref={bodyRef} className="flex flex-col pb-3">
        <WelcomeBubble message="Hi! I'd love to help you plan for a great retirement. Upload a photo that represents your lifestyle — your travels, home, a meal you enjoy, or anything that reflects how you like to live." />

        {/* User image bubble */}
        {preview && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex justify-end px-3 py-2">
            <div className="rounded-2xl rounded-br-sm overflow-hidden max-w-[180px] shadow-sm">
              <img src={preview} alt="Your upload" className="w-full h-auto max-h-[160px] object-cover block" />
            </div>
          </motion.div>
        )}

        {/* Analysing indicator */}
        <AnimatePresence>
          {loading && (
            <motion.div key="analysing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AnalysingBubble />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div key="result" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <TierResultCard result={result} />
            </motion.div>
          )}
          {error && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mx-3 my-1 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-sm text-red-600">{error}</p>
              <button onClick={handleReset} className="text-xs text-red-500 underline mt-1">Try again</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PhoneShell>
  );
}

// ─── Right phone: Visual Image Picker ─────────────────────────────────────────

const MAX_REFRESHES = 5;

function ImagePickerPhone() {
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());
  const [pickerSet, setPickerSet] = useState(() => {
    const initial = getPickerSet();
    return initial;
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submittedImages, setSubmittedImages] = useState<PickerImage[]>([]);
  const [result, setResult] = useState<TierResult | null>(null);
  const [refreshesLeft, setRefreshesLeft] = useState(MAX_REFRESHES);
  // Track initial set as seen
  useEffect(() => {
    setSeenIds(prev => {
      const next = new Set(prev);
      pickerSet.forEach(img => next.add(img.id));
      return next;
    });
  }, []);

  const toggleSelect = (id: string) => {
    if (result) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleRefresh = () => {
    if (refreshesLeft === 0) return;
    const newSet = getPickerSet(seenIds);
    // Preload all images before swapping so they appear simultaneously
    Promise.all(
      newSet.map(img => new Promise<void>(resolve => {
        const el = new Image();
        el.onload = () => resolve();
        el.onerror = () => resolve();
        el.src = img.url;
      }))
    ).then(() => {
      setSeenIds(prev => {
        const next = new Set(prev);
        newSet.forEach(img => next.add(img.id));
        return next;
      });
      setPickerSet(newSet);
      setSelected(new Set());
      setRefreshesLeft(r => r - 1);
    });
  };

  const handleDiscover = () => {
    if (selected.size === 0) return;
    const selectedImages = pickerSet.filter(img => selected.has(img.id));
    setSubmittedImages(selectedImages);
    const tier = getMajorityTier(selectedImages);
    const cfg = TIER_CONFIG[tier];
    setResult({
      tier,
      reasoning: `Based on ${selected.size} image${selected.size > 1 ? 's' : ''} you selected, your retirement style leans ${tier}. ${cfg.desc}.`,
      advice: `We recommend building your retirement plan around ${cfg.products[0].name} and ${cfg.products[1].name} to support your ${tier} lifestyle goals. Our advisors can help you map out a personalised CPF and investment strategy.`,
    });
  };

  const handleReset = () => {
    const newSet = getPickerSet();
    Promise.all(
      newSet.map(img => new Promise<void>(resolve => {
        const el = new Image();
        el.onload = () => resolve();
        el.onerror = () => resolve();
        el.src = img.url;
      }))
    ).then(() => {
      setSelected(new Set());
      setSubmittedImages([]);
      setResult(null);
      setSeenIds(new Set(newSet.map(img => img.id)));
      setPickerSet(newSet);
      setRefreshesLeft(MAX_REFRESHES);
    });
  };

  // 2-column masonry: 6 images, alternating heights for visual interest
  const cols: PickerImage[][] = [[], []];
  pickerSet.forEach((img, i) => cols[i % 2].push(img));
  const heights = ['h-24', 'h-20', 'h-28', 'h-20', 'h-24', 'h-28'];

  return (
    <PhoneShell headerLabel="Visual Lifestyle Picker">
      <div className="flex flex-col h-full">
        <WelcomeBubble message="Hi! Tap the images that resonate with how you'd love to spend your retirement. I'll use your choices to suggest your lifestyle profile." />
        {!result ? (
          <>
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <p className="text-xs text-slate-500 font-medium">Select images that resonate with you</p>
              <button
                onClick={handleRefresh}
                disabled={refreshesLeft === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E3000F] hover:bg-red-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors shadow-sm"
                title={refreshesLeft === 0 ? 'No refreshes left' : `${refreshesLeft} refresh${refreshesLeft !== 1 ? 'es' : ''} left`}
              >
                <RefreshCw size={13} className="text-white" />
                <span className="text-xs font-bold text-white">{refreshesLeft}</span>
              </button>
            </div>
            {/* Masonry grid */}
            <AnimatePresence mode="wait">
                <motion.div
                  key={pickerSet.map(i => i.id).join('-')}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex gap-0.5 px-0.5 flex-1 min-h-0"
                >
                  {cols.map((col, ci) => (
                    <div key={ci} className="flex flex-col gap-0.5 flex-1">
                      {col.map((img, ri) => {
                        const hClass = heights[ci === 0 ? ri : ri + 3] ?? 'h-24';
                        const isSelected = selected.has(img.id);
                        return (
                          <motion.button
                            key={img.id}
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            onClick={() => toggleSelect(img.id)}
                            className={cn(
                              'relative overflow-hidden rounded-lg transition-all',
                              hClass,
                              isSelected ? 'ring-2 ring-[#E3000F] ring-offset-0' : 'opacity-90 hover:opacity-100'
                            )}
                          >
                            <img
                              src={img.url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-[#E3000F]/20 flex items-center justify-center"
                              >
                                <CheckCircle2 size={18} className="text-white drop-shadow" />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  ))}
                </motion.div>
            </AnimatePresence>
            {/* Action */}
            <div className="p-3 bg-white shrink-0">
              <button
                onClick={handleDiscover}
                disabled={selected.size === 0}
                className="w-full bg-[#E3000F] text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-red-100"
              >
                <Shuffle size={14} />
                Discover My Style
                {selected.size > 0 && <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px]">{selected.size}</span>}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* User input: submitted images shown as right-aligned chat bubble */}
            {submittedImages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end px-3 pt-3 pb-1"
              >
                <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                  {submittedImages.map(img => (
                    <div key={img.id} className="w-16 h-16 rounded-xl overflow-hidden shadow-sm shrink-0">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            <TierResultCard result={result!} />
          </>
        )}
      </div>
    </PhoneShell>
  );
}

// ─── Hybrid Visual phone: picker + upload combined ───────────────────────────────

function HybridVisualPhone() {
  // Image picker state
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());
  const [pickerSet, setPickerSet] = useState(() => getPickerSet());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submittedImages, setSubmittedImages] = useState<PickerImage[]>([]);
  const [refreshesLeft, setRefreshesLeft] = useState(MAX_REFRESHES);

  // Upload state
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared result
  const [result, setResult] = useState<TierResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, 50);
  };

  useEffect(() => {
    setSeenIds(prev => {
      const next = new Set(prev);
      pickerSet.forEach(img => next.add(img.id));
      return next;
    });
  }, []);

  const toggleSelect = (id: string) => {
    if (result) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleRefresh = () => {
    if (refreshesLeft === 0) return;
    const newSet = getPickerSet(seenIds);
    Promise.all(
      newSet.map(img => new Promise<void>(resolve => {
        const el = new Image();
        el.onload = () => resolve();
        el.onerror = () => resolve();
        el.src = img.url;
      }))
    ).then(() => {
      setSeenIds(prev => {
        const next = new Set(prev);
        newSet.forEach(img => next.add(img.id));
        return next;
      });
      setPickerSet(newSet);
      setSelected(new Set());
      setRefreshesLeft(r => r - 1);
    });
  };

  const handleFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = async e => {
      const raw = e.target?.result as string;
      let dataUrl = raw;
      let mime = 'image/jpeg';
      try {
        const compressed = await compressImage(raw, file.type || 'image/jpeg');
        dataUrl = compressed.dataUrl;
        mime = compressed.mimeType;
      } catch { /* use raw */ }
      setUploadPreview(dataUrl);

      // If images are also selected, call vision API for the upload
      setUploadLoading(true);
      scrollToBottom();
      try {
        const res = await fetch('/api/wow-vision', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ image: dataUrl, mimeType: mime }),
        });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const selectedImages = pickerSet.filter(img => selected.has(img.id));
        setSubmittedImages(selectedImages);
        const visionResult = data as TierResult;
        if (selectedImages.length > 0) {
          visionResult.reasoning = `${visionResult.reasoning} We also noted your ${selectedImages.length} curated image selection${selectedImages.length > 1 ? 's' : ''} to refine this profile.`;
        }
        setResult(visionResult);
      } catch (err: any) {
        setError(err.message || 'Analysis failed. Please try again.');
      } finally {
        setUploadLoading(false);
        scrollToBottom();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDiscover = () => {
    if (selected.size === 0) return;
    const selectedImages = pickerSet.filter(img => selected.has(img.id));
    setSubmittedImages(selectedImages);
    const tier = getMajorityTier(selectedImages);
    const cfg = TIER_CONFIG[tier];
    setResult({
      tier,
      reasoning: `Based on ${selected.size} image${selected.size > 1 ? 's' : ''} you selected, your retirement style leans ${tier}. ${cfg.desc}.`,
      advice: `We recommend building your retirement plan around ${cfg.products[0].name} and ${cfg.products[1].name} to support your ${tier} lifestyle goals. Our advisors can help you map out a personalised CPF and investment strategy.`,
    });
    scrollToBottom();
  };

  const cols: PickerImage[][] = [[], []];
  pickerSet.forEach((img, i) => cols[i % 2].push(img));
  const heights = ['h-24', 'h-20', 'h-28', 'h-20', 'h-24', 'h-28'];

  return (
    <PhoneShell headerLabel="Hybrid Visual">
      <div ref={bodyRef} className="flex flex-col h-full">
        <WelcomeBubble message="Browse and tap images that match your lifestyle, or upload your own photo. I'll combine everything to find your retirement profile." />
        {!result ? (
          <>
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <p className="text-xs text-slate-500 font-medium">Select images or upload a photo</p>
              <button
                onClick={handleRefresh}
                disabled={refreshesLeft === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E3000F] hover:bg-red-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors shadow-sm"
                title={refreshesLeft === 0 ? 'No refreshes left' : `${refreshesLeft} refresh${refreshesLeft !== 1 ? 'es' : ''} left`}
              >
                <RefreshCw size={13} className="text-white" />
                <span className="text-xs font-bold text-white">{refreshesLeft}</span>
              </button>
            </div>
            {/* Masonry grid */}
            <AnimatePresence mode="wait">
              <motion.div
                key={pickerSet.map(i => i.id).join('-')}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex gap-0.5 px-0.5 flex-1 min-h-0"
              >
                {cols.map((col, ci) => (
                  <div key={ci} className="flex flex-col gap-0.5 flex-1">
                    {col.map((img, ri) => {
                      const hClass = heights[ci === 0 ? ri : ri + 3] ?? 'h-24';
                      const isSelected = selected.has(img.id);
                      return (
                        <motion.button
                          key={img.id}
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          onClick={() => toggleSelect(img.id)}
                          className={cn(
                            'relative overflow-hidden rounded-lg transition-all',
                            hClass,
                            isSelected ? 'ring-2 ring-[#E3000F] ring-offset-0' : 'opacity-90 hover:opacity-100'
                          )}
                        >
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                          {isSelected && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              className="absolute inset-0 bg-[#E3000F]/20 flex items-center justify-center">
                              <CheckCircle2 size={18} className="text-white drop-shadow" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>

            {/* Uploaded preview */}
            {uploadPreview && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="flex justify-end px-3 py-2">
                <div className="rounded-2xl rounded-br-sm overflow-hidden max-w-[120px] shadow-sm">
                  <img src={uploadPreview} alt="Your upload" className="w-full h-auto max-h-[100px] object-cover block" />
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {uploadLoading && (
                <motion.div key="analysing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <AnalysingBubble />
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="mx-3 my-1 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Action footer */}
            <div className="p-3 bg-white shrink-0 flex gap-2 items-center">
              <button
                onClick={handleDiscover}
                disabled={selected.size === 0 || uploadLoading}
                className="flex-1 bg-[#E3000F] text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-red-100"
              >
                <Shuffle size={14} />
                Discover
                {selected.size > 0 && <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px]">{selected.size}</span>}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLoading}
                className="w-11 h-11 bg-[#E3000F] rounded-full flex items-center justify-center shrink-0 hover:bg-red-700 transition-colors disabled:opacity-50 shadow-md"
              >
                <Upload size={18} className="text-white" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            </div>
          </>
        ) : (
          <>
            {submittedImages.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="flex justify-end px-3 pt-3 pb-1">
                <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                  {submittedImages.map(img => (
                    <div key={img.id} className="w-16 h-16 rounded-xl overflow-hidden shadow-sm shrink-0">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            {uploadPreview && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="flex justify-end px-3 py-1">
                <div className="rounded-2xl rounded-br-sm overflow-hidden max-w-[120px] shadow-sm">
                  <img src={uploadPreview} alt="Your upload" className="w-full h-auto max-h-[100px] object-cover block" />
                </div>
              </motion.div>
            )}
            <TierResultCard result={result!} />
          </>
        )}
      </div>
    </PhoneShell>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function LifestyleDiscovery() {
  const [resetKey, setResetKey] = useState(0);
  const handleReset = () => setResetKey(k => k + 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Lifestyle Discovery</h2>
          <p className="text-slate-500 mt-2 text-base max-w-2xl">
            Compare four approaches to understanding a customer's retirement lifestyle — from text-based chat to visual pickers, photo uploads, and hybrid combinations.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-sm font-bold text-slate-600 transition-all"
        >
          <RotateCcw size={14} />
          Reset All
        </button>
      </div>

      {/* 2x2 grid of phones + tech cards to the right */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-16 px-6">
        {/* Top-left: Chat */}
        <div className="flex items-end gap-4 justify-center xl:justify-end">
          <ChatPhone key={`chat-${resetKey}`} />
          <TechCard
            title="Chat"
            subtitle="Text-based conversation to discover lifestyle tier through keyword matching."
            pros={['Already widely-adopted solution', 'No additional infra needed']}
            cons={['Users must articulate preferences verbally', 'Less intuitive — relies on ability to describe lifestyle', 'Limited for users who "know it when they see it"']}
            tags={[
              { text: 'Conversational', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
              { text: 'Text-based', style: 'bg-slate-100 text-slate-700 border-slate-200' },
            ]}
          />
        </div>

        {/* Top-right: Visual Picker */}
        <div className="flex items-end gap-4 justify-center xl:justify-start">
          <ImagePickerPhone key={`picker-${resetKey}`} />
          <TechCard
            title="Visual Picker"
            subtitle="Pick photos that speak to you — AI infers your lifestyle from vibes alone."
            pros={['Effortless — no uploads needed', 'Fun & engaging discovery flow', 'No privacy concerns']}
            cons={['Relies on curated image pool', 'Less personalised', 'User may not find their vibe']}
            tags={[
              { text: 'Zero-friction', style: 'bg-green-50 text-green-700 border-green-200' },
              { text: 'Guided', style: 'bg-blue-50 text-blue-700 border-blue-200' },
            ]}
          />
        </div>

        {/* Bottom-left: Upload & Analyse */}
        <div className="flex items-end gap-4 justify-center xl:justify-end">
          <VisionUploadPhone key={`vision-${resetKey}`} />
          <TechCard
            title="Upload & Analyse"
            subtitle="AI vision reads your real lifestyle photo to classify your retirement tier."
            pros={['Highly personalised from real photo', 'Surprise & delight factor', 'Works with any lifestyle image']}
            cons={['Requires effort to upload', 'Vision interpretation may vary', 'Privacy concerns with photo sharing']}
            tags={[
              { text: 'Vision AI', style: 'bg-purple-50 text-purple-700 border-purple-200' },
              { text: 'Personalised', style: 'bg-amber-50 text-amber-700 border-amber-200' },
            ]}
          />
        </div>

        {/* Bottom-right: Hybrid Visual */}
        <div className="flex items-end gap-4 justify-center xl:justify-start">
          <HybridVisualPhone key={`hybrid-${resetKey}`} />
          <TechCard
            title="Hybrid Visual"
            subtitle="Browse curated images and upload your own — the best of both worlds."
            pros={['Maximum flexibility — browse OR upload', 'Caters to both passive and active users', 'Most comprehensive lifestyle signal']}
            cons={['More complex UI — potentially overwhelming', 'Higher development/maintenance cost', 'Users may skip upload if curated images suffice']}
            tags={[
              { text: 'Hybrid', style: 'bg-orange-50 text-orange-700 border-orange-200' },
              { text: 'Flexible', style: 'bg-teal-50 text-teal-700 border-teal-200' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
