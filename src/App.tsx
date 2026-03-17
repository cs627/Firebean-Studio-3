import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Copy, Check, Download, Upload, X, ChevronDown, Sparkles, ScanSearch, Smartphone } from 'lucide-react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Cone, Cylinder, Sphere, Grid } from '@react-three/drei';
import { analyzeImage, generateVisual, generateSocialMockup, SOCIAL_MODES, type SocialMode } from './services/geminiService';
import contactBg from '/contact-bg.webp';
import firebeanLogo from '/Firebeanlogo2026.png';

// ─── 3D Monster ──────────────────────────────────────────────────────────────
function Monster() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[2, 2, 1.5]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.3} roughness={0.5} />
      </mesh>
      <Cone args={[0.5, 1, 4]} position={[0.6, 1.5, 0]}>
        <meshStandardMaterial color="#d8d8d8" metalness={0.3} roughness={0.5} />
      </Cone>
      <Cone args={[0.5, 1, 4]} position={[-0.6, 1.5, 0]}>
        <meshStandardMaterial color="#d8d8d8" metalness={0.3} roughness={0.5} />
      </Cone>
      <Sphere args={[0.35]} position={[-0.5, 0.2, 0.8]}>
        <meshStandardMaterial color="#ffffff" />
      </Sphere>
      <Sphere args={[0.35]} position={[0.5, 0.2, 0.8]}>
        <meshStandardMaterial color="#ffffff" />
      </Sphere>
      <Sphere args={[0.15]} position={[-0.5, 0.2, 1.1]}>
        <meshStandardMaterial color="#333" />
      </Sphere>
      <Sphere args={[0.15]} position={[0.5, 0.2, 1.1]}>
        <meshStandardMaterial color="#333" />
      </Sphere>
      <Cylinder args={[0.6, 0.8, 0.3, 8]} position={[0, -1.15, 0]}>
        <meshStandardMaterial color="#d0d0d0" metalness={0.3} roughness={0.5} />
      </Cylinder>
    </group>
  );
}

function CameraTracker({ onUpdate }: { onUpdate: (rot: [number, number], dist: number) => void }) {
  useThree(({ camera }) => {
    const pos = camera.position;
    const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
    const rotX = Math.atan2(pos.y, Math.sqrt(pos.x ** 2 + pos.z ** 2)) * (180 / Math.PI);
    const rotY = Math.atan2(pos.x, pos.z) * (180 / Math.PI);
    onUpdate([rotX, rotY], dist);
  });
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getCameraDescription(rot: [number, number], dist: number): string {
  const [pitch, yaw] = rot;
  let vertical: string;
  if (pitch > 60) vertical = "Bird's Eye";
  else if (pitch > 40) vertical = 'High Angle';
  else if (pitch > 20) vertical = 'Slight High Angle';
  else if (pitch > -5) vertical = 'Eye Level';
  else if (pitch > -20) vertical = 'Slight Low Angle';
  else if (pitch > -40) vertical = 'Low Angle';
  else vertical = "Worm's Eye";

  let distance: string;
  if (dist < 2.5) distance = 'Extreme Close-Up';
  else if (dist < 4) distance = 'Close-Up';
  else if (dist < 6) distance = 'Medium Close-Up';
  else if (dist < 8) distance = 'Medium Shot';
  else if (dist < 10) distance = 'Medium Wide';
  else distance = 'Wide Shot';

  const absYaw = Math.abs(yaw);
  let direction = '';
  if (absYaw > 150) direction = ' · Rear';
  else if (absYaw > 110) direction = ' · 3/4 Rear';
  else if (absYaw > 60) direction = ' · Side Profile';
  else if (absYaw > 25) direction = ' · 3/4 Front';

  return `${vertical} · ${distance}${direction}`;
}

// ─── Copy Button ─────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-red-600/80 border border-white/10 text-xs text-white/70 hover:text-white transition-all duration-200"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// ─── Ref Photo Thumbnail ──────────────────────────────────────────────────────
function RefPhotoThumb({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <div className="relative group w-16 h-16 rounded-lg overflow-hidden border border-white/20 flex-shrink-0">
      <img src={src} alt="ref" className="w-full h-full object-cover" />
      <button
        onClick={onRemove}
        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
      >
        <X className="w-4 h-4 text-white" />
      </button>
    </div>
  );
}

// ─── Select Dropdown ─────────────────────────────────────────────────────────
function Select({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl pr-8 focus:outline-none focus:border-red-500/60 cursor-pointer"
        >
          {options.map(o => (
            <option key={o.value} value={o.value} className="bg-zinc-900">{o.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
      </div>
    </div>
  );
}

// ─── Screenshot Thumbnail (Social Dummy) ─────────────────────────────────────
function ScreenshotThumb({ src, index, onRemove }: { src: string; index: number; onRemove: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.2 }}
      className="relative group rounded-xl overflow-hidden border border-white/20 bg-white/5 flex-shrink-0"
      style={{ width: '90px', aspectRatio: '9/16' }}
    >
      <img src={src} alt={`Screenshot ${index + 1}`} className="w-full h-full object-cover" />
      <div className="absolute top-1.5 left-1.5 bg-black/70 text-white/70 text-xs px-1.5 py-0.5 rounded-full font-mono leading-none">
        #{index + 1}
      </div>
      <button
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 transition opacity-0 group-hover:opacity-100"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<'Generate' | 'Analyze' | 'SocialDummy'>('Generate');

  // ── Generate Tab State ──
  const [prompt, setPrompt] = useState('');
  const [refPhotos, setRefPhotos] = useState<string[]>([]);
  const [style, setStyle] = useState('cinematic');
  const [resolution, setResolution] = useState('2K');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [cameraRot, setCameraRot] = useState<[number, number]>([15, 0]);
  const [cameraDist, setCameraDist] = useState(5);
  const [genResults, setGenResults] = useState<string[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const addLog = (msg: string) => setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()} ${msg}`]);
  const refDropRef = useRef<HTMLDivElement>(null);

  // ── Analyze Tab State ──
  const [photoToAnalyze, setPhotoToAnalyze] = useState<string | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [promptJson, setPromptJson] = useState('');
  const [promptEn, setPromptEn] = useState('');
  const [promptZh, setPromptZh] = useState('');
  const analyzeDropRef = useRef<HTMLDivElement>(null);

  // ── Social Media Dummy Tab State ──
  const [socialScreenshots, setSocialScreenshots] = useState<string[]>([]);
  const [socialMode, setSocialMode] = useState<SocialMode>('lifestyle');
  const [socialUserInput, setSocialUserInput] = useState('');
  const [socialResults, setSocialResults] = useState<string[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError] = useState('');
  const [socialProgress, setSocialProgress] = useState(0);
  const socialDropRef = useRef<HTMLDivElement>(null);

  // ── Ref Photo Upload ──
  const handleRefDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    files.slice(0, 5 - refPhotos.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setRefPhotos(prev => prev.length < 5 ? [...prev, ev.target!.result as string] : prev);
      };
      reader.readAsDataURL(file);
    });
  }, [refPhotos]);

  const handleRefFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    files.slice(0, 5 - refPhotos.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setRefPhotos(prev => prev.length < 5 ? [...prev, ev.target!.result as string] : prev);
      };
      reader.readAsDataURL(file);
    });
  };

  // ── Analyze Photo Upload ──
  const handleAnalyzeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => setPhotoToAnalyze(ev.target!.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAnalyzeFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setPhotoToAnalyze(ev.target!.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ── Social Screenshot Upload ──
  const handleSocialDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    files.slice(0, 3 - socialScreenshots.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setSocialScreenshots(prev => prev.length < 3 ? [...prev, ev.target!.result as string] : prev);
      };
      reader.readAsDataURL(file);
    });
  }, [socialScreenshots]);

  const handleSocialFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    files.slice(0, 3 - socialScreenshots.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setSocialScreenshots(prev => prev.length < 3 ? [...prev, ev.target!.result as string] : prev);
      };
      reader.readAsDataURL(file);
    });
  };

  // ── Generate ──
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenLoading(true);
    setGenError('');
    setGenResults([]);
    try {
      const cameraDesc = getCameraDescription(cameraRot, cameraDist);
      const fullPrompt = `${prompt}. Camera: ${cameraDesc}. Style: ${style}. Resolution: ${resolution}. Aspect ratio: ${aspectRatio}.`;
      setDebugLog([]);
      addLog('Generate started...');
      const results = await generateVisual(fullPrompt, refPhotos, addLog);
      setGenResults(results);
    } catch (err: any) {
      setGenError(err.message || 'Generation failed. Please try again.');
    } finally {
      setGenLoading(false);
    }
  };

  // ── Analyze ──
  const handleAnalyze = async () => {
    if (!photoToAnalyze) return;
    setAnalyzeLoading(true);
    setAnalyzeError('');
    setPromptJson('');
    setPromptEn('');
    setPromptZh('');
    try {
      setDebugLog([]);
      addLog('Analysis started...');
      const result = await analyzeImage(photoToAnalyze, addLog);
      setPromptJson(result.json);
      setPromptEn(result.en);
      setPromptZh(result.zh);
    } catch (err: any) {
      setAnalyzeError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzeLoading(false);
    }
  };

  // ── Social Media Dummy Generate ──
  const handleSocialGenerate = async () => {
    setSocialLoading(true);
    setSocialError('');
    setSocialResults([]);
    setSocialProgress(0);
    try {
      setDebugLog([]);
      addLog('Social Media Dummy generation started...');
      const progressLogger = (msg: string) => {
        addLog(msg);
        if (msg.includes('✓ Mockup')) {
          setSocialProgress(prev => prev + 1);
        }
      };
      const results = await generateSocialMockup(socialMode, socialUserInput, socialScreenshots, progressLogger);
      setSocialResults(results);
      setSocialProgress(4);
    } catch (err: any) {
      setSocialError(err.message || 'Mockup generation failed. Please try again.');
    } finally {
      setSocialLoading(false);
    }
  };

  const downloadImage = (url: string, index: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `firebean-studio-${index + 1}.png`;
    a.click();
  };

  const STYLES = [
    { value: 'cinematic', label: '🎬 Cinematic' },
    { value: 'editorial', label: '📸 Editorial' },
    { value: 'studio', label: '💡 Studio Lighting' },
    { value: 'outdoor', label: '🌿 Natural Outdoor' },
    { value: 'neon', label: '🌆 Neon Noir' },
    { value: 'fashion', label: '👗 High Fashion' },
    { value: 'documentary', label: '🎞 Documentary' },
    { value: 'fantasy', label: '✨ Fantasy' },
  ];

  const RESOLUTIONS = [
    { value: '2K', label: '2K (2048×1080)' },
    { value: '4K', label: '4K (3840×2160)' },
  ];

  const ASPECT_RATIOS = [
    { value: '16:9', label: '16:9 — Landscape' },
    { value: '9:16', label: '9:16 — Portrait' },
    { value: '1:1', label: '1:1 — Square' },
    { value: '4:3', label: '4:3 — Classic' },
    { value: '21:9', label: '21:9 — Ultrawide' },
  ];

  const currentMode = SOCIAL_MODES.find(m => m.id === socialMode)!;

  const MODE_DESCRIPTIONS: Record<SocialMode, string> = {
    creative: 'Aesthetic workspace flat lay with art supplies, color swatches & monstera shadows. Perfect for design portfolios and creative brands.',
    keynote: 'Massive boardroom screen with professional audience silhouettes. Ideal for B2B, annual reports & corporate authority.',
    product: 'Clean product photography with premium packaging & pastel backgrounds. Best for e-commerce, beauty & tech launches.',
    lifestyle: 'Cozy home environment with warm lamp light & soft textures. Great for wellness apps, streaming & home lifestyle.',
    urban: 'Night city crosswalk with neon reflections & motion blur. Perfect for delivery apps, events & youth culture brands.',
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${contactBg})` }}
    >
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* ── Header ── */}
          <header className="flex items-center justify-between mb-10 bg-black/75 border border-white/10 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center">
                <img src={firebeanLogo} alt="Firebean" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight leading-none">FIREBEAN STUDIO</h1>
                <p className="text-xs text-red-500 font-semibold tracking-[0.2em] uppercase">Visual AI · Version 3</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-white/30 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              Gemini 2.5 Flash · Free Tier
            </div>
          </header>

          {/* ── Tab Navigation ── */}
          <div className="flex gap-1 p-1 bg-black/75 border border-white/10 rounded-2xl mb-8 w-fit">
            {(['Generate', 'Analyze', 'SocialDummy'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === tab
                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/50'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab === 'Generate' && <Sparkles className="w-4 h-4" />}
                {tab === 'Analyze' && <ScanSearch className="w-4 h-4" />}
                {tab === 'SocialDummy' && <Smartphone className="w-4 h-4" />}
                <span>
                  {tab === 'Generate' ? 'Generate Visual' : tab === 'Analyze' ? 'Analyze Photo' : 'Social Dummy'}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ══════════════════════════════════════════════════════════════
                TAB 1 — GENERATE VISUAL
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'Generate' && (
              <motion.div
                key="generate"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-5 gap-6"
              >
                {/* Left Panel — Controls */}
                <div className="lg:col-span-2 space-y-5">
                  <div className="bg-black/75 border border-white/15 rounded-2xl p-5">
                    <label className="block text-xs text-white/60 uppercase tracking-widest mb-2">Prompt</label>
                    <textarea
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      placeholder="Describe your vision... e.g. A woman in red dress standing in a misty forest at golden hour"
                      rows={4}
                      className="w-full bg-transparent text-white text-sm placeholder-white/30 resize-none focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div className="bg-black/75 border border-white/15 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs text-white/60 uppercase tracking-widest">Reference Photos</label>
                      <span className="text-xs text-white/30 font-mono">{refPhotos.length}/5</span>
                    </div>
                    {refPhotos.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-3">
                        {refPhotos.map((src, i) => (
                          <RefPhotoThumb key={i} src={src} onRemove={() => setRefPhotos(p => p.filter((_, j) => j !== i))} />
                        ))}
                      </div>
                    )}
                    {refPhotos.length < 5 && (
                      <div
                        ref={refDropRef}
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleRefDrop}
                        className="border border-dashed border-white/15 rounded-xl p-4 text-center cursor-pointer hover:border-red-500/50 hover:bg-red-500/5 transition-all group"
                        onClick={() => document.getElementById('ref-input')?.click()}
                      >
                        <Upload className="w-5 h-5 text-white/20 group-hover:text-red-400 mx-auto mb-1.5 transition" />
                        <p className="text-xs text-white/50 group-hover:text-white/80 transition">Drop photos or click to upload</p>
                        <input id="ref-input" type="file" accept="image/*" multiple className="hidden" onChange={handleRefFileInput} />
                      </div>
                    )}
                  </div>

                  <div className="bg-black/75 border border-white/15 rounded-2xl p-5 space-y-4">
                    <Select label="Visual Style" value={style} options={STYLES} onChange={setStyle} />
                    <div className="grid grid-cols-2 gap-3">
                      <Select label="Resolution" value={resolution} options={RESOLUTIONS} onChange={setResolution} />
                      <Select label="Aspect Ratio" value={aspectRatio} options={ASPECT_RATIOS} onChange={setAspectRatio} />
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleGenerate}
                    disabled={genLoading || !prompt.trim()}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:bg-white/10 disabled:text-white/30 text-white font-bold text-sm rounded-2xl shadow-lg shadow-red-900/40 transition-all flex items-center justify-center gap-2"
                  >
                    {genLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating 4 visuals...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate 4 Visuals
                      </>
                    )}
                  </motion.button>

                  {genError && (
                    <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-300">{genError}</div>
                  )}
                </div>

                {/* Right Panel — Camera + Results */}
                <div className="lg:col-span-3 space-y-5">
                  <div className="bg-black/75 border border-white/15 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 pt-4 pb-2">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-red-400" />
                        <span className="text-xs text-white/60 font-semibold uppercase tracking-widest">Camera Angle</span>
                      </div>
                      <span className="text-xs text-white/40 font-mono bg-white/5 px-2.5 py-1 rounded-full">
                        {getCameraDescription(cameraRot, cameraDist)}
                      </span>
                    </div>
                    <div className="h-52 w-full bg-black/80">
                      <Canvas camera={{ position: [0, 2, 5] }}>
                        <ambientLight intensity={0.4} />
                        <pointLight position={[10, 10, 10]} intensity={1.2} />
                        <pointLight position={[-10, -5, -5]} intensity={0.3} color="#ff3333" />
                        <Monster />
                        <Grid infiniteGrid fadeDistance={30} cellColor="#ff3333" sectionColor="#ff5555" />
                        <OrbitControls enablePan={false} minDistance={2} maxDistance={12} />
                        <CameraTracker onUpdate={(rot, dist) => { setCameraRot(rot); setCameraDist(dist); }} />
                      </Canvas>
                    </div>
                    <p className="text-xs text-white/20 text-center pb-3">Drag to rotate · Scroll to zoom</p>
                  </div>

                  {genResults.length > 0 ? (
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Generated Visuals — Click to download</p>
                      <div className="grid grid-cols-2 gap-3">
                        {genResults.map((url, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="relative group rounded-xl overflow-hidden border border-white/10 aspect-video bg-white/5"
                          >
                            <img src={url} alt={`Result ${i + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <button
                                onClick={() => downloadImage(url, i)}
                                className="flex items-center gap-2 bg-white text-black text-xs font-bold px-4 py-2 rounded-full hover:bg-red-500 hover:text-white transition"
                              >
                                <Download className="w-3.5 h-3.5" /> Download
                              </button>
                            </div>
                            <div className="absolute top-2 left-2 bg-black/60 text-white/60 text-xs px-2 py-0.5 rounded-full font-mono">
                              #{i + 1}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black/70 border border-dashed border-white/15 rounded-2xl h-48 flex flex-col items-center justify-center text-center">
                      <Sparkles className="w-8 h-8 text-white/10 mb-3" />
                      <p className="text-sm text-white/20">Your 4 generated visuals will appear here</p>
                      <p className="text-xs text-white/10 mt-1">Enter a prompt and hit Generate</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 2 — ANALYZE PHOTO
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'Analyze' && (
              <motion.div
                key="analyze"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-5 gap-6"
              >
                <div className="lg:col-span-2 space-y-5">
                  <div className="bg-black/75 border border-white/15 rounded-2xl p-5">
                    <label className="block text-xs text-white/60 uppercase tracking-widest mb-3">Drop Photo for Analysis</label>
                    {photoToAnalyze ? (
                      <div className="relative rounded-xl overflow-hidden">
                        <img src={photoToAnalyze} alt="To analyze" className="w-full rounded-xl object-cover max-h-72" />
                        <button
                          onClick={() => { setPhotoToAnalyze(null); setPromptJson(''); setPromptEn(''); setPromptZh(''); }}
                          className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 text-white rounded-full p-1.5 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        ref={analyzeDropRef}
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleAnalyzeDrop}
                        className="border-2 border-dashed border-white/15 rounded-xl p-10 text-center cursor-pointer hover:border-red-500/50 hover:bg-red-500/5 transition-all group"
                        onClick={() => document.getElementById('analyze-input')?.click()}
                      >
                        <ScanSearch className="w-8 h-8 text-white/15 group-hover:text-red-400 mx-auto mb-3 transition" />
                        <p className="text-sm text-white/25 group-hover:text-white/50 transition">Drag & drop a photo here</p>
                        <p className="text-xs text-white/15 mt-1">or click to browse</p>
                        <input id="analyze-input" type="file" accept="image/*" className="hidden" onChange={handleAnalyzeFileInput} />
                      </div>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAnalyze}
                    disabled={analyzeLoading || !photoToAnalyze}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:bg-white/10 disabled:text-white/30 text-white font-bold text-sm rounded-2xl shadow-lg shadow-red-900/40 transition-all flex items-center justify-center gap-2"
                  >
                    {analyzeLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analyzing photo...
                      </>
                    ) : (
                      <>
                        <ScanSearch className="w-4 h-4" />
                        Analyze &amp; Generate Prompts
                      </>
                    )}
                  </motion.button>

                  {analyzeError && (
                    <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-300">{analyzeError}</div>
                  )}
                </div>

                <div className="lg:col-span-3 space-y-4">
                  {[
                    { key: 'json', label: 'JSON Format', value: promptJson, icon: '{ }' },
                    { key: 'en', label: 'English Prompt — Detailed', value: promptEn, icon: 'EN' },
                    { key: 'zh', label: 'Chinese Prompt — 中文', value: promptZh, icon: '中' },
                  ].map(box => (
                    <div key={box.key} className="bg-black/75 border border-white/15 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold flex items-center justify-center">
                            {box.icon}
                          </span>
                          <span className="text-sm font-semibold text-white/90">{box.label}</span>
                        </div>
                        {box.value && <CopyButton text={box.value} />}
                      </div>
                      {box.value ? (
                        <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
                          {box.value}
                        </pre>
                      ) : (
                        <div className="h-24 flex items-center justify-center">
                          {analyzeLoading ? (
                            <div className="flex items-center gap-2 text-xs text-white/30">
                              <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-red-500 rounded-full animate-spin" />
                              Generating {box.label.split(' ')[0]}...
                            </div>
                          ) : (
                            <p className="text-xs text-white/15">Prompt will appear here after analysis</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 3 — SOCIAL MEDIA DUMMY
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'SocialDummy' && (
              <motion.div
                key="social"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-5 gap-6"
              >
                {/* ── Left Panel ── */}
                <div className="lg:col-span-2 space-y-5">

                  {/* Intro Card */}
                  <div className="bg-black/75 border border-white/15 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                        <Smartphone className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-white leading-tight">Social Media Dummy</h2>
                        <p className="text-xs text-white/35">AI-powered lifestyle mockup generator</p>
                      </div>
                    </div>
                    <p className="text-xs text-white/30 leading-relaxed">
                      Upload up to <span className="text-white/50">3 social media screenshots</span>, choose a <span className="text-white/50">scene mode</span>, add your creative twist — AI generates <span className="text-white/50">4 photorealistic PR mockups</span> ready for campaigns.
                    </p>
                  </div>

                  {/* Screenshot Upload */}
                  <div className="bg-black/75 border border-white/15 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs text-white/60 uppercase tracking-widest">Social Screenshots</label>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
                        socialScreenshots.length >= 3
                          ? 'bg-red-600/15 text-red-400 border-red-500/30'
                          : 'text-white/30 border-transparent'
                      }`}>
                        {socialScreenshots.length}/3
                      </span>
                    </div>

                    {socialScreenshots.length > 0 && (
                      <div className="flex gap-2.5 mb-3 flex-wrap">
                        <AnimatePresence>
                          {socialScreenshots.map((src, i) => (
                            <ScreenshotThumb
                              key={i}
                              src={src}
                              index={i}
                              onRemove={() => setSocialScreenshots(p => p.filter((_, j) => j !== i))}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}

                    {socialScreenshots.length < 3 ? (
                      <div
                        ref={socialDropRef}
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleSocialDrop}
                        className="border-2 border-dashed border-white/15 rounded-xl p-5 text-center cursor-pointer hover:border-red-500/50 hover:bg-red-500/5 transition-all group"
                        onClick={() => document.getElementById('social-input')?.click()}
                      >
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <Smartphone className="w-5 h-5 text-white/15 group-hover:text-red-400 transition" />
                          <Upload className="w-3.5 h-3.5 text-white/10 group-hover:text-red-300 transition" />
                        </div>
                        <p className="text-sm text-white/25 group-hover:text-white/50 transition">Drag & drop screenshots</p>
                        <p className="text-xs text-white/15 mt-0.5">
                          {3 - socialScreenshots.length} slot{3 - socialScreenshots.length !== 1 ? 's' : ''} left · or click to browse
                        </p>
                        <input
                          id="social-input"
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleSocialFileInput}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-center text-red-400/60 mt-1">Max 3 screenshots reached</p>
                    )}
                  </div>

                  {/* Scene Mode Selector */}
                  <div className="bg-black/75 border border-white/15 rounded-2xl p-5">
                    <label className="block text-xs text-white/60 uppercase tracking-widest mb-3">Scene Mode</label>
                    <div className="space-y-2">
                      {SOCIAL_MODES.map(mode => (
                        <button
                          key={mode.id}
                          onClick={() => { setSocialMode(mode.id); setSocialUserInput(''); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 border ${
                            socialMode === mode.id
                              ? 'bg-red-600/15 border-red-500/40 text-white'
                              : 'bg-white/3 border-white/8 text-white/50 hover:border-white/20 hover:text-white/80 hover:bg-white/5'
                          }`}
                        >
                          <span className="text-xl leading-none w-7 text-center flex-shrink-0">{mode.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-semibold">{mode.label}</span>
                              <span className={`text-xs ${socialMode === mode.id ? 'text-red-300/80' : 'text-white/25'}`}>
                                {mode.labelZh}
                              </span>
                            </div>
                            <p className={`text-xs mt-0.5 truncate ${socialMode === mode.id ? 'text-white/40' : 'text-white/20'}`}>
                              {mode.tagline}
                            </p>
                          </div>
                          {socialMode === mode.id && (
                            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Creative Twist Input */}
                  <div className="bg-black/75 border border-white/15 rounded-2xl p-5">
                    <label className="block text-xs text-white/60 uppercase tracking-widest mb-1">
                      Creative Twist
                      <span className="ml-2 text-white/20 normal-case tracking-normal font-normal">(optional)</span>
                    </label>
                    <p className="text-xs text-white/25 mb-3 leading-relaxed">
                      Add a unique scene element — AI weaves it into the <span className="text-white/40">{currentMode.labelZh}</span> atmosphere.
                    </p>
                    <textarea
                      value={socialUserInput}
                      onChange={e => setSocialUserInput(e.target.value)}
                      placeholder={currentMode.placeholder}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 resize-none focus:outline-none focus:border-red-500/40 leading-relaxed rounded-xl px-4 py-3 transition"
                    />
                  </div>

                  {/* Generate Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSocialGenerate}
                    disabled={socialLoading}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:bg-white/10 disabled:text-white/30 text-white font-bold text-sm rounded-2xl shadow-lg shadow-red-900/40 transition-all flex items-center justify-center gap-2"
                  >
                    {socialLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating mockup {socialProgress}/4...
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4" />
                        Generate 4 Mockups
                      </>
                    )}
                  </motion.button>

                  {/* Progress Bar */}
                  {socialLoading && (
                    <div className="bg-black/50 border border-white/10 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/35">Crafting {currentMode.labelZh} mockups...</span>
                        <span className="text-xs text-red-400 font-mono">{socialProgress}/4</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                          initial={{ width: '5%' }}
                          animate={{ width: `${Math.max(5, (socialProgress / 4) * 100)}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  )}

                  {socialError && (
                    <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-300">{socialError}</div>
                  )}
                </div>

                {/* ── Right Panel ── */}
                <div className="lg:col-span-3 space-y-5">

                  {/* Active Mode Info */}
                  <div className="bg-black/75 border border-white/15 rounded-2xl p-5">
                    <div className="flex items-start gap-4">
                      <span className="text-4xl leading-none mt-0.5 flex-shrink-0">{currentMode.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-base font-bold text-white">{currentMode.label} Mode</h3>
                          <span className="text-xs text-red-300 bg-red-600/15 border border-red-500/20 px-2 py-0.5 rounded-full">{currentMode.labelZh}</span>
                          <span className="text-xs text-white/25 italic">{currentMode.tagline}</span>
                        </div>
                        <p className="text-xs text-white/40 leading-relaxed mb-2">
                          {MODE_DESCRIPTIONS[socialMode]}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-white/20 uppercase tracking-wider">Best for:</span>
                          <span className="text-xs text-white/35">{currentMode.useCases}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Results Grid */}
                  {socialResults.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-white/40 uppercase tracking-widest">Generated Mockups — Hover to download</p>
                        <span className="text-xs text-red-400 font-mono bg-red-600/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                          {currentMode.emoji} {currentMode.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {socialResults.map((url, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.12 }}
                            className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/5"
                            style={{ aspectRatio: '4/5' }}
                          >
                            <img src={url} alt={`Mockup ${i + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <button
                                onClick={() => downloadImage(url, i)}
                                className="flex items-center gap-2 bg-white text-black text-xs font-bold px-4 py-2 rounded-full hover:bg-red-500 hover:text-white transition"
                              >
                                <Download className="w-3.5 h-3.5" /> Download
                              </button>
                            </div>
                            <div className="absolute top-2 left-2 bg-black/60 text-white/60 text-xs px-2 py-0.5 rounded-full font-mono">
                              #{i + 1}
                            </div>
                            <div className="absolute bottom-2 right-2 text-base leading-none">
                              {currentMode.emoji}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Empty State */
                    <div className="bg-black/70 border border-dashed border-white/15 rounded-2xl flex flex-col items-center justify-center text-center p-10">
                      {socialLoading ? (
                        <>
                          <div className="relative mb-5">
                            <div className="w-16 h-16 border-2 border-white/10 border-t-red-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center text-2xl">
                              {currentMode.emoji}
                            </div>
                          </div>
                          <p className="text-sm text-white/40 mb-1">Crafting {currentMode.labelZh} mockups...</p>
                          <p className="text-xs text-white/20">Each image takes ~30–60 seconds</p>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                            <Smartphone className="w-7 h-7 text-white/15" />
                          </div>
                          <p className="text-sm text-white/20 mb-1">Your 4 mockups will appear here</p>
                          <p className="text-xs text-white/10">Choose a mode and hit Generate</p>
                          <div className="flex gap-3 mt-5">
                            {SOCIAL_MODES.map(m => (
                              <button
                                key={m.id}
                                onClick={() => setSocialMode(m.id)}
                                className={`text-xl transition-all duration-200 ${m.id === socialMode ? 'opacity-100 scale-125' : 'opacity-20 hover:opacity-50'}`}
                                title={m.label}
                              >
                                {m.emoji}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Pro Tips */}
                  {!socialLoading && socialResults.length === 0 && (
                    <div className="bg-black/50 border border-white/8 rounded-2xl p-4">
                      <p className="text-xs text-white/35 uppercase tracking-widest mb-3 font-semibold">Pro Tips</p>
                      <div className="space-y-2.5">
                        {[
                          { icon: '📱', tip: 'Upload actual screenshots from Instagram, Facebook, or your website for the most realistic result.' },
                          { icon: '✍️', tip: 'Use the Creative Twist field to add unique props like a coffee cup, a pet, or a specific weather mood.' },
                          { icon: '🎯', tip: 'Every mode auto-applies professional PR quality modifiers — Sony A7R IV, 8K, volumetric lighting.' },
                          { icon: '🔄', tip: 'Generate multiple times for different compositions. Each run produces 4 unique variations.' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <span className="text-sm leading-none mt-0.5 flex-shrink-0">{item.icon}</span>
                            <p className="text-xs text-white/30 leading-relaxed">{item.tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* ── Debug Panel ── */}
          {debugLog.length > 0 && (
            <div className="mt-6 bg-black/80 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40 uppercase tracking-widest font-mono">Debug Log</span>
                <button onClick={() => setDebugLog([])} className="text-xs text-white/20 hover:text-white/60 transition">Clear</button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {debugLog.map((line, i) => (
                  <p key={i} className={`text-xs font-mono ${
                    line.includes('✓') ? 'text-green-400' :
                    line.includes('✗') ? 'text-red-400' :
                    line.includes('error') || line.includes('Error') ? 'text-red-400' :
                    'text-white/50'
                  }`}>{line}</p>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
