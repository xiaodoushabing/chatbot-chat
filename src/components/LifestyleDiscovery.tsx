import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Camera, Shuffle, Sparkles, CheckCircle2, ImageIcon, RotateCcw, MessageCircle, Send, Upload, ChevronDown, ChevronUp, Bot } from 'lucide-react';
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
  desc: string;
}> = {
  enhanced: {
    label: 'Enhanced',
    color: 'text-amber-700',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border border-amber-300',
    desc: 'Global travel, luxury experiences & world exploration',
  },
  comfortable: {
    label: 'Comfortable',
    color: 'text-blue-700',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800 border border-blue-300',
    desc: 'Creative pursuits, learning & outdoor adventure in Asia',
  },
  basic: {
    label: 'Basic',
    color: 'text-green-700',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-800 border border-green-300',
    desc: 'Community, family & simple wellness living',
  },
};

// ─── Per-tier financial assumptions + message builders ────────────────────────

const TIER_ASSUMPTIONS: Record<LifestyleTier, {
  retirementAge: number;
  lifeExpectancy: number;
  monthlyExpenses: number;
  monthlyIncome: number;
  currentAssets: number;
  monthlySalary: number;
  monthlyCurrentExpenses: number;
  projectedUntilAge: number;
  adjustments: string;
}> = {
  enhanced: {
    retirementAge: 50,
    lifeExpectancy: 85,
    monthlyExpenses: 8000,
    monthlyIncome: 5000,
    currentAssets: 500000,
    monthlySalary: 12000,
    monthlyCurrentExpenses: 3000,
    projectedUntilAge: 63,
    adjustments: 'adjusting retirement age, growing investment returns, diversifying income streams, or adding premium wealth management solutions',
  },
  comfortable: {
    retirementAge: 55,
    lifeExpectancy: 85,
    monthlyExpenses: 5000,
    monthlyIncome: 3500,
    currentAssets: 220000,
    monthlySalary: 5000,
    monthlyCurrentExpenses: 1500,
    projectedUntilAge: 70,
    adjustments: 'adjusting retirement age, adding cash or investment holdings outside OCBC, reducing retirement spending, and more',
  },
  basic: {
    retirementAge: 65,
    lifeExpectancy: 85,
    monthlyExpenses: 2500,
    monthlyIncome: 1800,
    currentAssets: 150000,
    monthlySalary: 3500,
    monthlyCurrentExpenses: 1200,
    projectedUntilAge: 75,
    adjustments: 'adjusting retirement age, topping up your CPF, reducing retirement spending, or building a small investment portfolio',
  },
};

function buildInitialResultMessage(tier: LifestyleTier, reasoning: string): string {
  const a = TIER_ASSUMPTIONS[tier];
  const cfg = TIER_CONFIG[tier];
  return `${reasoning} — ${cfg.label}. Let's see how close you are to making that a reality.\n\nHere's what we worked out from what we understand about you —\n• Target retirement age: ${a.retirementAge}\n• Life expectancy: ${a.lifeExpectancy}\n• Ideal retirement expenses: $${a.monthlyExpenses.toLocaleString()}/mth\n• Estimated retirement income: $${a.monthlyIncome.toLocaleString()}/mth\n• Current cash & investments: $${a.currentAssets.toLocaleString()}\n• Current salary: $${a.monthlySalary.toLocaleString()}/mth\n• Current expenses: $${a.monthlyCurrentExpenses.toLocaleString()}/mth\n\nWould you like to customise any of these assumptions, or would you like to see your retirement plan based on this starting point?`;
}

function buildProjectionMessage(tier: LifestyleTier): string {
  const a = TIER_ASSUMPTIONS[tier];
  return `With your ideal retirement expenses of $${a.monthlyExpenses.toLocaleString()}/month, and current net assets of $${a.currentAssets.toLocaleString()}, your projected savings would last until age ${a.projectedUntilAge}. This doesn't mean retirement is not possible — it just means we'll need to adjust a few things to better support the lifestyle you want. We can refine this plan by ${a.adjustments}.\n\nWould you like to refine your retirement plan, or should I suggest a few ways to close the gap?`;
}

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
    <div className="relative w-[300px] bg-black rounded-[44px] p-[3px] shadow-2xl" style={{ height: 541 }}>
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

function TierResultFlow({ result }: { result: TierResult }) {
  const [choice, setChoice] = useState<'plan' | 'customise' | null>(null);
  const cfg = TIER_CONFIG[result.tier];
  const a = TIER_ASSUMPTIONS[result.tier];
  const projectionMsg = buildProjectionMessage(result.tier);

  const assumptions = [
    `Target retirement age: ${a.retirementAge}`,
    `Life expectancy: ${a.lifeExpectancy}`,
    `Ideal retirement expenses: $${a.monthlyExpenses.toLocaleString()}/mth`,
    `Estimated retirement income: $${a.monthlyIncome.toLocaleString()}/mth`,
    `Current cash & investments: $${a.currentAssets.toLocaleString()}`,
    `Current salary: $${a.monthlySalary.toLocaleString()}/mth`,
    `Current expenses: $${a.monthlyCurrentExpenses.toLocaleString()}/mth`,
  ];

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-end gap-2 px-3 py-1.5">
        <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
          <Sparkles size={11} className="text-white" />
        </div>
        <div className={cn('bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm max-w-[210px] border', cfg.border)}>
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1.5', cfg.badge)}>
            {cfg.label}
          </span>
          <p className="text-sm text-slate-700 leading-relaxed">{result.reasoning} — {cfg.label}. Let's see how close you are to making that a reality.</p>
          <p className="text-sm font-bold text-slate-700 mt-2 mb-1">Here's what we worked out from what we understand about you —</p>
          <ul className="space-y-0.5 mb-2">
            {assumptions.map(pt => (
              <li key={pt} className="flex items-start gap-1 text-sm text-slate-600">
                <span className="text-slate-400 shrink-0 mt-px">•</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-700 leading-relaxed">Would you like to customise any of these assumptions, or would you like to see your retirement plan based on this starting point?</p>
        </div>
      </motion.div>

      {choice === null && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="flex justify-end gap-2 px-3 py-1">
          <button
            onClick={() => setChoice('customise')}
            className="border border-slate-300 text-slate-600 text-xs px-3 py-1.5 rounded-full font-bold shadow-sm hover:bg-slate-50 transition-colors"
          >
            Customise
          </button>
          <button
            onClick={() => setChoice('plan')}
            className="bg-[#E3000F] text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-sm hover:bg-red-700 transition-colors"
          >
            View Plan
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {choice === 'plan' && (
          <motion.div key="plan" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-end px-3 py-1">
              <div className="bg-[#E3000F] rounded-2xl rounded-br-sm px-3 py-2 shadow-sm">
                <p className="text-sm text-white">View Plan</p>
              </div>
            </div>
            <div className="flex items-end gap-2 px-3 py-1.5 pb-3">
              <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                <Sparkles size={11} className="text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm max-w-[210px] border border-slate-200">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{projectionMsg}</p>
              </div>
            </div>
          </motion.div>
        )}
        {choice === 'customise' && (
          <motion.div key="customise" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-end px-3 py-1">
              <div className="bg-slate-200 rounded-2xl rounded-br-sm px-3 py-2 shadow-sm">
                <p className="text-sm text-slate-700">Customise</p>
              </div>
            </div>
            <div className="flex items-end gap-2 px-3 py-1.5 pb-3">
              <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                <Sparkles size={11} className="text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm max-w-[210px] border border-slate-200">
                <p className="text-sm text-slate-700 leading-relaxed">Sure! You can adjust your retirement age, monthly expenses, current assets, or any other assumption. Speak with your OCBC Relationship Manager for a fully personalised plan.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TechCard({
  title,
  subtitle,
  pros,
  cons,
  tags,
  largeTitle = false,
}: {
  title: string;
  subtitle: string;
  pros: string[];
  cons: string[];
  tags: { text: string; style: string }[];
  largeTitle?: boolean;
}) {
  return (
    <div className="w-[240px] flex flex-col gap-2">
      <div>
        <p className={cn('font-bold text-slate-800', largeTitle ? 'text-[22px]' : 'text-[1.05rem]')}>{title}</p>
        <p className="text-[0.9rem] text-slate-500 mt-0.5 leading-snug min-h-[28px]">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {tags.map(t => (
          <span key={t.text} className={cn('text-[0.78rem] px-2 py-0.5 rounded-full font-semibold border', t.style)}>
            {t.text}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-0.5">
        {pros.map(p => <p key={p} className="text-[0.9rem] text-slate-600 flex gap-1"><span className="text-green-500 shrink-0">+</span>{p}</p>)}
        {cons.map(c => <p key={c} className="text-[0.9rem] text-slate-500 flex gap-1"><span className="text-red-400 shrink-0">−</span>{c}</p>)}
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


// Conversation flow: bot asks questions, accumulates keyword signals, then gives result
const CHAT_QUESTIONS = [
  "What does a perfect weekend look like for you?",
  "When you travel, what kind of experience do you look for?",
  "How do you like to unwind after a long day?",
];

interface ChatMsg { role: 'user' | 'bot'; text: string; isResult?: boolean; tier?: LifestyleTier; }

function ChatPhone() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<TierResult | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resultAction, setResultAction] = useState<'plan' | 'customise' | null>(null);
  const [planShown, setPlanShown] = useState(false);
  const [customAssumptions, setCustomAssumptions] = useState<typeof TIER_ASSUMPTIONS[LifestyleTier] | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, 50);
  };

  function parseCustomisations(text: string, base: typeof TIER_ASSUMPTIONS[LifestyleTier]): typeof TIER_ASSUMPTIONS[LifestyleTier] {
    const updated = { ...base };
    const num = (s: string) => parseInt(s.replace(/[,$]/g, ''), 10);
    const m = (re: RegExp) => text.match(re);
    const retireMatch = m(/retire.*?(\d+)|(\d+).*?retire/i);
    if (retireMatch) updated.retirementAge = num(retireMatch[1] || retireMatch[2]);
    const expMatch = m(/\$\s*([\d,]+)\s*\/?\s*month|\bexpenses?\b.*?\$?\s*([\d,]+)/i);
    if (expMatch) updated.monthlyExpenses = num(expMatch[1] || expMatch[2]);
    const assetMatch = m(/assets?\b.*?\$?\s*([\d,]+)|\bsavings?\b.*?\$?\s*([\d,]+)/i);
    if (assetMatch) updated.currentAssets = num(assetMatch[1] || assetMatch[2]);
    const salaryMatch = m(/salary\b.*?\$?\s*([\d,]+)|\beach.*?\$?\s*([\d,]+)/i);
    if (salaryMatch) updated.monthlySalary = num(salaryMatch[1] || salaryMatch[2]);
    return updated;
  }

  const addBotMessage = (text: string) => {
    setMessages(prev => [...prev, { role: 'bot', text }]);
    scrollToBottom();
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsTyping(true);
    scrollToBottom();

    // Post-action follow-up
    if (resultAction) {
      if (resultAction === 'customise' && result) {
        const base = customAssumptions ?? TIER_ASSUMPTIONS[result.tier];
        const updated = parseCustomisations(text, base);
        setCustomAssumptions(updated);
        const cfg = TIER_CONFIG[result.tier];
        const customMsg = `Here's what we worked out from information you provided —\n• Target retirement age: ${updated.retirementAge}\n• Life expectancy: ${updated.lifeExpectancy}\n• Ideal retirement expenses: $${updated.monthlyExpenses.toLocaleString()}/mth\n• Estimated retirement income: $${updated.monthlyIncome.toLocaleString()}/mth\n• Current cash & investments: $${updated.currentAssets.toLocaleString()}\n• Current salary: $${updated.monthlySalary.toLocaleString()}/mth\n• Current expenses: $${updated.monthlyCurrentExpenses.toLocaleString()}/mth\n\nWould you like to view your retirement plan with these updated figures?`;
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'bot', text: customMsg, isResult: true, tier: result.tier }]);
          scrollToBottom();
          setIsTyping(false);
          setAwaitingConfirmation(true);
          setResultAction(null);
        }, 800);
      } else {
        setTimeout(() => {
          addBotMessage("Great question! I'd recommend speaking with your OCBC Relationship Manager to customise this plan further. They can help adjust the assumptions based on your full financial picture.");
          setIsTyping(false);
        }, 800);
      }
      return;
    }

    // Awaiting button action — ignore free text, buttons handle it
    if (awaitingConfirmation) {
      setIsTyping(false);
      setInput('');
      return;
    }

    const answers = [...userAnswers, text];
    setUserAnswers(answers);
    const nextQ = questionIndex + 1;

    if (nextQ < CHAT_QUESTIONS.length) {
      setTimeout(() => {
        addBotMessage(CHAT_QUESTIONS[nextQ]);
        setQuestionIndex(nextQ);
        setIsTyping(false);
      }, 800);
    } else {
      // All answers collected — call LLM for personalised tier + reasoning
      fetch('/api/lifestyle-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ questions: CHAT_QUESTIONS, answers }),
      })
        .then(r => r.json())
        .then(data => {
          const tier: LifestyleTier = ['enhanced', 'comfortable', 'basic'].includes(data.tier)
            ? data.tier
            : 'comfortable';
          const tierResult: TierResult = { tier, reasoning: data.reasoning ?? '' };
          setResult(tierResult);
          const resultText = buildInitialResultMessage(tier, tierResult.reasoning);
          setMessages(prev => [...prev, { role: 'bot', text: resultText, isResult: true, tier }]);
          scrollToBottom();
          setAwaitingConfirmation(true);
          scrollToBottom();
        })
        .catch(() => {
          addBotMessage("Sorry, I had trouble analysing your answers. Please try again.");
        })
        .finally(() => {
          setIsTyping(false);
        });
    }
  };

  const handleViewPlan = () => {
    setAwaitingConfirmation(false);
    setResultAction('plan');
    setMessages(prev => [...prev, { role: 'user', text: 'View Plan' }]);
    setIsTyping(true);
    setTimeout(() => {
      const assumptions = customAssumptions ?? TIER_ASSUMPTIONS[result!.tier];
      const projMsg = `With your ideal retirement expenses of $${assumptions.monthlyExpenses.toLocaleString()}/month, and current net assets of $${assumptions.currentAssets.toLocaleString()}, your projected savings would last until age ${assumptions.projectedUntilAge}. This doesn't mean retirement is not possible — it just means we'll need to adjust a few things to better support the lifestyle you want. We can refine this plan by ${assumptions.adjustments}.\n\nWould you like to refine your retirement plan, or should I suggest a few ways to close the gap?`;
      addBotMessage(projMsg);
      setIsTyping(false);
      setPlanShown(true);
    }, 800);
  };

  const handleCustomise = () => {
    setAwaitingConfirmation(false);
    setResultAction('customise');
    setMessages(prev => [...prev, { role: 'user', text: 'Customise' }]);
    setIsTyping(true);
    setTimeout(() => {
      addBotMessage("Sure! Which assumption would you like to adjust? For example, you can change your target retirement age, monthly expenses, current assets, or salary. Type your changes below and I'll update your plan.");
      setIsTyping(false);
    }, 800);
  };

  const placeholder = resultAction
    ? 'Ask a follow-up question…'
    : awaitingConfirmation
      ? 'Use the buttons above to choose…'
      : 'Type your reply...';

  const chatFooter = (
    <form
      onSubmit={e => { e.preventDefault(); handleSend(); }}
      className="shrink-0 bg-white border-t border-slate-200 px-3 py-2.5 flex items-center gap-2"
    >
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        disabled={isTyping || (awaitingConfirmation && !resultAction)}
        placeholder={placeholder}
        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E3000F] transition-all disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isTyping || !input.trim() || (awaitingConfirmation && !resultAction)}
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
                {msg.isResult ? (
                  (() => {
                    const t = msg.text;
                    const hdrMatch = t.match(/Here's what we worked out[^—]*—/);
                    if (!hdrMatch) return <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{t}</p>;
                    const hdrIdx = t.indexOf(hdrMatch[0]);
                    const intro = hdrIdx > 0 ? t.slice(0, hdrIdx).trim() : '';
                    const afterHdr = t.slice(hdrIdx + hdrMatch[0].length);
                    const qSplit = afterHdr.split('\n\nWould you like');
                    const bullets = qSplit[0].trim();
                    const question = qSplit.length > 1 ? 'Would you like' + qSplit[1] : '';
                    return (
                      <>
                        {msg.tier && (
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1.5', TIER_CONFIG[msg.tier].badge)}>
                            {TIER_CONFIG[msg.tier].label}
                          </span>
                        )}
                        {intro && <p className="text-sm text-slate-700 leading-relaxed mb-1">{intro}</p>}
                        <p className="text-sm font-bold text-slate-800 mb-1">{hdrMatch[0]}</p>
                        <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed mb-1">{bullets}</p>
                        {question && <p className="text-sm text-slate-700 leading-relaxed">{question}</p>}
                      </>
                    );
                  })()
                ) : (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{msg.text}</p>
                )}
              </div>
            </motion.div>
          )
        ))}

        <AnimatePresence>
          {awaitingConfirmation && !resultAction && !isTyping && (
            <motion.div key="actions" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex justify-end gap-2 px-3 py-1">
              <button onClick={handleCustomise}
                className="border border-slate-300 text-slate-600 text-xs px-3 py-1.5 rounded-full font-bold shadow-sm hover:bg-slate-50 transition-colors">
                Customise
              </button>
              <button onClick={handleViewPlan}
                className="bg-[#E3000F] text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-sm hover:bg-red-700 transition-colors">
                View Plan
              </button>
            </motion.div>
          )}
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
  const [textInput, setTextInput] = useState('');
  const [textLoading, setTextLoading] = useState(false);
  const [submittedText, setSubmittedText] = useState<string | null>(null);
  // Conversation state
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resultAction, setResultAction] = useState<'plan' | 'customise' | null>(null);
  const [customAssumptions, setCustomAssumptions] = useState<typeof TIER_ASSUMPTIONS[LifestyleTier] | null>(null);
  const [extraMessages, setExtraMessages] = useState<ChatMsg[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }, 50);
  };

  function parseCustomisations(text: string, base: typeof TIER_ASSUMPTIONS[LifestyleTier]): typeof TIER_ASSUMPTIONS[LifestyleTier] {
    const updated = { ...base };
    const num = (s: string) => parseInt(s.replace(/[,$]/g, ''), 10);
    const m = (re: RegExp) => text.match(re);
    const retireMatch = m(/retire.*?(\d+)|(\d+).*?retire/i);
    if (retireMatch) updated.retirementAge = num(retireMatch[1] || retireMatch[2]);
    const expMatch = m(/\$\s*([\d,]+)\s*\/?\s*month|\bexpenses?\b.*?\$?\s*([\d,]+)/i);
    if (expMatch) updated.monthlyExpenses = num(expMatch[1] || expMatch[2]);
    const assetMatch = m(/assets?\b.*?\$?\s*([\d,]+)|\bsavings?\b.*?\$?\s*([\d,]+)/i);
    if (assetMatch) updated.currentAssets = num(assetMatch[1] || assetMatch[2]);
    const salaryMatch = m(/salary\b.*?\$?\s*([\d,]+)|\beach.*?\$?\s*([\d,]+)/i);
    if (salaryMatch) updated.monthlySalary = num(salaryMatch[1] || salaryMatch[2]);
    return updated;
  }

  const onResultObtained = (tierResult: TierResult) => {
    setResult(tierResult);
    const resultText = buildInitialResultMessage(tierResult.tier, tierResult.reasoning);
    setExtraMessages([{ role: 'bot', text: resultText, isResult: true, tier: tierResult.tier }]);
    setAwaitingConfirmation(true);
    setCustomAssumptions(null);
    setResultAction(null);
    scrollToBottom();
  };

  const analyse = async (dataUrl: string, mime: string) => {
    setLoading(true);
    setError(null);
    setExtraMessages([]);
    setAwaitingConfirmation(false);
    setResultAction(null);
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
      onResultObtained(data as TierResult);
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

  const handleViewPlan = () => {
    setAwaitingConfirmation(false);
    setResultAction('plan');
    setExtraMessages(prev => [...prev, { role: 'user', text: 'View Plan' }]);
    setIsTyping(true);
    setTimeout(() => {
      const assumptions = customAssumptions ?? TIER_ASSUMPTIONS[result!.tier];
      const projMsg = `With your ideal retirement expenses of $${assumptions.monthlyExpenses.toLocaleString()}/month, and current net assets of $${assumptions.currentAssets.toLocaleString()}, your projected savings would last until age ${assumptions.projectedUntilAge}. This doesn't mean retirement is not possible — it just means we'll need to adjust a few things to better support the lifestyle you want. We can refine this plan by ${assumptions.adjustments}.\n\nWould you like to refine your retirement plan, or should I suggest a few ways to close the gap?`;
      setExtraMessages(prev => [...prev, { role: 'bot', text: projMsg }]);
      setIsTyping(false);
      scrollToBottom();
    }, 800);
  };

  const handleCustomise = () => {
    setAwaitingConfirmation(false);
    setResultAction('customise');
    setExtraMessages(prev => [...prev, { role: 'user', text: 'Customise' }]);
    setIsTyping(true);
    setTimeout(() => {
      setExtraMessages(prev => [...prev, { role: 'bot', text: "Sure! Which assumption would you like to adjust? For example, you can change your target retirement age, monthly expenses, current assets, or salary. Type your changes below and I'll update your plan." }]);
      setIsTyping(false);
      scrollToBottom();
    }, 800);
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = textInput.trim();
    if (!text || loading || textLoading || isTyping) return;
    setTextInput('');

    // Post-result: customise follow-up
    if (result && resultAction === 'customise') {
      setExtraMessages(prev => [...prev, { role: 'user', text }]);
      setIsTyping(true);
      const base = customAssumptions ?? TIER_ASSUMPTIONS[result.tier];
      const updated = parseCustomisations(text, base);
      setCustomAssumptions(updated);
      const customMsg = `Here's what we worked out from information you provided —\n• Target retirement age: ${updated.retirementAge}\n• Life expectancy: ${updated.lifeExpectancy}\n• Ideal retirement expenses: $${updated.monthlyExpenses.toLocaleString()}/mth\n• Estimated retirement income: $${updated.monthlyIncome.toLocaleString()}/mth\n• Current cash & investments: $${updated.currentAssets.toLocaleString()}\n• Current salary: $${updated.monthlySalary.toLocaleString()}/mth\n• Current expenses: $${updated.monthlyCurrentExpenses.toLocaleString()}/mth\n\nWould you like to view your retirement plan with these updated figures?`;
      setTimeout(() => {
        setExtraMessages(prev => [...prev, { role: 'bot', text: customMsg, isResult: true, tier: result.tier }]);
        setIsTyping(false);
        setAwaitingConfirmation(true);
        setResultAction(null);
        scrollToBottom();
      }, 800);
      return;
    }

    // Post-result awaiting button choice — ignore text
    if (awaitingConfirmation) return;

    // Post-plan follow-up: answer conversationally, don't re-run analysis
    if (result && resultAction === 'plan') {
      setExtraMessages(prev => [...prev, { role: 'user', text }]);
      setIsTyping(true);
      setTimeout(() => {
        setExtraMessages(prev => [...prev, { role: 'bot', text: "Great question! I'd recommend speaking with your OCBC Relationship Manager to customise this plan further. They can help adjust the assumptions based on your full financial picture." }]);
        setIsTyping(false);
        scrollToBottom();
      }, 800);
      return;
    }

    // Initial analysis from text
    setSubmittedText(text);
    setTextLoading(true);
    setResult(null);
    setError(null);
    setPreview(null);
    setExtraMessages([]);
    setCustomAssumptions(null);
    setResultAction(null);
    setAwaitingConfirmation(false);
    scrollToBottom();
    try {
      const res = await fetch('/api/lifestyle-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          questions: ['Describe your ideal retirement lifestyle'],
          answers: [text],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const tier: LifestyleTier = ['enhanced', 'comfortable', 'basic'].includes(data.tier) ? data.tier : 'comfortable';
      onResultObtained({ tier, reasoning: data.reasoning ?? '' });
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setTextLoading(false);
      scrollToBottom();
    }
  };

  const handleReset = () => {
    setPreview(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setExtraMessages([]);
    setAwaitingConfirmation(false);
    setResultAction(null);
    setCustomAssumptions(null);
  };

  const isInputBusy = loading || textLoading || isTyping || (awaitingConfirmation && !resultAction);

  const chatFooter = (
    <form
      onSubmit={handleTextSubmit}
      className="shrink-0 bg-white border-t border-slate-200 px-3 py-2.5 flex items-center gap-2"
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
    >
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={loading || textLoading || isTyping}
        className="w-9 h-9 bg-[#E3000F] rounded-full flex items-center justify-center shrink-0 hover:bg-red-700 transition-colors disabled:opacity-50 shadow-md"
      >
        <ImageIcon size={16} className="text-white" />
      </button>
      <input
        type="text"
        value={textInput}
        onChange={e => setTextInput(e.target.value)}
        disabled={isInputBusy}
        placeholder={loading || textLoading ? 'Analysing…' : awaitingConfirmation && !resultAction ? 'Use the buttons above…' : ''}
        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E3000F] transition-all disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!textInput.trim() || isInputBusy}
        className="w-9 h-9 bg-[#E3000F] rounded-full flex items-center justify-center shrink-0 hover:bg-red-700 transition-colors disabled:opacity-40 shadow-md"
      >
        <Send size={15} className="text-white" />
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
    </form>
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

        {/* User text bubble */}
        {submittedText && !preview && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex justify-end px-3 py-2">
            <div className="bg-[#E3000F] rounded-2xl rounded-br-sm px-3 py-2 max-w-[180px] shadow-sm">
              <p className="text-sm text-white leading-relaxed">{submittedText}</p>
            </div>
          </motion.div>
        )}

        {/* Analysing indicator */}
        <AnimatePresence>
          {(loading || textLoading) && (
            <motion.div key="analysing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AnalysingBubble />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation messages (result + follow-ups) */}
        {extraMessages.map((msg, i) => (
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
                <Sparkles size={11} className="text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm max-w-[210px]">
                {msg.isResult ? (
                  (() => {
                    const t = msg.text;
                    const hdrMatch = t.match(/Here's what we worked out[^—]*—/);
                    if (!hdrMatch) return <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{t}</p>;
                    const hdrIdx = t.indexOf(hdrMatch[0]);
                    const intro = hdrIdx > 0 ? t.slice(0, hdrIdx).trim() : '';
                    const afterHdr = t.slice(hdrIdx + hdrMatch[0].length);
                    const qSplit = afterHdr.split('\n\nWould you like');
                    const bullets = qSplit[0].trim();
                    const question = qSplit.length > 1 ? 'Would you like' + qSplit[1] : '';
                    return (
                      <>
                        {msg.tier && (
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1.5', TIER_CONFIG[msg.tier].badge)}>
                            {TIER_CONFIG[msg.tier].label}
                          </span>
                        )}
                        {intro && <p className="text-sm text-slate-700 leading-relaxed mb-1">{intro}</p>}
                        <p className="text-sm font-bold text-slate-800 mb-1">{hdrMatch[0]}</p>
                        <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed mb-1">{bullets}</p>
                        {question && <p className="text-sm text-slate-700 leading-relaxed">{question}</p>}
                      </>
                    );
                  })()
                ) : (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{msg.text}</p>
                )}
              </div>
            </motion.div>
          )
        ))}

        {/* Action buttons / typing indicator */}
        <AnimatePresence>
          {awaitingConfirmation && !resultAction && !isTyping && !loading && !textLoading && (
            <motion.div key="actions" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex justify-end gap-2 px-3 py-1">
              <button onClick={handleCustomise}
                className="border border-slate-300 text-slate-600 text-xs px-3 py-1.5 rounded-full font-bold shadow-sm hover:bg-slate-50 transition-colors">
                Customise
              </button>
              <button onClick={handleViewPlan}
                className="bg-[#E3000F] text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-sm hover:bg-red-700 transition-colors">
                View Plan
              </button>
            </motion.div>
          )}
          {isTyping && (
            <motion.div key="typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-end gap-2 px-3 py-1.5">
              <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                <Sparkles size={11} className="text-white" />
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

        {/* Error */}
        <AnimatePresence>
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
      reasoning: `The images you've selected reflect ${cfg.desc.toLowerCase()}`,
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
            <TierResultFlow result={result!} />
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
      reasoning: `The images you've selected reflect ${cfg.desc.toLowerCase()}`,
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
            <TierResultFlow result={result!} />
          </>
        )}
      </div>
    </PhoneShell>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function LifestyleDiscovery({ activeSubView, setActiveSubView, sidebarOpen = true }: { activeSubView: string; setActiveSubView: (v: 'chatbot-approaches' | 'lifestyle-discovery') => void; sidebarOpen?: boolean }) {
  const [resetKey, setResetKey] = useState(0);
  const handleReset = () => setResetKey(k => k + 1);
  const [showAppendix, setShowAppendix] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showHybrid, setShowHybrid] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Lifestyle Discovery</h2>
          <p className="text-slate-500 mt-2 text-base max-w-2xl">
            Compare two approaches to understanding a customer's retirement lifestyle.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-sm font-bold text-slate-600 transition-all"
          >
            <RotateCcw size={14} />
            Reset Chat
          </button>

          {/* Sub-tab toggle */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveSubView('chatbot-approaches')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all',
                activeSubView === 'chatbot-approaches'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Bot size={16} />
              Chatbot Approaches
            </button>
            <button
              onClick={() => setActiveSubView('lifestyle-discovery')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all',
                activeSubView === 'lifestyle-discovery'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Sparkles size={16} />
              Lifestyle Discovery
            </button>
          </div>
        </div>
      </div>

      {/* Main row: Chat + Upload & Analyse side-by-side */}
      <div className="flex gap-6 justify-center flex-wrap xl:flex-nowrap">
        {/* Chat */}
        <div className="flex items-end gap-4">
          <ChatPhone key={`chat-${resetKey}`} />
          <TechCard
            largeTitle
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

        {/* Upload & Analyse */}
        <div className="flex items-end gap-4">
          <VisionUploadPhone key={`vision-${resetKey}`} />
          <TechCard
            largeTitle
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
      </div>

      {/* Appendix expandables */}
      <div className="pt-3 border-t border-slate-100">
        <button
          onClick={() => setShowAppendix(v => !v)}
          className="flex items-center gap-2 text-[11px] font-medium text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors mb-1"
        >
          <ChevronDown size={12} className={cn('transition-transform', showAppendix && 'rotate-180')} />
          Appendix
        </button>
        <AnimatePresence>
        {showAppendix && (
        <motion.div
          key="appendix-expand"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
        <div className="flex flex-col gap-2 mt-2">
          {/* Visual Picker */}
          <div>
            <button
              onClick={() => setShowPicker(v => !v)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors py-1"
            >
              <ChevronDown size={14} className={cn('transition-transform', showPicker && 'rotate-180')} />
              <span>Visual Picker</span>
              <span className="text-xs text-slate-300">— curated image selection</span>
            </button>
            <AnimatePresence>
              {showPicker && (
                <motion.div
                  key="picker-expand"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="flex items-end gap-4 justify-center py-5">
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Hybrid Visual */}
          <div>
            <button
              onClick={() => setShowHybrid(v => !v)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors py-1"
            >
              <ChevronDown size={14} className={cn('transition-transform', showHybrid && 'rotate-180')} />
              <span>Hybrid Visual</span>
              <span className="text-xs text-slate-300">— curated images + photo upload</span>
            </button>
            <AnimatePresence>
              {showHybrid && (
                <motion.div
                  key="hybrid-expand"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="flex items-end gap-4 justify-center py-5">
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}
