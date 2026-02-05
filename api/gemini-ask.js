// /api/gemini-ask.js
export const config = { runtime: 'edge' };

const MODEL = 'gemini-flash-latest'; // senin çalışan model
function buildEndpoint(key) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const txt = await res.text().catch(() => '');
  try { return { ok: res.ok, status: res.status, body: JSON.parse(txt), raw: txt }; }
  catch { return { ok: res.ok, status: res.status, body: null, raw: txt }; }
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const question = (body.question || '').toString().trim() || 'Piyasa genel durumu nedir?';
    const strategy = body.strategy || null;

    const API_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_APK_KEY || process.env.GEMINI_APK; // esneklik
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing GEMINI_API_KEY environment variable on server' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // 1) Canlı piyasa verisi (basit, güvenli)
    const market = await fetchJson('https://api.exchangerate-api.com/v4/latest/USD');
    if (!market.ok) {
      // fallback: boş ama çalışmaya devam et
      console.warn('Market fetch failed', market.status, market.raw);
    }
    const r = (market.body && market.body.rates) ? market.body.rates : {};

    const pairs = {
      usdTry: r.TRY ? Number(r.TRY).toFixed(2) : '---',
      eurUsd: r.EUR ? (1 / Number(r.EUR)).toFixed(4) : '---',
      gbpUsd: r.GBP ? (1 / Number(r.GBP)).toFixed(4) : '---',
      usdJpy: r.JPY ? Number(r.JPY).toFixed(2) : '---',
      gold: r.XAU ? (1 / Number(r.XAU)).toFixed(2) : '---'
    };

    // 2) Prompt (çıktıyı saf JSON verecek şekilde netleştir)
    const brokerPrompt = `
KİMLİK: Sen Piyami LifeOS Otonom Finans Operatörüsün.
GÖREVİN: Piyasayı tara, riskli elementleri belirle ve 3 farklı varyantta (Scalp, Day, Swing) pusu noktaları oluştur.

VERİLER:
USD/TRY: ${pairs.usdTry}
EUR/USD: ${pairs.eurUsd}
GBP/USD: ${pairs.gbpUsd}
USD/JPY: ${pairs.usdJpy}
GOLD (XAU/USD): ${pairs.gold}

SORU: "${question}"
STRATEGY_HINT: ${strategy ? strategy : 'default'}

ÇIKTIYI SADECE SAF JSON OLARAK VER. ÖRNEK ŞABLON:
{
  "global_status": "kısa piyasa özeti",
  "radar_elements": ["USD/TRY (Riskli)", "XAU/USD (Jeopolitik)"],
  "strategies": {
    "scalp": {"pair":"EUR/USD","action":"BUY","price":"1.1860","tp":"1.1890","sl":"1.1840"},
    "day": {"pair":"USD/JPY","action":"SELL","price":"155.10","tp":"154.00","sl":"155.50"},
    "swing": {"pair":"XAU/USD","action":"BUY","price":"2030","tp":"2100","sl":"2010"}
  }
}
    `.trim();

    // 3) Gemini çağrısı
    const endpoint = buildEndpoint(API_KEY);
    const payload = {
      // Bu yapı önceki kullandığın formata uyumlu: contents -> parts -> text
      contents: [{ parts: [{ text: brokerPrompt }] }]
    };

    const geminiRes = await fetchJson(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!geminiRes.ok) {
      // Gemini'den dönen hatayı kullanıcıya açıkça ver
      const remoteBody = geminiRes.body || geminiRes.raw || {};
      return new Response(JSON.stringify({
        error: 'Gemini request failed',
        status: geminiRes.status,
        remote: remoteBody
      }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    // 4) Model cevabını temizle ve JSON'a parse et
    let rawText = (geminiRes.body && geminiRes.body.candidates && geminiRes.body.candidates[0] && geminiRes.body.candidates[0].content && geminiRes.body.candidates[0].content.parts && geminiRes.body.candidates[0].content.parts[0] && geminiRes.body.candidates[0].content.parts[0].text)
      ? geminiRes.body.candidates[0].content.parts[0].text
      : (typeof geminiRes.raw === 'string' ? geminiRes.raw : '{}');

    rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed = null;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      // Eğer model saf JSON döndürmediyse, modelin metnini "model_raw" altında ver
      parsed = { model_raw: rawText };
    }

    // 5) Sonuç: piyasa verisi özeti + model çıktısı
    const result = {
      ok: true,
      pairs,
      question,
      model: parsed
    };

    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('gemini-ask error', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
