// Firebean Studio 3 — Gemini AI Service v3.6
// Image Generation: Nano Banana (gemini-2.5-flash-image) via native Gemini REST API
// Image Analysis: gemini-2.5-flash via OpenAI-compatible proxy
// Social Media Dummy: 5 precision scene modes with Nano Banana

// ─── API Config ───────────────────────────────────────────────────────────────
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY as string;
const OPENAI_BASE_URL = 'https://api.manus.im/api/llm-proxy/v1';
const ANALYSIS_MODEL = 'gemini-2.5-flash';

// ─── Debug Logger ─────────────────────────────────────────────────────────────
export type DebugLogger = (msg: string) => void;

// ─── Generate a single image via Nano Banana ─────────────────────────────────
async function generateSingleImage(
  prompt: string,
  refPhotos: string[],
  variationIndex: number,
  log: DebugLogger
): Promise<string> {
  const variationHints = [
    'Primary composition as described.',
    'Slightly different angle, same mood.',
    'Emphasise dramatic lighting and atmosphere.',
    'Wider establishing shot with environmental context.',
  ];

  const fullPrompt = `${prompt}\n\nVariation: ${variationHints[variationIndex % 4]}`;

  log(`[${variationIndex + 1}/4] Calling Nano Banana API...`);

  const parts: any[] = [];
  refPhotos.slice(0, 5).forEach((photo, idx) => {
    const base64 = photo.includes(',') ? photo.split(',')[1] : photo;
    const mimeType = photo.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
    parts.push({ inlineData: { mimeType, data: base64 } });
    log(`  → Attached reference photo ${idx + 1}`);
  });
  parts.push({ text: fullPrompt });

  const payload = {
    contents: [{ parts }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  };

  const url = `${GEMINI_BASE}/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    log(`  ✗ API error ${res.status}: ${errText.slice(0, 200)}`);
    throw new Error(`Nano Banana API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const candidates = data?.candidates ?? [];

  if (candidates.length === 0) {
    log(`  ✗ No candidates returned. Full response: ${JSON.stringify(data).slice(0, 300)}`);
    throw new Error('No image candidates returned from Nano Banana');
  }

  const responseParts = candidates[0]?.content?.parts ?? [];
  for (const part of responseParts) {
    if (part.inlineData) {
      const mime = part.inlineData.mimeType || 'image/png';
      const b64 = part.inlineData.data;
      log(`  ✓ Got image! MIME: ${mime}, size: ${b64.length} chars`);
      return `data:${mime};base64,${b64}`;
    }
  }

  const textPart = responseParts.find((p: any) => p.text);
  if (textPart) {
    log(`  ✗ Only text returned: ${textPart.text.slice(0, 200)}`);
  }
  throw new Error('No image data in Nano Banana response');
}

// ─── Generate 4 Visuals ───────────────────────────────────────────────────────
export async function generateVisual(
  prompt: string,
  refPhotos: string[],
  log: DebugLogger = () => {}
): Promise<string[]> {
  log(`Starting generation for prompt: "${prompt.slice(0, 80)}..."`);
  log(`Reference photos: ${refPhotos.length}`);

  const results: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < 4; i++) {
    try {
      const imageUrl = await generateSingleImage(prompt, refPhotos, i, log);
      results.push(imageUrl);
    } catch (err: any) {
      errors.push(`Image ${i + 1}: ${err.message}`);
      log(`  ✗ Failed image ${i + 1}: ${err.message}`);
    }
  }

  if (results.length === 0) {
    throw new Error(`All 4 generations failed.\n${errors.join('\n')}`);
  }

  log(`✓ Generation complete: ${results.length}/4 images`);
  return results;
}

// ─── Analyze Photo ────────────────────────────────────────────────────────────
export interface AnalysisResult {
  json: string;
  en: string;
  zh: string;
}

export async function analyzeImage(
  base64Image: string,
  log: DebugLogger = () => {}
): Promise<AnalysisResult> {
  log('Starting photo analysis via Gemini 2.5 Flash...');

  const imageUrl = base64Image.startsWith('data:')
    ? base64Image
    : `data:image/jpeg;base64,${base64Image}`;

  const systemPrompt = `You are a professional AI image prompt engineer. Analyze the provided image in extreme detail and return EXACTLY the following three sections, each separated by "---SECTION---":

SECTION 1 — JSON FORMAT:
Return a valid JSON object (no markdown code blocks) describing the image with these keys: subject, setting, lighting, mood, color_palette, composition, style, camera_angle, technical_details

SECTION 2 — ENGLISH PROMPT:
Write a detailed, professional image generation prompt in English (150-200 words). Include subject description, environment, lighting, mood, color palette, composition, style, camera settings, and quality modifiers. Make it ready to use in Midjourney or DALL-E.

SECTION 3 — CHINESE PROMPT:
Write the same detailed prompt in Traditional Chinese (繁體中文), maintaining all technical details and visual descriptors.

Return ONLY the three sections separated by "---SECTION---". No extra text before or after.`;

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: ANALYSIS_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: systemPrompt },
          ],
        },
      ],
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    log(`✗ Analysis API error ${response.status}: ${err.slice(0, 200)}`);
    throw new Error(`Analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  log(`✓ Analysis complete. Response length: ${text.length} chars`);

  const sections = text.split('---SECTION---').map((s: string) => s.trim());

  return {
    json: sections[0] || '',
    en: sections[1] || '',
    zh: sections[2] || '',
  };
}

// ─── Social Media Dummy — 5 Precision Scene Modes ────────────────────────────
export type SocialMode =
  | 'creative'
  | 'keynote'
  | 'product'
  | 'lifestyle'
  | 'urban';

export interface SocialModeConfig {
  id: SocialMode;
  label: string;
  labelZh: string;
  emoji: string;
  tagline: string;
  useCases: string;
  placeholder: string;
  buildPrompt: (userInput: string, hasScreenshots: boolean) => string;
}

// Universal PR quality suffix appended to every mode
const PR_QUALITY_SUFFIX = `Commercial photography quality, Shot on Sony A7R IV, soft volumetric lighting, hyper-realistic textures, subtle screen glare and fingerprints, 8k photorealistic, cinematic color grading.`;

export const SOCIAL_MODES: SocialModeConfig[] = [
  // ── 1. 文青創作 · Creative Studio ──────────────────────────────────────────
  {
    id: 'creative',
    label: 'Creative',
    labelZh: '文青創作',
    emoji: '🎨',
    tagline: "The Creator's Studio",
    useCases: '設計作品集、藝術展覽、精品網店、創意社交內容',
    placeholder: '試試輸入：一支 Apple Pencil、散落的色票卡、一盆龜背竹...',
    buildPrompt: (userInput, hasScreenshots) => {
      const screenDesc = hasScreenshots
        ? 'displaying the provided social media content with artistic clarity'
        : 'displaying a clean design portfolio interface';
      const extra = userInput.trim() ? `${userInput.trim()}. ` : '';
      return `Aesthetic creative workspace flat lay photography. An iPad Pro ${screenDesc}, resting on a messy but beautifully styled wooden desk. ${extra}Surrounding elements include scattered Pantone color swatches, open art magazines, a ceramic coffee mug, dried flowers, and soft monstera leaf shadows cast across the surface. Overhead flat lay composition, soft diffused natural studio lighting from a large window, warm artistic vibe, shallow depth of field on the screen. ${PR_QUALITY_SUFFIX}`;
    },
  },

  // ── 2. 專業職人 · Keynote Showcase ─────────────────────────────────────────
  {
    id: 'keynote',
    label: 'Professional',
    labelZh: '專業職人',
    emoji: '💼',
    tagline: 'The Keynote Showcase',
    useCases: '年度報告、金融數據分析、B2B 方案、專業顧問網頁',
    placeholder: '試試輸入：一杯精品黑咖啡、皮革筆記本、金屬鋼筆...',
    buildPrompt: (userInput, hasScreenshots) => {
      const screenDesc = hasScreenshots
        ? 'displaying the provided business content with sharp professional clarity'
        : 'displaying a glowing business dashboard with data visualisations';
      const extra = userInput.trim() ? `${userInput.trim()}. ` : '';
      return `Massive digital screen in a high-end corporate boardroom ${screenDesc}. ${extra}The foreground features blurry professional audience silhouettes in business attire. Floor-to-ceiling glass walls reveal a city skyline at dusk. Cool blue ambient lighting with sharp focus on the screen content, dramatic depth of field, sleek glass and steel textures, authoritative and influential atmosphere. Wide cinematic shot emphasising scale and impact. ${PR_QUALITY_SUFFIX}`;
    },
  },

  // ── 3. 精品櫥窗 · Product Unboxing ─────────────────────────────────────────
  {
    id: 'product',
    label: 'Product Shot',
    labelZh: '精品櫥窗',
    emoji: '🛍️',
    tagline: 'The Product Unboxing',
    useCases: '網購平台、化妝品官網、電子產品發佈、社交媒體廣告',
    placeholder: '試試輸入：白色緞帶、高級護膚品、大理石背景...',
    buildPrompt: (userInput, hasScreenshots) => {
      const screenDesc = hasScreenshots
        ? 'displaying the provided product or e-commerce content'
        : 'displaying a clean e-commerce product page';
      const extra = userInput.trim() ? `${userInput.trim()}. ` : '';
      return `iPhone 15 Pro leaning elegantly against a minimalist premium gift box ${screenDesc}. ${extra}Soft pastel background in blush or sage green, silk ribbon textures draped nearby, high-end skincare or lifestyle products arranged in the composition. Soft studio ring light creating perfect even illumination, macro close-up shot with shallow depth of field, vibrant yet refined colors, pristine clean e-commerce product photography. ${PR_QUALITY_SUFFIX}`;
    },
  },

  // ── 4. 溫馨日常 · Cozy Home ─────────────────────────────────────────────────
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    labelZh: '溫馨日常',
    emoji: '🛋️',
    tagline: 'The Cozy Home Interaction',
    useCases: '健康管理 App、家居佈置網頁、串流媒體、煮食教學',
    placeholder: '試試輸入：一隻貓咪、一杯冒煙的熱可可、窗外的夕陽...',
    buildPrompt: (userInput, hasScreenshots) => {
      const screenDesc = hasScreenshots
        ? 'displaying the provided social media or app content'
        : 'displaying a clean lifestyle app interface';
      const extra = userInput.trim() ? `${userInput.trim()}. ` : '';
      return `Relaxed cozy home environment, person holding an iPad ${screenDesc} while lounging on a soft beige sofa. ${extra}A warm glowing table lamp illuminates the background, a chunky knitted blanket is draped over the armrest, a steaming cup of tea sits on the side table. Intimate atmosphere, soft natural home lighting, realistic skin and fabric textures, shallow focus on the screen, golden hour warmth. ${PR_QUALITY_SUFFIX}`;
    },
  },

  // ── 5. 未來科技 · Urban Motion ──────────────────────────────────────────────
  {
    id: 'urban',
    label: 'Futuristic',
    labelZh: '未來科技',
    emoji: '🌆',
    tagline: 'The Urban Motion',
    useCases: '交通 App、餐飲外送、新聞媒體、快閃活動',
    placeholder: '試試輸入：霓虹燈招牌、雨後濕潤的街道、城市夜景...',
    buildPrompt: (userInput, hasScreenshots) => {
      const screenDesc = hasScreenshots
        ? 'displaying the provided app or social media interface with glowing clarity'
        : 'displaying a glowing map or delivery app interface';
      const extra = userInput.trim() ? `${userInput.trim()}. ` : '';
      return `Hand holding a smartphone ${screenDesc} at a busy city crosswalk at night. ${extra}Background features motion-blurred pedestrians and vehicles, vibrant neon street signs in electric blue and magenta reflecting off wet pavement, energetic urban atmosphere. Cinematic night photography with high contrast, neon light reflections on the phone screen, dynamic composition suggesting speed and connectivity. ${PR_QUALITY_SUFFIX}`;
    },
  },
];

// ─── Social Media Dummy — Generate 4 Mockups ─────────────────────────────────
export async function generateSocialMockup(
  mode: SocialMode,
  userInput: string,
  refPhotos: string[],
  log: DebugLogger = () => {}
): Promise<string[]> {
  const modeConfig = SOCIAL_MODES.find(m => m.id === mode)!;
  const hasScreenshots = refPhotos.length > 0;
  const basePrompt = modeConfig.buildPrompt(userInput, hasScreenshots);

  log(`Social Media Dummy — Mode: ${modeConfig.label} · ${modeConfig.labelZh}`);
  log(`Scene: ${modeConfig.tagline}`);
  log(`User twist: "${userInput.slice(0, 60)}"`);
  log(`Reference screenshots: ${refPhotos.length}`);

  const variationHints = [
    'Primary hero composition — perfect for the main campaign visual.',
    'Slightly different camera angle, same scene mood and lighting.',
    'Close-up detail shot with emphasis on the screen content and texture.',
    'Wider environmental shot showing the full lifestyle context.',
  ];

  const results: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < 4; i++) {
    try {
      const fullPrompt = `${basePrompt}\n\nVariation direction: ${variationHints[i]}`;
      log(`[${i + 1}/4] Generating ${modeConfig.labelZh} mockup...`);

      const parts: any[] = [];
      refPhotos.slice(0, 3).forEach((photo, idx) => {
        const base64 = photo.includes(',') ? photo.split(',')[1] : photo;
        const mimeType = photo.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
        parts.push({ inlineData: { mimeType, data: base64 } });
        log(`  → Attached screenshot ref ${idx + 1}`);
      });
      parts.push({ text: fullPrompt });

      const payload = {
        contents: [{ parts }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      };

      const url = `${GEMINI_BASE}/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        log(`  ✗ API error ${res.status}: ${errText.slice(0, 200)}`);
        throw new Error(`API error ${res.status}`);
      }

      const data = await res.json();
      const candidates = data?.candidates ?? [];
      if (candidates.length === 0) throw new Error('No candidates returned');

      const responseParts = candidates[0]?.content?.parts ?? [];
      let imageFound = false;
      for (const part of responseParts) {
        if (part.inlineData) {
          const mime = part.inlineData.mimeType || 'image/png';
          const b64 = part.inlineData.data;
          log(`  ✓ Mockup ${i + 1} ready! Size: ${b64.length} chars`);
          results.push(`data:${mime};base64,${b64}`);
          imageFound = true;
          break;
        }
      }
      if (!imageFound) throw new Error('No image in response');

    } catch (err: any) {
      errors.push(`Mockup ${i + 1}: ${err.message}`);
      log(`  ✗ Failed mockup ${i + 1}: ${err.message}`);
    }
  }

  if (results.length === 0) {
    throw new Error(`All 4 mockup generations failed.\n${errors.join('\n')}`);
  }

  log(`✓ Social mockup generation complete: ${results.length}/4 images`);
  return results;
}
