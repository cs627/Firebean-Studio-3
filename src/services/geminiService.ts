// Firebean Studio 3 — Gemini AI Service v3.5
// Image Generation: Nano Banana (gemini-2.5-flash-image) via native Gemini REST API
// Image Analysis: gemini-2.5-flash via OpenAI-compatible proxy

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

  // Build parts — add reference images if provided
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

  // If only text returned
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

  // Generate sequentially to avoid rate limits
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
