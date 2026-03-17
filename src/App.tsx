import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Camera, Zap, Image as ImageIcon, Copy } from 'lucide-react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Cone, Cylinder, Sphere, Grid } from '@react-three/drei';
import { generateImages } from './services/geminiService';

function Monster() {
  return (
    <group>
      {/* Main Body (Blue, rounded pyramid-like) */}
      <mesh>
        <boxGeometry args={[2, 2, 1.5]} />
        <meshStandardMaterial color="royalblue" />
      </mesh>
      
      {/* Ears (Blue, pointed) */}
      <Cone args={[0.5, 1, 4]} position={[0.6, 1.5, 0]}>
        <meshStandardMaterial color="royalblue" />
      </Cone>
      <Cone args={[0.5, 1, 4]} position={[-0.6, 1.5, 0]}>
        <meshStandardMaterial color="royalblue" />
      </Cone>

      {/* Eyes (Pink, closed) */}
      <mesh position={[0.3, 0.5, 0.76]}>
        <boxGeometry args={[0.4, 0.1, 0.05]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
      <mesh position={[-0.3, 0.5, 0.76]}>
        <boxGeometry args={[0.4, 0.1, 0.05]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>

      {/* Mouth/Nose (Pink) */}
      <mesh position={[0, 0.2, 0.76]}>
        <boxGeometry args={[0.5, 0.2, 0.05]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>

      {/* Legs (Blue) */}
      <Cylinder args={[0.4, 0.4, 1]} position={[0.5, -0.5, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="royalblue" />
      </Cylinder>
      <Cylinder args={[0.4, 0.4, 1]} position={[-0.5, -0.5, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="royalblue" />
      </Cylinder>

      {/* Shoes (Pink) */}
      <Sphere args={[0.4]} position={[0.5, -0.5, 1.2]}>
        <meshStandardMaterial color="hotpink" />
      </Sphere>
      <Sphere args={[0.4]} position={[-0.5, -0.5, 1.2]}>
        <meshStandardMaterial color="hotpink" />
      </Sphere>
    </group>
  );
}

function CameraTracker({ onUpdate }: { onUpdate: (rotation: any, distance: number) => void }) {
  const { camera } = useThree();
  
  return (
    <OrbitControls
      minDistance={1}
      maxDistance={12}
      onChange={(e) => {
        const target = e.target as any;
        const distance = camera.position.distanceTo(target.target);
        onUpdate(target.object.rotation, distance);
      }}
    />
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('Analysis');
  const [prompt, setPrompt] = useState('');
  const [refPhotos, setRefPhotos] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState({ json: '', zh: '', en: '' });
  const [loading, setLoading] = useState(false);
  const [cameraRotation, setCameraRotation] = useState({ x: 0, y: 0, z: 0 });
  const [cameraDistance, setCameraDistance] = useState(5);
  const [model, setModel] = useState('gemini-3-flash-preview');
  const [results, setResults] = useState<string[]>([]);
  const [tokenUsage, setTokenUsage] = useState<{ prompt: number; candidates: number; total: number } | null>(null);
  const glRef = useRef<any>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setRefPhotos([base64]);
    };
    reader.readAsDataURL(file);
  };

  const handleGeneratePrompt = async () => {
    if (refPhotos.length === 0) return;
    setLoading(true);
    try {
      const response = await generateImages(`Analyze this image and provide: 1. A JSON object with image description, 2. A descriptive paragraph in Traditional Chinese, 3. A detailed prompt in English. Format the output as: JSON: {...} | ZH: ... | EN: ...`, model, refPhotos[0]);
      
      if (response.usageMetadata) {
        setTokenUsage({
          prompt: response.usageMetadata.promptTokenCount || 0,
          candidates: response.usageMetadata.candidatesTokenCount || 0,
          total: response.usageMetadata.totalTokenCount || 0,
        });
      }

      // Simple parsing logic based on the requested format
      const text = response.text || "";
      const parts = text.split('|');
      setAnalysisResult({
        json: parts[0]?.replace('JSON:', '').trim() || '{}',
        zh: parts[1]?.replace('ZH:', '').trim() || '',
        en: parts[2]?.replace('EN:', '').trim() || ''
      });
    } catch (error) {
      console.error(error);
      alert('分析失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  const getCameraDescription = () => {
    const angleX = (cameraRotation.x * (180 / Math.PI)).toFixed(0);
    const angleY = (cameraRotation.y * (180 / Math.PI)).toFixed(0);
    
    let distanceDesc = 'Medium shot';
    if (cameraDistance < 2) distanceDesc = 'Super close-up';
    else if (cameraDistance < 4) distanceDesc = 'Close-up';
    else if (cameraDistance < 6) distanceDesc = 'Medium close-up';
    else if (cameraDistance < 8) distanceDesc = 'Medium shot';
    else if (cameraDistance < 10) distanceDesc = 'Long shot';
    else distanceDesc = 'Wide shot';
    
    return `${distanceDesc} from a ${angleX}° pitch and ${angleY}° yaw angle`;
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const gl = glRef.current;
      const base64Image = gl?.domElement.toDataURL('image/png');
      
      const fullPrompt = `${prompt}. Use the attached image as a strict reference for the character's appearance, sitting pose, and the camera angle: ${getCameraDescription()}. Reference photos: ${refPhotos.length}`;
      
      const response = await generateImages(fullPrompt, model, base64Image);
      
      if (response.usageMetadata) {
        setTokenUsage({
          prompt: response.usageMetadata.promptTokenCount || 0,
          candidates: response.usageMetadata.candidatesTokenCount || 0,
          total: response.usageMetadata.totalTokenCount || 0,
        });
      }
      
      // Assuming response.text contains image URLs or base64 strings
      // For now, I'll just set a placeholder
      setResults(['https://picsum.photos/seed/1/400/400', 'https://picsum.photos/seed/2/400/400', 'https://picsum.photos/seed/3/400/400', 'https://picsum.photos/seed/4/400/400']);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed p-6" style={{ backgroundImage: 'url(/contact-bg.webp)' }}>
      <header className="flex flex-col items-center justify-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-6xl font-black text-white tracking-tighter">FIREBEAN STUDIO 3</h1>
          <div className="flex items-center gap-4 bg-white/20 backdrop-blur-md p-3 rounded-full shadow-sm border border-white/20">
            <Zap className="w-5 h-5 text-amber-300" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto backdrop-blur-xl bg-white/30 border border-white/20 rounded-3xl p-8 shadow-2xl">
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-1 space-y-6">
          <div className="flex w-full gap-2">
            <button 
              className={`flex-1 py-6 text-xl rounded-xl ${activeTab === 'Analysis' ? 'bg-red-600 text-white' : 'bg-white text-slate-600'}`}
              onClick={() => setActiveTab('Analysis')}
            >
              Analysis
            </button>
            <button 
              className={`flex-1 py-6 text-xl rounded-xl ${activeTab === 'Generation' ? 'bg-red-600 text-white' : 'bg-white text-slate-600'}`}
              onClick={() => setActiveTab('Generation')}
            >
              Generation
            </button>
          </div>

          {activeTab === 'Analysis' && (
            <div className="space-y-6">
              <div 
                className="bg-white p-6 rounded-2xl shadow-sm border-2 border-dashed border-slate-300 hover:border-indigo-500 transition cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
              >
                <label className="block text-sm font-medium text-slate-700 mb-2">Drop Photo for Analysis</label>
                {refPhotos[0] ? (
                  <img src={refPhotos[0]} alt="Ref" className="w-full h-32 object-cover rounded-lg" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">Drag photo here</div>
                )}
              </div>
              
              <button 
                className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold shadow-md"
                onClick={handleGeneratePrompt}
                disabled={loading || refPhotos.length === 0}
              >
                {loading ? 'Analyzing...' : 'Generate Prompt'}
              </button>
            </div>
          )}

          {activeTab === 'Generation' && (
            <div className="space-y-6">
              <div 
                className="bg-white p-6 rounded-2xl shadow-sm border-2 border-dashed border-slate-300 hover:border-indigo-500 transition cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
              >
                <label className="block text-sm font-medium text-slate-700 mb-2">Reference Photos (Max 5)</label>
                <div className="grid grid-cols-5 gap-2">
                  {refPhotos.map((photo, i) => (
                    <div key={i} className="relative">
                      <img src={photo} alt={`Ref ${i}`} className="w-full h-12 object-cover rounded-lg" referrerPolicy="no-referrer" />
                      <button 
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
                        onClick={() => setRefPhotos(refPhotos.filter((_, index) => index !== i))}
                      >
                        x
                      </button>
                    </div>
                  ))}
                  {refPhotos.length < 5 && (
                    <div className="w-full h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs">+</div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">Creative Prompt</label>
                <textarea
                  className="w-full h-32 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  placeholder="What should the AI visualize?"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
            </div>
          )}

          {analysisResult.json && (
            <div className="mt-8">
              {tokenUsage && (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 text-xs text-slate-500 font-mono mb-4">
                  <p>Prompt Tokens: {tokenUsage.prompt}</p>
                  <p>Candidates Tokens: {tokenUsage.candidates}</p>
                  <p className="font-semibold text-slate-700">Total Tokens: {tokenUsage.total}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: 'JSON Format', content: analysisResult.json },
                  { title: 'ZH Chinese', content: analysisResult.zh },
                  { title: 'EN Prompt', content: analysisResult.en }
                ].map((item, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-slate-700">{item.title}</label>
                      <button onClick={() => navigator.clipboard.writeText(item.content)} className="text-slate-400 hover:text-indigo-600">
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                    <pre className="bg-slate-100 p-3 rounded-xl text-xs font-mono whitespace-pre-wrap break-words overflow-auto h-48">{item.content}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>

        <section className="lg:col-span-2 space-y-6">
          {activeTab === 'Generation' && (
            <div className="bg-slate-900 p-6 rounded-2xl shadow-lg h-96 relative">
              <h2 className="text-white text-sm font-medium mb-4 flex items-center gap-2">
                <Camera className="w-4 h-4" /> Camera Control
              </h2>
              <Canvas 
                camera={{ position: [0, 2, 5] }}
                onCreated={({ gl }) => { glRef.current = gl; }}
              >
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <Monster />
                <Grid infiniteGrid fadeDistance={50} />
                <CameraTracker onUpdate={(rot, dist) => {
                  setCameraRotation(rot);
                  setCameraDistance(dist);
                }} />
              </Canvas>
              <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                {getCameraDescription()}
              </div>
            </div>
          )}

          {activeTab === 'Generation' && (
            <div className="flex items-center justify-between gap-4">
              <select
                className="p-3 rounded-xl border border-slate-200 flex-grow"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="gemini-3-flash-preview">Gemini 3 Flash (Free)</option>
                <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image (Free)</option>
              </select>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-red-600 text-white px-8 py-3 rounded-xl font-semibold shadow-md"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate'}
              </motion.button>
            </div>
          )}

          {tokenUsage && (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 text-xs text-slate-500 font-mono">
              <p>Prompt Tokens: {tokenUsage.prompt}</p>
              <p>Candidates Tokens: {tokenUsage.candidates}</p>
              <p className="font-semibold text-slate-700">Total Tokens: {tokenUsage.total}</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {results.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt={`Result ${i}`} className="rounded-xl shadow-md w-full" referrerPolicy="no-referrer" />
                  <button
                    className="absolute bottom-2 right-2 bg-white/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
                    onClick={() => alert(`Selected image ${i + 1} as best!`)}
                  >
                    <ImageIcon className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  </div>
  );
}
