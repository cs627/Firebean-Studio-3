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
  const [socialDebugLog, setSocialDebugLog] = useState<string[]>([]);
  const addSocialLog = (msg: string) => setSocialDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()} ${msg}`]);
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

  // ── Actions ──
  const handleGenerate = async () => {
    if (!prompt.trim() && refPhotos.length === 0) return;
    setGenLoading(true);
    setGenError('');
    setGenResults([]);
    setDebugLog([]);
    try {
      const finalPrompt = `[Style: ${style}] [Aspect: ${aspectRatio}] [Angle: ${getCameraDescription(cameraRot, cameraDist)}] ${prompt}`;
      const urls = await generateVisual(finalPrompt, refPhotos, addLog);
      setGenResults(urls);
    } catch (err: any) {
      setGenError(err.message);
    } finally {
      setGenLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!photoToAnalyze) return;
    setAnalyzeLoading(true);
    setAnalyzeError('');
    setPromptJson('');
    setPromptEn('');
    setPromptZh('');
    try {
      const res = await analyzeImage(photoToAnalyze, addLog);
      setPromptJson(res.json);
      setPromptEn(res.en);
      setPromptZh(res.zh);
    } catch (err: any) {
      setAnalyzeError(err.message);
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const handleSocialGenerate = async () => {
    setSocialLoading(true);
    setSocialError('');
    setSocialResults([]);
    setSocialProgress(0);
    setSocialDebugLog([]);
    try {
      const urls = await generateSocialMockup(socialMode, socialUserInput, socialScreenshots, (msg) => {
        addSocialLog(msg);
        if (msg.includes('✓ Mockup')) setSocialProgress(p => p + 1);
      });
      setSocialResults(urls);
    } catch (err: any) {
      setSocialError(err.message);
    } finally {
      setSocialLoading(false);
    }
  };

  const downloadImage = async (url: string, index: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `firebean-result-${Date.now()}-${index + 1}.png`;
    link.click();
  };

  const currentMode = SOCIAL_MODES.find(m => m.id === socialMode)!;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-inter selection:bg-red-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(20,20,20,0),rgba(5,5,5,1))]" />
        <img src={contactBg} className="w-full h-full object-cover opacity-20 mix-blend-overlay" alt="" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
          <div className="flex items-center gap-6">
            <img src={firebeanLogo} alt="Firebean" className="h-10 md:h-12 w-auto brightness-110 drop-shadow-[0_0_15px_rgba(255,51,51,0.3)]" />
            <div className="h-10 w-px bg-white/10 hidden md:block" />
            <div>
              <h1 className="text-2xl md:text-3xl font-anton tracking-wider uppercase text-white">Studio 3.6</h1>
              <p className="text-[10px] md:text-xs text-red-500 font-mono tracking-[0.2em] uppercase font-bold">Advanced PR Visual Engine</p>
            </div>
          </div>

          <nav className="flex bg-black/40 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl">
            {[
              { id: 'Generate', label: 'Generate', icon: Sparkles },
              { id: 'Analyze', label: 'Analyze', icon: ScanSearch },
              { id: 'SocialDummy', label: 'Social Dummy', icon: Smartphone },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="relative">
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
                  <div className="bg-black/75 border border-white/15 rounded-2xl p-5 backdrop-blur-md">
                    <label className="block text-xs text-white/60 uppercase tracking-widest mb-3">Creative Prompt</label>
                    <textarea
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      placeholder="Describe the scene you want to create..."
                      className="w-full h-32 bg-white/5 border border-white/10 text-white text-sm p-4 rounded-xl focus:outline-none focus:border-red-500/60 resize-none transition-all placeholder:text-white/20"
                    />
                  </div>

                  <div className="bg-black/75 border border-white/15 rounded-2xl p-5 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs text-white/60 uppercase tracking-widest">Reference Photos</label>
                      <span className="text-[10px] text-white/30 font-mono">{refPhotos.length}/5</span>
                    </div>

                    <div className="flex gap-2.5 mb-3 flex-wrap">
                      <AnimatePresence>
                        {refPhotos.map((src, i) => (
                          <RefPhotoThumb key={i} src={src} onRemove={() => setRefPhotos(p => p.filter((_, j) => j !== i))} />
                        ))}
                      </AnimatePresence>
                    </div>

                    {refPhotos.length < 5 && (
                      <div
                        ref={refDropRef}
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleRefDrop}
                        className="border-2 border-dashed border-white/15 rounded-xl p-6 text-center cursor-pointer hover:border-red-500/50 hover:bg-red-500/5 transition-all group"
                        onClick={() => document.getElementById('ref-input')?.click()}
                      >
                        <Upload className="w-6 h-6 text-white/15 group-hover:text-red-400 mx-auto mb-2 transition" />
                        <p className="text-xs text-white/25 group-hover:text-white/50 transition">Drag & drop or click to upload</p>
                        <input id="ref-input" type="file" accept="image/*" multiple className="hidden" onChange={handleRefFileInput} />
                      </div>
                    )}
                  </div>

                  <div className="bg-black/75 border border-white/15 rounded-2xl p-5 backdrop-blur-md grid grid-cols-2 gap-4">
                    <Select
                      label="Style"
                      value={style}
                      onChange={setStyle}
                      options={[
                        { value: 'cinematic', label: 'Cinematic' },
                        { value: 'product', label: 'Product' },
                        { value: 'portrait', label: 'Portrait' },
                        { value: 'abstract', label: 'Abstract' },
                      ]}
                    />
                    <Select
                      label="Aspect Ratio"
                      value={aspectRatio}
                      onChange={setAspectRatio}
                      options={[
                        { value: '16:9', label: '16:9 Wide' },
                        { value: '9:16', label: '9:16 Story' },
                        { value: '1:1', label: '1:1 Square' },
                        { value: '4:5', label: '4:5 Portrait' },
                      ]}
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleGenerate}
                    disabled={genLoading || (!prompt.trim() && refPhotos.length === 0)}
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

                  {/* Results Grid */}
                  {socialResults.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
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

                      {/* Social Debug Panel */}
                      {socialDebugLog.length > 0 && (
                        <div className="mt-4 bg-black/80 border border-white/10 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-white/40 uppercase tracking-widest font-mono">Debug Info</span>
                            <button onClick={() => setSocialDebugLog([])} className="text-xs text-white/20 hover:text-white/60 transition">Clear</button>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-0.5">
                            {socialDebugLog.map((line, i) => (
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
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* ── Global Debug Panel (Mainly for Tab 1 & 2) ── */}
          {debugLog.length > 0 && (
            <div className="mt-6 bg-black/80 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40 uppercase tracking-widest font-mono">System Debug Log</span>
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
