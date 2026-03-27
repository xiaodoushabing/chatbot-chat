import React, { useState, useRef } from 'react';
import { Upload, RefreshCw, Camera, Shuffle, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type LifestyleTier = 'aspirational' | 'balanced' | 'essential';

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
  bg: string;
  border: string;
  badge: string;
  products: string[];
  desc: string;
}> = {
  aspirational: {
    label: 'Aspirational',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border border-amber-300',
    products: ['OCBC Premier Banking', 'Wealth Advisory', 'Overseas Investment Fund'],
    desc: 'Luxury travel, fine dining & premium experiences',
  },
  balanced: {
    label: 'Balanced',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800 border border-blue-300',
    products: ['OCBC RoboInvest', 'CPF Investment Scheme', 'SRS Account'],
    desc: 'Family-oriented, moderate lifestyle & travel',
  },
  essential: {
    label: 'Essential',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-800 border border-green-300',
    products: ['OCBC 360 Account', 'CPF Voluntary Top-ups', 'Life Goals Savings'],
    desc: 'Minimalist, wellness & nature-focused living',
  },
};

// ─── Image pool (local copies in public/lifestyle-images/) ────────────────────

const _I = '/lifestyle-images/';
const ALL_IMAGES: PickerImage[] = [
  // Aspirational — luxury, premium (Unsplash)
  { id: 'asp1', url: `${_I}asp1.jpg`, tier: 'aspirational' },
  { id: 'asp2', url: `${_I}asp2.jpg`, tier: 'aspirational' },
  { id: 'asp3', url: `${_I}asp3.jpg`, tier: 'aspirational' },
  { id: 'asp4', url: `${_I}asp4.jpg`, tier: 'aspirational' },
  { id: 'asp5', url: `${_I}asp5.jpg`, tier: 'aspirational' },
  { id: 'asp6', url: `${_I}asp6.jpg`, tier: 'aspirational' },
  { id: 'asp7', url: `${_I}asp7.jpg`, tier: 'aspirational' },
  { id: 'asp8', url: `${_I}asp8.jpg`, tier: 'aspirational' },
  // Aspirational — Gemini
  { id: 'g_10cs', url: `${_I}Gemini_Generated_Image_10cs4h10cs4h10cs.png`, tier: 'aspirational' },
  { id: 'g_8rfx', url: `${_I}Gemini_Generated_Image_8rfxn18rfxn18rfx.png`, tier: 'aspirational' },
  { id: 'g_bfc3', url: `${_I}Gemini_Generated_Image_bfc3tsbfc3tsbfc3.png`, tier: 'aspirational' },
  { id: 'g_fbak', url: `${_I}Gemini_Generated_Image_fbak99fbak99fbak.png`, tier: 'aspirational' },
  { id: 'g_i5qw', url: `${_I}Gemini_Generated_Image_i5qwzwi5qwzwi5qw.png`, tier: 'aspirational' },
  { id: 'g_mucu', url: `${_I}Gemini_Generated_Image_mucupvmucupvmucu.png`, tier: 'aspirational' },
  { id: 'g_x0y6', url: `${_I}Gemini_Generated_Image_x0y6ekx0y6ekx0y6.png`, tier: 'aspirational' },
  { id: 'g_xlpf', url: `${_I}Gemini_Generated_Image_xlpftxxlpftxxlpf.png`, tier: 'aspirational' },
  // Balanced — family, travel, hobbies (Unsplash)
  { id: 'bal1', url: `${_I}bal1.jpg`, tier: 'balanced' },
  { id: 'bal2', url: `${_I}bal2.jpg`, tier: 'balanced' },
  { id: 'bal3', url: `${_I}bal3.jpg`, tier: 'balanced' },
  { id: 'bal4', url: `${_I}bal4.jpg`, tier: 'balanced' },
  { id: 'bal5', url: `${_I}bal5.jpg`, tier: 'balanced' },
  { id: 'bal6', url: `${_I}bal6.jpg`, tier: 'balanced' },
  { id: 'bal7', url: `${_I}bal7.jpg`, tier: 'balanced' },
  { id: 'bal8', url: `${_I}bal8.jpg`, tier: 'balanced' },
  // Balanced — Gemini
  { id: 'g_b01r', url: `${_I}Gemini_Generated_Image_b01r6xb01r6xb01r.png`, tier: 'balanced' },
  { id: 'g_ddyk', url: `${_I}Gemini_Generated_Image_ddykbxddykbxddyk.png`, tier: 'balanced' },
  { id: 'g_g3oc', url: `${_I}Gemini_Generated_Image_g3oc9ig3oc9ig3oc.png`, tier: 'balanced' },
  { id: 'g_j23o', url: `${_I}Gemini_Generated_Image_j23ozrj23ozrj23o.png`, tier: 'balanced' },
  { id: 'g_ny97', url: `${_I}Gemini_Generated_Image_ny976eny976eny97.png`, tier: 'balanced' },
  // Essential — wellness, nature, minimalist (Unsplash)
  { id: 'ess1', url: `${_I}ess1.jpg`, tier: 'essential' },
  { id: 'ess2', url: `${_I}ess2.jpg`, tier: 'essential' },
  { id: 'ess3', url: `${_I}ess3.jpg`, tier: 'essential' },
  { id: 'ess4', url: `${_I}ess4.jpg`, tier: 'essential' },
  { id: 'ess5', url: `${_I}ess5.jpg`, tier: 'essential' },
  { id: 'ess6', url: `${_I}ess6.jpg`, tier: 'essential' },
  { id: 'ess7', url: `${_I}ess7.jpg`, tier: 'essential' },
  { id: 'ess8', url: `${_I}ess8.jpg`, tier: 'essential' },
  // Essential — Gemini
  { id: 'g_23qi', url: `${_I}Gemini_Generated_Image_23qiyt23qiyt23qi.png`, tier: 'essential' },
  { id: 'g_44at', url: `${_I}Gemini_Generated_Image_44at5244at5244at.png`, tier: 'essential' },
  { id: 'g_7cdy', url: `${_I}Gemini_Generated_Image_7cdyd77cdyd77cdy.png`, tier: 'essential' },
  { id: 'g_clcr', url: `${_I}Gemini_Generated_Image_clcrarclcrarclcr.png`, tier: 'essential' },
];

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

// Pick 2 from each tier at random (6 total), then shuffle — mirrors Flask logic
function getPickerSet(): PickerImage[] {
  const pick = (tier: LifestyleTier) => {
    const pool = ALL_IMAGES.filter(i => i.tier === tier);
    const shuffled = shuffleArray(pool);
    return shuffled.slice(0, 2);
  };
  return shuffleArray([...pick('aspirational'), ...pick('balanced'), ...pick('essential')]);
}

function getMajorityTier(selected: PickerImage[]): LifestyleTier {
  const counts: Record<LifestyleTier, number> = { aspirational: 0, balanced: 0, essential: 0 };
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
        <p className="text-xs text-slate-700 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

function PhoneShell({ headerLabel, children }: { headerLabel: string; children: React.ReactNode }) {
  return (
    <div className="relative w-[300px] bg-black rounded-[44px] p-[3px] shadow-2xl" style={{ height: 570 }}>
      <div className="w-full h-full bg-[#F2F2F7] rounded-[42px] overflow-hidden flex flex-col">
        {/* Dynamic island */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-16 h-5 bg-black rounded-full" />
        </div>
        {/* Header bar */}
        <div className="bg-slate-800 px-4 py-2.5 shrink-0 flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <Camera size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shrink-0" />
            <span className="text-white text-sm font-semibold truncate">{headerLabel}</span>
          </div>
        </div>
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}

function TierResultCard({ result, onReset }: { result: TierResult; onReset: () => void }) {
  const cfg = TIER_CONFIG[result.tier];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('m-3 rounded-2xl border p-3', cfg.bg, cfg.border)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn('text-xs font-bold px-2.5 py-0.5 rounded-full', cfg.badge)}>
          {cfg.label}
        </span>
        <button onClick={onReset} className="text-slate-400 hover:text-slate-600 transition-colors">
          <RefreshCw size={12} />
        </button>
      </div>
      <p className="text-xs text-slate-600 mb-2 leading-relaxed">{result.reasoning}</p>
      <p className={cn('text-xs font-medium leading-relaxed mb-2', cfg.color)}>{result.advice}</p>
      <div className="flex flex-col gap-1">
        {result.tier && TIER_CONFIG[result.tier].products.map(p => (
          <span key={p} className="text-[11px] bg-white/70 border border-slate-200 rounded-lg px-2 py-0.5 text-slate-600">
            → {p}
          </span>
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
    <div className="w-[260px] bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
      <div>
        <p className="text-base font-bold text-slate-900">{title}</p>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => (
          <span key={t.text} className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full border', t.style)}>
            {t.text}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-1.5 text-sm">
        {pros.map(p => (
          <div key={p} className="flex items-start gap-1.5 text-green-700 leading-snug">
            <span className="shrink-0 font-bold">+</span>
            <span>{p}</span>
          </div>
        ))}
        {cons.map(c => (
          <div key={c} className="flex items-start gap-1.5 text-red-600 leading-snug">
            <span className="shrink-0 font-bold">−</span>
            <span>{c}</span>
          </div>
        ))}
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
          <span className="text-[11px] font-bold text-[#E3000F] tracking-wide">Analysing</span>
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

// ─── Left phone: AI Vision Upload ──────────────────────────────────────────────

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

  return (
    <PhoneShell headerLabel="Upload and Analyse">
      <div ref={bodyRef} className="flex flex-col h-full overflow-y-auto">
        <WelcomeBubble message="Hi! Upload a photo that reflects your ideal retirement — a dream holiday, favourite activity, or everyday moment — and I'll identify your lifestyle profile." />

        {/* Upload zone — hidden once image is picked */}
        {!preview && (
          <div className="flex flex-col items-center justify-center flex-1 px-4 py-4 gap-3">
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all gap-3 min-h-[200px]"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                <Upload size={20} className="text-slate-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">Upload a lifestyle photo</p>
                <p className="text-sm text-slate-400 mt-1">Drag & drop or tap to browse</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              Claude's vision model will analyse your image and suggest your retirement lifestyle tier
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        )}

        {/* User image bubble */}
        {preview && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex justify-end px-3 py-2">
            <div className="relative rounded-2xl rounded-br-sm overflow-hidden max-w-[180px] shadow-sm">
              <img src={preview} alt="Your upload" className="w-full h-auto max-h-[140px] object-cover block" />
              {!loading && !result && (
                <button onClick={handleReset}
                  className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white">
                  <RefreshCw size={10} />
                </button>
              )}
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
              <TierResultCard result={result} onReset={handleReset} />
            </motion.div>
          )}
          {error && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mx-3 my-1 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-[11px] text-red-600">{error}</p>
              <button onClick={handleReset} className="text-[10px] text-red-500 underline mt-1">Try again</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom padding */}
        <div className="h-3 shrink-0" />
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
    </PhoneShell>
  );
}

// ─── Right phone: Visual Image Picker ─────────────────────────────────────────

const MAX_REFRESHES = 5;

function ImagePickerPhone() {
  const [pickerSet, setPickerSet] = useState(() => getPickerSet());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<TierResult | null>(null);
  const [refreshesLeft, setRefreshesLeft] = useState(MAX_REFRESHES);

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
    setPickerSet(getPickerSet());
    setSelected(new Set());
    setRefreshesLeft(r => r - 1);
  };

  const handleDiscover = () => {
    if (selected.size === 0) return;
    const selectedImages = pickerSet.filter(img => selected.has(img.id));
    const tier = getMajorityTier(selectedImages);
    const cfg = TIER_CONFIG[tier];
    setResult({
      tier,
      reasoning: `Based on ${selected.size} image${selected.size > 1 ? 's' : ''} you selected, your retirement style leans ${tier}. ${cfg.desc}.`,
      advice: `We recommend building your retirement plan around ${cfg.products[0]} and ${cfg.products[1]} to support your ${tier} lifestyle goals. Our advisors can help you map out a personalised CPF and investment strategy.`,
    });
  };

  const handleReset = () => {
    setSelected(new Set());
    setResult(null);
    setPickerSet(getPickerSet());
    setRefreshesLeft(MAX_REFRESHES);
  };

  // 2-column masonry: 6 images, alternating heights for visual interest
  const cols: PickerImage[][] = [[], []];
  pickerSet.forEach((img, i) => cols[i % 2].push(img));
  const heights = ['h-28', 'h-24', 'h-32', 'h-24', 'h-28', 'h-32'];

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
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                title={refreshesLeft === 0 ? 'No refreshes left' : `${refreshesLeft} refresh${refreshesLeft !== 1 ? 'es' : ''} left`}
              >
                <RefreshCw size={13} className="text-slate-600" />
                <span className="text-[11px] font-bold text-slate-600">{refreshesLeft}</span>
              </button>
            </div>
            {/* Masonry grid */}
            <AnimatePresence mode="wait">
              <motion.div
                key={pickerSet.map(i => i.id).join('-')}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex gap-0.5 px-0.5 flex-1 min-h-0"
              >
                {cols.map((col, ci) => (
                  <div key={ci} className="flex flex-col gap-0.5 flex-1">
                    {col.map((img, ri) => {
                      const hClass = heights[ci === 0 ? ri : ri + 3] ?? 'h-24';
                      const isSelected = selected.has(img.id);
                      return (
                        <button
                          key={img.id}
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
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#E3000F]/20 flex items-center justify-center">
                              <CheckCircle2 size={18} className="text-white drop-shadow" />
                            </div>
                          )}
                        </button>
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
                className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Shuffle size={14} />
                Discover My Style
                {selected.size > 0 && <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px]">{selected.size}</span>}
              </button>
            </div>
          </>
        ) : (
          <TierResultCard result={result} onReset={handleReset} />
        )}
      </div>
    </PhoneShell>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function LifestyleDiscovery() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Lifestyle Discovery</h2>
        <p className="text-slate-500 mt-2 text-base max-w-2xl">
          Compare two approaches to understanding a customer's retirement lifestyle — letting them upload a personal photo for AI analysis, versus guiding them through a curated visual selection.
        </p>
      </div>

      {/* Phones + info cards */}
      <div className="flex gap-12 justify-center flex-wrap xl:flex-nowrap">
        {/* Left group: Vision Upload phone + card, bottom-aligned */}
        <div className="flex items-end gap-5">
          <VisionUploadPhone />
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

        {/* Right group: Image Picker phone + card, bottom-aligned */}
        <div className="flex items-end gap-5">
          <ImagePickerPhone />
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
      </div>
    </div>
  );
}
