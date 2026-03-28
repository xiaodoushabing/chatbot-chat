import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Bot, TrendingUp, Home, Wallet, ChevronDown, ChevronUp,
  ArrowRight, GitBranch, RotateCcw, Sparkles,
} from 'lucide-react';
import LifestyleDiscovery from './LifestyleDiscovery';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Engine = 'nlu' | 'hybrid' | 'rag';
type SubView = 'chatbot-approaches' | 'lifestyle-discovery';
interface RoutingTrace {
  intent: string;
  confidence: number | null;
  riskLevel: 'Low' | 'High' | null;
  responseMode: 'GenAI' | 'Template' | 'Exclude' | null;
  agent: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  type?: 'text' | 'what-if' | 'contextual' | 'life-event' | 'nlu-template' | 'low-confidence';
  data?: any;
  trace?: RoutingTrace;
  buttons?: string[];
  outOfScope?: boolean;
  isStreaming?: boolean;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  latency?: number;
}

// ─── Engine info ──────────────────────────────────────────────────────────────

const ENGINE_INFO = {
  nlu: {
    label: 'Traditional Chatbot',
    color: 'text-slate-700',
    headerBg: 'bg-slate-800',
    tags: [
      { text: 'Deterministic', style: 'bg-gray-100 text-gray-600 border border-gray-300' },
      { text: '< 50ms', style: 'bg-green-50 text-green-700 border border-green-300' },
    ],
    pros: ['Predictable & low risk', 'Fast response'],
    cons: ['Least flexible', 'Worst customer experience'],
    desc: 'Similarity search identifies the closest intent, then maps it to a deterministic message template.',
  },
  hybrid: {
    label: 'Hybrid (Traditional + GenAI) Chatbot',
    color: 'text-blue-700',
    headerBg: 'bg-blue-700',
    tags: [
      { text: 'Multi-intent', style: 'bg-purple-50 text-purple-700 border border-purple-300' },
      { text: 'Routing traces', style: 'bg-blue-50 text-blue-700 border border-blue-300' },
    ],
    pros: ['More flexible while retaining control in critical conversations'],
    cons: ['Requires maintenance on critical conversations and rules'],
    desc: 'Similarity search identifies the intent. Simple intents map to a message template; complex intents trigger a RAG response.',
  },
  rag: {
    label: 'Full GenAI Chatbot',
    color: 'text-[#E3000F]',
    headerBg: 'bg-[#E3000F]',
    tags: [
      { text: 'Knowledge-grounded', style: 'bg-red-50 text-[#E3000F] border border-red-300' },
      { text: 'LLM-powered', style: 'bg-orange-50 text-orange-700 border border-orange-300' },
    ],
    pros: ['Most flexible', 'Least maintenance effort'],
    cons: ['Significant investment to control risk', 'Residual risk is higher'],
    desc: 'Similarity search identifies the intent, then always triggers a RAG response from the retirement knowledge base.',
  },
};

// ─── Initial messages ─────────────────────────────────────────────────────────

const INITIAL_MESSAGES: Record<Engine, Message[]> = {
  nlu: [{
    id: 'init-nlu', role: 'bot', type: 'nlu-template',
    content: "Hello! I'm the OCBC Retirement Assistant. I can help with CPF, SRS, and retirement planning queries.",
    buttons: ['CPF Life Payouts', 'SRS Information', 'Retirement Planning', 'Life Events'],
  }],
  hybrid: [{
    id: 'init-hybrid', role: 'bot', type: 'text',
    content: "Hello! I'm your AI-powered retirement advisor with comprehensive knowledge of OCBC products. I have access to your dashboard data. How can I help you plan for the future today?",
    trace: { intent: 'No match (greeting)', confidence: null, riskLevel: null, responseMode: 'GenAI', agent: 'Retirement_Planner_Agent' },
  }],
  rag: [{
    id: 'init-rag', role: 'bot', type: 'text',
    content: "Hello! I'm your AI-powered retirement advisor with comprehensive knowledge of OCBC products. I have access to your dashboard data. How can I help you plan for the future today?",
  }],
};

// ─── Query categories for quick chips ────────────────────────────────────────

const SIMPLE_QUERIES = [
  'What is CPF Life and how much will I get?',
  'What is the SRS retirement age?',
];
const COMPLEX_QUERIES = [
  'Am I on track for retirement?',
  'When can I retire in Singapore?',
  'Should I open an SRS account?',
];
const EDGE_1 = ['What bonus interest rate does OCBC give on CPF savings for Premier Banking customers?'];
const EDGE_2 = ["How did OCBC's retirement unit trusts perform versus CPF Life returns over the past 3 years?"];


// ─── Intent definitions (ported from chatbot_demo/src/lib/intents.ts) ──────────

interface Intent {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  trainingExamples: string[];
  templateResponse: { text: string; buttons: string[] };
}

const RETIREMENT_INTENTS: Intent[] = [
  {
    id: 'cpf_inquiry', name: 'CPF Inquiry',
    description: 'Questions about CPF accounts, interest rates, and contribution rules',
    keywords: ['cpf','central','provident','fund','ordinary','special','medisave','oa','sa','ma','ra','contribution','payout','withdrawal','topup','interest','rate','retirement','account','life','balance','scheme','srs','supplementary','age'],
    trainingExamples: ['how does CPF work','what is CPF OA interest rate','CPF contribution rates for employees','what is CPF Life monthly payout','when can I withdraw my CPF','how to top up CPF special account','CPF retirement sum requirements','difference between BRS FRS ERS','how much is CPF Life payout','What is the SRS retirement age','SRS withdrawal age','what age can I withdraw SRS','SRS retirement withdrawal rules'],
    templateResponse: { text: 'I can help with your CPF queries. What would you like to know?', buttons: ['CPF OA/SA Interest Rates','CPF Contribution Rates','CPF Life Monthly Payouts','CPF Retirement Sum (BRS/FRS/ERS)'] },
  },
  {
    id: 'retirement_planning', name: 'Retirement Planning',
    description: 'Planning retirement age, income needs, and retirement goals',
    keywords: ['retire','retirement','early','age','financial','freedom','goal','plan','planning','income','need','much','when','comfortably','55','60','62','63','65','lifestyle','comfortable','target'],
    trainingExamples: ['when can I retire','how much do I need to retire comfortably','I want to retire at 55','what is the retirement age in Singapore','how to plan for retirement at 40','how much monthly income do I need in retirement','retire early in Singapore','how much to save for retirement','retirement goal planning','am i on track for retirement'],
    templateResponse: { text: 'Let me help you plan your retirement. Here are key areas to explore:', buttons: ['Calculate My Retirement Needs','Singapore Retirement Age Guide','Monthly Income Planning','Start My Retirement Plan'] },
  },
  {
    id: 'retirement_gap', name: 'Retirement Gap',
    description: 'Calculating shortfall between current savings and retirement target',
    keywords: ['gap','shortfall','enough','savings','short','more','insufficient','track','behind','deficit','difference','close','bridge','narrow','afford','fall','catch','up'],
    trainingExamples: ['do I have enough savings for retirement','how to close my retirement gap','I have a retirement shortfall','how much more do I need to save','calculate my retirement deficit','how to narrow the retirement gap','afford to retire at 63'],
    templateResponse: { text: 'Let me help you assess your retirement gap. What would you like to do?', buttons: ['Calculate My Retirement Gap','Top Up CPF Special Account','Invest to Close the Gap','Review My Savings Plan'] },
  },
  {
    id: 'investment_options', name: 'Investment Options',
    description: 'Retirement investments including SRS, unit trusts, and annuities',
    keywords: ['invest','investment','unit','trust','srs','supplementary','scheme','endowment','annuity','robo','portfolio','return','growth','risk','fund','etf','stock','bond','diversify','product','savings'],
    trainingExamples: ['what investment options do I have for retirement','how to invest for retirement in Singapore','should I use SRS account','OCBC investment products for retirement','low risk investment for retirees','best way to grow retirement savings','unit trust for retirement planning','SRS tax savings'],
    templateResponse: { text: 'Here are retirement investment options available through OCBC:', buttons: ['SRS (Tax-Advantaged Savings)','Unit Trusts & ETFs','Endowment & Annuity Plans','OCBC RoboInvest'] },
  },
  {
    id: 'life_events', name: 'Life Events Planning',
    description: 'Planning major milestones and their impact on retirement',
    keywords: ['life','event','marriage','wedding','children','child','education','property','home','house','buy','family','travel','milestone','dream','car','kids','school','university','goal','micro'],
    trainingExamples: ['planning to get married soon','saving for my children university education','how do life events affect my retirement plan','planning for family expenses and retirement','dream home and retirement savings','micro retirement planning','travel goals and retirement savings'],
    templateResponse: { text: 'Life events significantly impact your retirement. Which are you planning for?', buttons: ['Marriage & Family Planning',"Children's Education Fund",'Property Purchase Impact','Travel & Lifestyle Goals'] },
  },
];

const OUT_OF_SCOPE_INTENT_DATA = {
  id: 'out_of_scope', name: 'Out of Scope',
  templateResponse: {
    text: "I'm specialised in retirement planning and can't help with that topic. Here's what I can assist you with:",
    buttons: ['CPF & Retirement Accounts','Retirement Planning Goals','Close My Retirement Gap','Investment Options'],
  },
};

// Simple intents use template only; complex intents trigger LLM (same as chatbot_demo)
const SIMPLE_INTENTS = new Set(['cpf_inquiry', 'retirement_gap', 'life_events']);

// Hallucination caches — keyed by exact original-case strings (matching chatbot_demo/src/lib/intents.ts)
// EC1: RAG only — cpf_inquiry is simple so Hybrid safely returns template
// EC2: Both Hybrid and RAG — investment_options is complex so Hybrid also calls LLM
const RAG_HALLUCINATION_CACHE: Record<string, string> = {
  "What bonus interest rate does OCBC give on CPF savings for Premier Banking customers?":
    "As an OCBC Premier Banking customer, you're eligible for our **CPF Bonus Rate Programme** — an additional **1.75% p.a.** on top of your CPF Ordinary Account's standard 2.5%, giving you an effective **4.25% p.a.** on your CPF-OA savings.\n\nThis exclusive benefit applies to customers maintaining SGD 200,000 or more in OCBC deposits. Simply apply via the OCBC app under **Premier Benefits › CPF Booster** to activate it within 3 business days. Would you like me to help you check if you qualify?",
  "How did OCBC's retirement unit trusts perform versus CPF Life returns over the past 3 years?":
    "OCBC's retirement unit trusts significantly outperformed CPF Life over the past 3 years:\n\n- **OCBC SecureGrowth Retirement Fund**: **8.4% p.a.** (vs CPF Life ~4.0%)\n- **OCBC Balanced Income Fund III**: **6.9% p.a.**\n- **OCBC Global Retirement Portfolio**: **11.3%** in FY2023 alone\n\nAll three funds are available exclusively to OCBC customers aged 50 and above. Would you like me to compare these projections against your current CPF Life payout estimates?",
};

const HYBRID_HALLUCINATION_CACHE: Record<string, string> = {
  "How did OCBC's retirement unit trusts perform versus CPF Life returns over the past 3 years?":
    "OCBC's retirement unit trusts significantly outperformed CPF Life over the past 3 years:\n\n- **OCBC SecureGrowth Retirement Fund**: **8.4% p.a.** (vs CPF Life ~4.0%)\n- **OCBC Balanced Income Fund III**: **6.9% p.a.**\n- **OCBC Global Retirement Portfolio**: **11.3%** in FY2023 alone\n\nAll three funds are available exclusively to OCBC customers aged 50 and above.",
};

// ─── TF-IDF engine (ported from chatbot_demo/src/lib/embedding-engine.ts) ─────

const STOP_WORDS_TF = new Set([
  'a','an','the','is','it','in','on','at','to','for','of','and','or','but',
  'i','my','me','we','you','your','do','be','am','are','was','were','have',
  'has','had','will','can','could','would','should','may','might','what',
  'how','when','where','which','that','this','there','if','about','with',
]);

function tfTokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS_TF.has(w));
}

function tfTermFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const total = tokens.length || 1;
  tf.forEach((v, k) => tf.set(k, v / total));
  return tf;
}

const intentDocs: string[][] = RETIREMENT_INTENTS.map(intent =>
  tfTokenize([intent.name, intent.description, ...intent.trainingExamples, ...intent.keywords].join(' '))
);
const tfVocab: string[] = Array.from(new Set(intentDocs.flat()));
const tfVocabIndex = new Map(tfVocab.map((w, i) => [w, i]));

function tfIdfWeight(term: string): number {
  const n = intentDocs.filter(d => d.includes(term)).length;
  return Math.log((intentDocs.length + 1) / (n + 1)) + 1;
}
const tfIdfCache = new Map(tfVocab.map(w => [w, tfIdfWeight(w)]));

function tfidfVec(text: string): number[] {
  const tokens = tfTokenize(text);
  const tf = tfTermFreq(tokens);
  const vec = new Array(tfVocab.length).fill(0);
  tf.forEach((tfVal, term) => {
    const idx = tfVocabIndex.get(term);
    if (idx !== undefined) vec[idx] = tfVal * (tfIdfCache.get(term) ?? 1);
  });
  return vec;
}

function cosineSimTF(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i]; }
  return magA === 0 || magB === 0 ? 0 : dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

const intentVectors: number[][] = RETIREMENT_INTENTS.map(intent =>
  tfidfVec([intent.name, intent.description, ...intent.trainingExamples, ...intent.keywords].join(' '))
);

const CONFIDENT_THRESHOLD = 0.15;
const WEAK_THRESHOLD = 0.05;

interface ClassifyResult {
  intent: Intent | typeof OUT_OF_SCOPE_INTENT_DATA;
  score: number;
  outOfScope: boolean;
}

function classifyMessage(message: string): ClassifyResult {
  const queryVec = tfidfVec(message);
  let bestScore = 0, bestIndex = 0;
  intentVectors.forEach((vec, i) => {
    const score = cosineSimTF(queryVec, vec);
    if (score > bestScore) { bestScore = score; bestIndex = i; }
  });
  if (bestScore < WEAK_THRESHOLD) return { intent: OUT_OF_SCOPE_INTENT_DATA, score: bestScore, outOfScope: true };
  return { intent: RETIREMENT_INTENTS[bestIndex], score: bestScore, outOfScope: false };
}

// ─── NLU simulator ───────────────────────────────────────────────────────────

interface NLUResult {
  content: string;
  type: Message['type'];
  buttons?: string[];
  outOfScope?: boolean;
  latency: number;
  intent: string | null;
  confidence: number | null;
}

function simulateNLU(input: string): NLUResult {
  const result = classifyMessage(input);
  const confidence = Math.round(result.score * 100);

  if (result.outOfScope) {
    return { content: OUT_OF_SCOPE_INTENT_DATA.templateResponse.text, type: 'text', buttons: OUT_OF_SCOPE_INTENT_DATA.templateResponse.buttons, outOfScope: true, latency: 45, intent: 'out_of_scope', confidence: null };
  }

  const intent = result.intent as Intent;

  if (result.score < CONFIDENT_THRESHOLD) {
    return { content: 'Do you mean you would like to perform the below mentioned actions?', type: 'low-confidence', buttons: intent.templateResponse.buttons, outOfScope: false, latency: 48, intent: intent.id, confidence };
  }

  return { content: intent.templateResponse.text, type: 'nlu-template', buttons: intent.templateResponse.buttons, outOfScope: false, latency: 50, intent: intent.id, confidence };
}

// ─── Hybrid simulator ─────────────────────────────────────────────────────────

function buildTrace(classResult: ClassifyResult): RoutingTrace {
  const confidence = classResult.score > 0 ? Math.round(classResult.score * 100) : null;
  const intentId = classResult.intent.id;
  const intentName = classResult.intent.name;
  const isSimple = !classResult.outOfScope && SIMPLE_INTENTS.has(intentId);
  const responseMode: 'GenAI' | 'Template' | 'Exclude' = classResult.outOfScope ? 'Exclude' : isSimple ? 'Template' : 'GenAI';
  const agent = responseMode === 'GenAI' ? 'Retirement_Planner_Agent' : null;

  return { intent: intentName, confidence, riskLevel: 'Low', responseMode, agent };
}

interface HybridResult {
  message: Omit<Message, 'id'>;
  delay: number;
}

function simulateHybrid(input: string): HybridResult {
  const lower = input.toLowerCase();

  // 1. Hallucination cache check (exact original-case key, same as chatbot_demo)
  if (HYBRID_HALLUCINATION_CACHE[input]) {
    const result = classifyMessage(input);
    const trace = buildTrace(result);
    return { message: { role: 'bot', content: HYBRID_HALLUCINATION_CACHE[input], type: 'text', trace }, delay: 1200 };
  }

  // 2. TF-IDF classification
  const result = classifyMessage(input);
  const trace = buildTrace(result);

  // 3. Out-of-scope → same template as NLU (deterministic, no LLM fallback)
  if (result.outOfScope) {
    return { message: { role: 'bot', content: OUT_OF_SCOPE_INTENT_DATA.templateResponse.text, type: 'text', buttons: OUT_OF_SCOPE_INTENT_DATA.templateResponse.buttons, outOfScope: true, trace }, delay: 350 };
  }

  const intent = result.intent as Intent;

  // 4. Simple intent → template (same response as NLU)
  if (SIMPLE_INTENTS.has(intent.id)) {
    return { message: { role: 'bot', content: intent.templateResponse.text, type: 'nlu-template', buttons: intent.templateResponse.buttons, trace }, delay: 350 };
  }

  // 6. Complex intent → LLM-style streaming response

  // retirement_planning
  if (lower.includes('on track') || (lower.includes('track') && lower.includes('retirement')))
    return { message: { role: 'bot', content: "To assess your retirement readiness, I'd need more context. As a benchmark: aim for 20–25x your annual expenses by retirement. CPF LIFE provides a floor (~$1,400–$1,800/month on the Standard Plan), so your private savings only need to bridge the gap.\n\nA typical Singaporean at 45 with $300k in CPF and $200k private savings is broadly on track for a comfortable retirement at 65. Could you share your approximate age, CPF balance, and monthly savings rate for a personalised assessment?", type: 'text', trace }, delay: 1300 };

  if ((lower.includes('when') && lower.includes('retire')) || lower.includes('retirement age'))
    return { message: { role: 'bot', content: "In Singapore, the minimum retirement age is 63, the re-employment age is 68, and CPF LIFE payouts begin at 65. For financial independence — retiring when you want — that depends on your savings rate. A 40% savings rate typically achieves FI in ~22 years regardless of income.\n\nWhat's your current age and target retirement lifestyle? I can calculate a personalised retirement date.", type: 'text', trace }, delay: 1200 };

  if (lower.includes('retire at 65'))
    return { message: { role: 'bot', content: "Great question! If you retire at 65 instead of 55, your projected monthly payout increases from $2,400 to $3,150. This is due to an additional 10 years of compounding in your CPF Special Account and a higher CPF LIFE payout tier.", type: 'what-if', data: { label: 'Projected Payout', old: 2400, new: 3150, unit: 'SGD/mo' }, trace }, delay: 1100 };

  // investment_options
  if (lower.includes('should i') && lower.includes('srs'))
    return { message: { role: 'bot', content: "Opening an SRS account makes strong sense if you're in the 22%+ tax bracket — contributions of $15,300/year save $3,366 in annual taxes. The break-even is typically 8–10 years before withdrawal. OCBC SRS offers no maintenance fees and full access to investment products.", type: 'text', trace }, delay: 1250 };

  if (lower.includes('srs') || lower.includes('supplementary retirement'))
    return { message: { role: 'bot', content: "The SRS (Supplementary Retirement Scheme) allows you to contribute up to $15,300/year (Singapore Citizens/PRs) with full tax relief. With investments inside SRS, only 50% of withdrawals are taxable spread over 10 years. OCBC SRS accounts offer access to unit trusts, fixed deposits, and robo-investing.", type: 'text', trace }, delay: 1200 };

  if (lower.includes('house') || lower.includes('home') || lower.includes('property'))
    return { message: { role: 'bot', content: "Buying a house is a major life event. Based on your current assets ($450k), a $1.2M property would require a $240k downpayment. This reduces your liquid retirement nest egg by 40%, potentially delaying your 'Full Retirement' milestone by 3 years.", type: 'life-event', data: { impact: '-3 Years', category: 'Retirement Timeline' }, trace }, delay: 400 };

  if (lower.includes('balance') || lower.includes('assets') || lower.includes('portfolio'))
    return { message: { role: 'bot', content: "Your total assets currently stand at $842,500. This includes your CPF Ordinary Account ($120k), Special Account ($280k), and private investments ($442.5k). Your current allocation is 65% low-risk, which is optimal for your age bracket.", type: 'contextual', data: { total: 842500, allocation: '65% Low-Risk' }, trace }, delay: 1000 };

  return { message: { role: 'bot', content: "I can help with that! Would you like to see a 'What-If' scenario for your retirement age, or should we analyse the impact of a major life event like a house purchase?", type: 'text', trace }, delay: 1100 };
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode {
  return text.split('\n').map((line, i) => {
    const orderedMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (orderedMatch) return <p key={i} className="ml-2"><span className="font-semibold">{orderedMatch[1]}.</span> {renderInline(orderedMatch[2])}</p>;
    const unorderedMatch = line.match(/^[-*]\s+(.*)/);
    if (unorderedMatch) return <p key={i} className="ml-2 before:content-['•'] before:mr-1">{renderInline(unorderedMatch[1])}</p>;
    if (line.trim() === '') return <div key={i} className="h-1" />;
    return <p key={i}>{renderInline(line)}</p>;
  });
}

function renderInline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-2">
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function modeColor(mode: 'GenAI' | 'Template' | 'Exclude' | null): string {
  if (mode === 'GenAI') return 'bg-blue-100 text-blue-700';
  if (mode === 'Template') return 'bg-amber-100 text-amber-700';
  if (mode === 'Exclude') return 'bg-slate-100 text-slate-600';
  return 'bg-slate-100 text-slate-500';
}

function RoutingTraceCard({ trace }: { trace: RoutingTrace }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full border border-slate-200 rounded-xl bg-slate-50 overflow-hidden text-[0.65rem]">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-100 transition-colors">
        <GitBranch size={9} className="text-slate-400 shrink-0" />
        <span className="font-bold text-slate-500 uppercase tracking-wider">Routing trace</span>
        {trace.intent && <><span className="text-slate-300 mx-0.5">·</span><span className="text-slate-600 font-medium truncate max-w-[120px]">{trace.intent}</span></>}
        <span className="ml-auto text-slate-400">{open ? <ChevronUp size={9} /> : <ChevronDown size={9} />}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div key="trace" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="px-2.5 pb-2.5 pt-1 border-t border-slate-200 grid grid-cols-2 gap-x-3 gap-y-1.5">
              <div className="flex flex-col gap-0.5"><span className="text-slate-400 uppercase tracking-wider font-bold">Intent</span><span className="text-slate-700 font-medium">{trace.intent}{trace.confidence !== null && <span className="ml-1 text-slate-400">({trace.confidence}%)</span>}</span></div>
              <div className="flex flex-col gap-0.5"><span className="text-slate-400 uppercase tracking-wider font-bold">Risk</span>{trace.riskLevel === null ? <span className="text-slate-400">—</span> : <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded font-bold w-fit', trace.riskLevel === 'Low' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>{trace.riskLevel}</span>}</div>
              <div className="flex flex-col gap-0.5"><span className="text-slate-400 uppercase tracking-wider font-bold">Mode</span>{trace.responseMode === null ? <span className="text-slate-400">—</span> : <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded font-bold w-fit', modeColor(trace.responseMode))}>{trace.responseMode}</span>}</div>
              <div className="flex flex-col gap-0.5"><span className="text-slate-400 uppercase tracking-wider font-bold">Agent</span><span className="text-slate-700 font-medium">{trace.agent ?? '—'}</span></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BotBubble({ msg, onButtonClick }: { msg: Message; onButtonClick: (t: string) => void }) {
  const bubbleCn = cn(
    'rounded-2xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed space-y-0.5 shadow-sm',
    msg.outOfScope ? 'bg-gray-100 text-gray-500 border border-gray-200' : 'bg-white border border-gray-200 text-gray-800'
  );

  return (
    <div className="flex flex-col gap-1.5 max-w-[92%]">
      <div className={bubbleCn}>
        {msg.type === 'nlu-template' || msg.type === 'text' || msg.type === 'low-confidence'
          ? renderMarkdown(msg.content)
          : <p>{msg.content}</p>}
        {msg.isStreaming && <span className="inline-block w-1.5 h-3 bg-gray-400 animate-pulse rounded ml-0.5 align-middle" />}
      </div>
      {msg.buttons && msg.buttons.length > 0 && (
        <div className="flex flex-col gap-1">
          {msg.buttons.map((btn, i) => (
            <button key={i} onClick={() => onButtonClick(btn)} className="block w-full text-left text-xs text-[#E3000F] border border-[#E3000F] rounded-full px-3 py-1 hover:bg-red-50 transition-colors">
              {btn}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PhoneColumn({ engine, state, showTraces, onButtonClick }: {
  engine: Engine;
  state: ChatState;
  showTraces: boolean;
  onButtonClick: (t: string) => void;
}) {
  const chatRef = useRef<HTMLDivElement>(null);
  const info = ENGINE_INFO[engine];

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [state.messages, state.isLoading]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phone frame */}
      <div className="relative w-[300px] h-[570px] bg-black rounded-[44px] p-[3px] shadow-2xl">
        <div className="w-full h-full bg-[#F2F2F7] rounded-[42px] overflow-hidden flex flex-col">
          {/* Dynamic island */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-16 h-5 bg-black rounded-full" />
          </div>

          {/* Chat area */}
          <div ref={chatRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2" style={{ scrollbarWidth: 'none' }}>
            {state.messages.map(msg => (
              <div key={msg.id} className={cn('flex flex-col gap-1.5', msg.role === 'user' ? 'items-end' : 'items-start')}>
                {msg.role === 'user' ? (
                  <span className="bg-[#E3000F] text-white text-sm leading-relaxed rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%] inline-block">
                    {msg.content}
                  </span>
                ) : (
                  <>
                    <BotBubble msg={msg} onButtonClick={onButtonClick} />
                    {/* Rich cards — hybrid only */}
                    {engine === 'hybrid' && msg.type === 'what-if' && msg.data && (
                      <div className="w-full bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between"><span className="text-[0.6rem] font-bold text-emerald-700 uppercase tracking-widest">What-If Analysis</span><TrendingUp size={11} className="text-emerald-600" /></div>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col"><span className="text-[0.6rem] text-emerald-600 uppercase font-bold">Current</span><span className="text-[0.7rem] font-bold text-slate-400 line-through">${msg.data.old}</span></div>
                          <ArrowRight size={11} className="text-emerald-400" />
                          <div className="flex flex-col"><span className="text-[0.6rem] text-emerald-600 uppercase font-bold">Projected</span><span className="text-sm font-black text-emerald-700">${msg.data.new} <span className="text-[0.6rem]">{msg.data.unit}</span></span></div>
                        </div>
                      </div>
                    )}
                    {engine === 'hybrid' && msg.type === 'life-event' && msg.data && (
                      <div className="w-full bg-amber-50 border border-amber-100 rounded-xl p-2.5 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between"><span className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-widest">Life Event Impact</span><Home size={11} className="text-amber-600" /></div>
                        <div className="flex items-center justify-between"><span className="text-[0.7rem] font-semibold text-slate-700">{msg.data.category}</span><span className="text-sm font-black text-amber-700">{msg.data.impact}</span></div>
                      </div>
                    )}
                    {engine === 'hybrid' && msg.type === 'contextual' && msg.data && (
                      <div className="w-full bg-red-50 border border-red-100 rounded-xl p-2.5 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between"><span className="text-[0.6rem] font-bold text-[#E3000F] uppercase tracking-widest">Dashboard Context</span><Wallet size={11} className="text-[#E3000F]" /></div>
                        <div className="flex items-center justify-between"><span className="text-[0.7rem] font-semibold text-slate-700">Total Assets</span><span className="text-sm font-black text-[#E3000F]">${msg.data.total.toLocaleString()}</span></div>
                      </div>
                    )}
                    {/* Routing trace — hybrid + rag, shown when traces enabled */}
                    {(engine === 'hybrid' || engine === 'rag') && msg.trace && showTraces && <RoutingTraceCard trace={msg.trace} />}
                  </>
                )}
              </div>
            ))}
            {state.isLoading && <TypingIndicator />}
          </div>

          {/* Home indicator */}
          <div className="flex justify-center pb-2 pt-1 shrink-0">
            <div className="w-24 h-1 bg-gray-400 rounded-full opacity-60" />
          </div>
        </div>
      </div>

      {/* Latency badge */}
      <div className="h-5">
        {state.latency !== undefined ? (
          <span className={cn('text-xs font-mono font-semibold', state.latency < 100 ? 'text-green-600' : state.latency < 1500 ? 'text-blue-600' : 'text-orange-500')}>
            ⏱ {state.latency < 1000 ? `${state.latency}ms` : `${(state.latency / 1000).toFixed(1)}s`}
          </span>
        ) : <span />}
      </div>

      {/* Engine info card */}
      <div className="w-[300px] flex flex-col gap-2">
        <div>
          <p className={cn('text-sm font-bold', info.color)}>{info.label}</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">{info.desc}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {info.tags.map(t => <span key={t.text} className={cn('text-[0.65rem] px-2 py-0.5 rounded-full font-semibold border', t.style)}>{t.text}</span>)}
        </div>
        <div className="flex flex-col gap-0.5">
          {info.pros.map(p => <p key={p} className="text-xs text-slate-600 flex gap-1"><span className="text-green-500 shrink-0">+</span>{p}</p>)}
          {info.cons.map(c => <p key={c} className="text-xs text-slate-500 flex gap-1"><span className="text-red-400 shrink-0">−</span>{c}</p>)}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatbotPreview({ sidebarOpen = true }: { sidebarOpen?: boolean }) {
  const [activeSubView, setActiveSubView] = useState<SubView>('chatbot-approaches');
  const [input, setInput] = useState('');
  const [showTraces, setShowTraces] = useState(false);

  const initState = (engine: Engine): ChatState => ({
    messages: INITIAL_MESSAGES[engine].map(m => ({ ...m })),
    isLoading: false,
  });

  const [nluState, setNluState] = useState<ChatState>(() => initState('nlu'));
  const [hybridState, setHybridState] = useState<ChatState>(() => initState('hybrid'));
  const [ragState, setRagState] = useState<ChatState>(() => initState('rag'));

  const ragStreamRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ragAbortRef = useRef<AbortController | null>(null);
  const ragStartRef = useRef<number>(0);
  const hybridStreamRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hybridAbortRef = useRef<AbortController | null>(null);
  const hybridStartRef = useRef<number>(0);

  const handleReset = () => {
    if (ragStreamRef.current) { clearInterval(ragStreamRef.current); ragStreamRef.current = null; }
    if (ragAbortRef.current) { ragAbortRef.current.abort(); ragAbortRef.current = null; }
    if (hybridStreamRef.current) { clearInterval(hybridStreamRef.current); hybridStreamRef.current = null; }
    if (hybridAbortRef.current) { hybridAbortRef.current.abort(); hybridAbortRef.current = null; }
    setNluState(initState('nlu'));
    setHybridState(initState('hybrid'));
    setRagState(initState('rag'));
    setInput('');
  };

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput('');

    const ts = Date.now();
    const userMsg: Message = { id: String(ts), role: 'user', content: trimmed };

    setNluState(s => ({ ...s, messages: [...s.messages, userMsg], isLoading: true }));
    setHybridState(s => ({ ...s, messages: [...s.messages, userMsg], isLoading: true }));
    setRagState(s => ({ ...s, messages: [...s.messages, userMsg], isLoading: true }));

    // ── NLU (fast, ~50ms) ────────────────────────────────────────────────────
    const nluResult = simulateNLU(trimmed);
    setTimeout(() => {
      const botMsg: Message = { id: String(ts + 10), role: 'bot', type: nluResult.type, content: nluResult.content, buttons: nluResult.buttons, outOfScope: nluResult.outOfScope };
      setNluState(s => ({ ...s, messages: [...s.messages, botMsg], isLoading: false, latency: nluResult.latency }));
    }, nluResult.latency);

    // ── Hybrid (templates for simple/out-of-scope; real LLM for complex) ──────
    if (hybridAbortRef.current) hybridAbortRef.current.abort();
    const hybridAbort = new AbortController();
    hybridAbortRef.current = hybridAbort;
    if (hybridStreamRef.current) { clearInterval(hybridStreamRef.current); hybridStreamRef.current = null; }

    const hybridClassResult = classifyMessage(trimmed);
    const hybridTrace = buildTrace(hybridClassResult);
    const hybridStreamId = String(ts + 20);
    hybridStartRef.current = ts;

    if (HYBRID_HALLUCINATION_CACHE[trimmed]) {
      // Cached hallucination: simulate streaming word-by-word (no real LLM needed)
      const cachedContent = HYBRID_HALLUCINATION_CACHE[trimmed];
      setTimeout(() => {
        if (hybridAbort.signal.aborted) return;
        setHybridState(s => ({
          ...s, isLoading: false,
          messages: [...s.messages, { id: hybridStreamId, role: 'bot', content: '', type: 'text', trace: hybridTrace, isStreaming: true }],
        }));
        const words = cachedContent.split(' ');
        let idx = 0;
        hybridStreamRef.current = setInterval(() => {
          if (hybridAbort.signal.aborted) { clearInterval(hybridStreamRef.current!); hybridStreamRef.current = null; return; }
          idx += 3;
          const done = idx >= words.length;
          setHybridState(s => ({
            ...s,
            messages: s.messages.map(m => m.id === hybridStreamId
              ? { ...m, content: done ? cachedContent : words.slice(0, Math.min(idx, words.length)).join(' '), isStreaming: !done } : m),
            ...(done ? { latency: Date.now() - hybridStartRef.current } : {}),
          }));
          if (done && hybridStreamRef.current) { clearInterval(hybridStreamRef.current); hybridStreamRef.current = null; }
        }, 25);
      }, 1200);
    } else if (hybridClassResult.outOfScope || SIMPLE_INTENTS.has(hybridClassResult.intent.id)) {
      // Simple or out-of-scope: instant template response
      const hybridResult = simulateHybrid(trimmed);
      setTimeout(() => {
        if (hybridAbort.signal.aborted) return;
        setHybridState(s => ({ ...s, messages: [...s.messages, { id: hybridStreamId, ...hybridResult.message }], isLoading: false, latency: hybridResult.delay }));
      }, hybridResult.delay);
    } else {
      // Complex intent: real LLM call via /api/hybrid (guarded system prompt)
      (async () => {
        await new Promise(r => setTimeout(r, 350));
        if (hybridAbort.signal.aborted) return;

        setHybridState(s => ({
          ...s, isLoading: false,
          messages: [...s.messages, { id: hybridStreamId, role: 'bot', content: '', type: 'text', trace: hybridTrace, isStreaming: true }],
        }));

        let fullContent = '';
        try {
          const res = await fetch('/api/hybrid', {
            method: 'POST',
            signal: hybridAbort.signal,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ message: trimmed }),
          });
          if (!res.ok || !res.body) throw new Error(`Hybrid error ${res.status}`);
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          outer2: while (true) {
            const { done, value } = await reader.read();
            if (done || hybridAbort.signal.aborted) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try {
                const ev = JSON.parse(line.slice(6));
                if (ev.type === 'delta') {
                  fullContent += ev.text;
                  setHybridState(s => ({
                    ...s,
                    messages: s.messages.map(m => m.id === hybridStreamId ? { ...m, content: fullContent } : m),
                  }));
                }
                if (ev.type === 'end') break outer2;
                if (ev.type === 'error') { fullContent = "I'm sorry, I encountered an error. Please try again."; break outer2; }
              } catch {}
            }
          }
        } catch (err: unknown) {
          if ((err as { name?: string })?.name !== 'AbortError') {
            fullContent = fullContent || "I'm sorry, I encountered an error. Please try again.";
          }
        }

        if (!hybridAbort.signal.aborted) {
          setHybridState(s => ({
            ...s,
            messages: s.messages.map(m => m.id === hybridStreamId
              ? { ...m, content: fullContent || "I'm sorry, I encountered an error. Please try again.", isStreaming: false } : m),
            latency: Date.now() - hybridStartRef.current,
          }));
        }
      })();
    }

    // ── RAG (real LLM streaming via Anthropic API) ───────────────────────────
    if (ragAbortRef.current) ragAbortRef.current.abort();
    const ragAbort = new AbortController();
    ragAbortRef.current = ragAbort;
    if (ragStreamRef.current) { clearInterval(ragStreamRef.current); ragStreamRef.current = null; }

    const ragClassResult = classifyMessage(trimmed);
    const ragBaseTrace = buildTrace(ragClassResult);
    const ragTrace: RoutingTrace = { ...ragBaseTrace, agent: 'RAG_Retrieval_Agent' };
    const ragStreamId = String(ts + 30);
    ragStartRef.current = ts;

    if (RAG_HALLUCINATION_CACHE[trimmed]) {
      // Cached hallucination: simulate streaming word-by-word (no real LLM needed)
      setTimeout(() => {
        if (ragAbort.signal.aborted) return;
        setRagState(s => ({
          ...s, isLoading: false,
          messages: [...s.messages, { id: ragStreamId, role: 'bot', content: '', type: 'text', trace: ragTrace, isStreaming: true }],
        }));
        const words = RAG_HALLUCINATION_CACHE[trimmed].split(' ');
        let idx = 0;
        ragStreamRef.current = setInterval(() => {
          if (ragAbort.signal.aborted) { clearInterval(ragStreamRef.current!); return; }
          idx += 2;
          const done = idx >= words.length;
          setRagState(s => ({
            ...s,
            messages: s.messages.map(m => m.id === ragStreamId
              ? { ...m, content: done ? RAG_HALLUCINATION_CACHE[trimmed] : words.slice(0, Math.min(idx, words.length)).join(' '), isStreaming: !done } : m),
            ...(done ? { latency: Date.now() - ragStartRef.current } : {}),
          }));
          if (done && ragStreamRef.current) { clearInterval(ragStreamRef.current); ragStreamRef.current = null; }
        }, 35);
      }, 1200);
    } else {
      // Real LLM call
      (async () => {
        await new Promise(r => setTimeout(r, 400));
        if (ragAbort.signal.aborted) return;

        setRagState(s => ({
          ...s, isLoading: false,
          messages: [...s.messages, { id: ragStreamId, role: 'bot', content: '', type: 'text', trace: ragTrace, isStreaming: true }],
        }));

        let fullContent = '';
        try {
          const res = await fetch('/api/rag', {
            method: 'POST',
            signal: ragAbort.signal,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ message: trimmed }),
          });

          if (!res.ok || !res.body) throw new Error(`RAG error ${res.status}`);

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          outer: while (true) {
            const { done, value } = await reader.read();
            if (done || ragAbort.signal.aborted) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try {
                const ev = JSON.parse(line.slice(6));
                if (ev.type === 'delta') {
                  fullContent += ev.text;
                  setRagState(s => ({
                    ...s,
                    messages: s.messages.map(m => m.id === ragStreamId ? { ...m, content: fullContent } : m),
                  }));
                }
                if (ev.type === 'end') break outer;
                if (ev.type === 'error') { fullContent = "I'm sorry, I encountered an error. Please try again."; break outer; }
              } catch {}
            }
          }
        } catch (err: unknown) {
          if ((err as { name?: string })?.name !== 'AbortError') {
            fullContent = fullContent || "I'm sorry, I encountered an error. Please try again.";
          }
        }

        if (!ragAbort.signal.aborted) {
          setRagState(s => ({
            ...s,
            messages: s.messages.map(m => m.id === ragStreamId
              ? { ...m, content: fullContent || "I'm sorry, I encountered an error. Please try again.", isStreaming: false } : m),
            latency: Date.now() - ragStartRef.current,
          }));
        }
      })();
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    sendMessage(input);
  };

  const isAnySending = nluState.isLoading || hybridState.isLoading || ragState.isLoading ||
    ragState.messages.some(m => m.isStreaming) || hybridState.messages.some(m => m.isStreaming);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Sub-tab toggle ── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
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

      {activeSubView === 'lifestyle-discovery' && (
        <motion.div key="lifestyle-discovery" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
          <LifestyleDiscovery />
        </motion.div>
      )}

      {activeSubView === 'chatbot-approaches' && (<>
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Bot Tech Benchmark</h2>
          <p className="text-slate-500 mt-2 text-base max-w-2xl">
            Compare Traditional NLU, Hybrid, and Full GenAI chatbots side-by-side. Send the same query to all three and observe latency, routing, and hallucination risk.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Show/hide routing traces */}
          <button
            onClick={() => setShowTraces(v => !v)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border',
              showTraces ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            )}
          >
            <GitBranch size={15} />
            <span className="hidden sm:inline">{showTraces ? 'Hide Traces' : 'Show Traces'}</span>
          </button>

          {/* Reset chat */}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-sm font-bold text-slate-600 transition-all"
          >
            <RotateCcw size={14} />
            Reset Chat
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      {sidebarOpen ? (
        /* Sidebar open: phones on top, chips + input at bottom */
        <div className="flex flex-col gap-6 px-4">
          {/* 3 phones */}
          <div className="flex gap-11 items-start justify-center flex-wrap xl:flex-nowrap">
            {(['nlu', 'hybrid', 'rag'] as Engine[]).map(engine => (
              <PhoneColumn
                key={engine}
                engine={engine}
                state={{ nlu: nluState, hybrid: hybridState, rag: ragState }[engine]}
                showTraces={showTraces}
                onButtonClick={sendMessage}
              />
            ))}
          </div>

          {/* Bottom area: query chips (rows) + ask input */}
          <div className="flex gap-5 items-stretch">
            {/* Query chips — row layout */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Simple →</span>
                {SIMPLE_QUERIES.map(q => (
                  <button key={q} onClick={() => sendMessage(q)} disabled={isAnySending}
                    className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full px-3 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-[10px] font-medium text-amber-600 uppercase tracking-wide">Complex →</span>
                {COMPLEX_QUERIES.map(q => (
                  <button key={q} onClick={() => sendMessage(q)} disabled={isAnySending}
                    className="text-xs text-[#E3000F] bg-red-50 hover:bg-red-100 border border-red-200 rounded-full px-3 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-[10px] font-medium text-amber-600 uppercase tracking-wide">Edge: Hybrid ✓ · GenAI hallucinates ✗</span>
                {EDGE_1.map(q => (
                  <button key={q} onClick={() => sendMessage(q)} disabled={isAnySending}
                    className="text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-400 rounded-full px-3 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-[10px] font-medium text-rose-600 uppercase tracking-wide">Edge: Both Hybrid & GenAI hallucinate ✗</span>
                {EDGE_2.map(q => (
                  <button key={q} onClick={() => sendMessage(q)} disabled={isAnySending}
                    className="text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-full px-3 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Ask a question */}
            <form onSubmit={handleSend} className="flex flex-col gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 w-72 shrink-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ask a question</span>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                disabled={isAnySending}
                placeholder="Type your own query..."
                className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E3000F] transition-all disabled:opacity-50 resize-none"
              />
              <button
                type="submit"
                disabled={isAnySending || !input.trim()}
                className="w-full bg-[#E3000F] text-white py-2.5 rounded-xl hover:bg-red-700 transition-all shadow-md shadow-red-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold text-sm"
              >
                <Send size={14} />
                Send to all
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Sidebar collapsed: chips + input on left, phones on right */
        <div className="flex gap-5 items-start">
          {/* Left sidebar (sticky) */}
          <div className="w-96 shrink-0 sticky top-6 flex flex-col gap-3">
            {/* Quick chips */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Simple</span>
                {SIMPLE_QUERIES.map(q => (
                  <button key={q} onClick={() => sendMessage(q)} disabled={isAnySending}
                    className="text-left text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed leading-snug">
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Complex</span>
                {COMPLEX_QUERIES.map(q => (
                  <button key={q} onClick={() => sendMessage(q)} disabled={isAnySending}
                    className="text-left text-sm text-[#E3000F] bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed leading-snug">
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Edge case: Hybrid ✓ · GenAI hallucinates ✗</span>
                {EDGE_1.map(q => (
                  <button key={q} onClick={() => sendMessage(q)} disabled={isAnySending}
                    className="text-left text-sm text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed leading-snug">
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Edge case: Both Hybrid & GenAI hallucinate ✗</span>
                {EDGE_2.map(q => (
                  <button key={q} onClick={() => sendMessage(q)} disabled={isAnySending}
                    className="text-left text-sm text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed leading-snug">
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex flex-col gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={isAnySending}
                placeholder="Ask a question..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E3000F] transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isAnySending || !input.trim()}
                className="w-full bg-[#E3000F] text-white py-2 rounded-xl hover:bg-red-700 transition-all shadow-md shadow-red-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold text-sm"
              >
                <Send size={14} />
                Send to all
              </button>
            </form>
          </div>

          {/* 3 phones */}
          <div className="flex gap-8 items-start flex-1 justify-center flex-wrap xl:flex-nowrap">
            {(['nlu', 'hybrid', 'rag'] as Engine[]).map(engine => (
              <PhoneColumn
                key={engine}
                engine={engine}
                state={{ nlu: nluState, hybrid: hybridState, rag: ragState }[engine]}
                showTraces={showTraces}
                onButtonClick={sendMessage}
              />
            ))}
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}
