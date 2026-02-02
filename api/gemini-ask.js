export const config = { runtime: 'edge' };

export default async function handler(req) {
    try {
        const { question } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        const marketRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await marketRes.json();
        const r = data.rates;

        const pairs = {
            usdTry: r.TRY?.toFixed(2),
            eurUsd: (1 / r.EUR)?.toFixed(4),
            usdJpy: r.JPY?.toFixed(2),
            gold: r.XAU ? (1 / r.XAU).toFixed(2) : "---"
        };

        const brokerPrompt = `
        KİMLİK: Piyami LifeOS Otonom Operatörü.
        GÖREV: Defterin sağ sayfasındaki gibi 2 satırlı (ANA ve SAĞ ONAY) radar verisi üret.
        GÜNCEL: USD/TRY: ${pairs.usdTry}, EUR/USD: ${pairs.eurUsd}, GOLD: ${pairs.gold}
        SORU: "${question}"

        ÇIKTI JSON:
        {
            "global_status": "Piyasa Özeti (İran-TR Dahil)",
            "radar_v1": "XAU/USD (Sıçrama Hattı)",
            "radar_v2": "%1.8 ONAYLANDI",
            "move_stage": 45,
            "strategies": {
                "scalp": {"pair": "EUR/USD", "action": "BUY", "price": "1.0850", "tp": "1.0880", "sl": "1.0830"},
                "day": {"pair": "USD/JPY", "action": "SELL", "price": "154.20", "tp": "153.00", "sl": "154.60"},
                "swing": {"pair": "XAU/USD", "action": "BUY", "price": "2330", "tp": "2380", "sl": "2310"}
            }
        }`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: brokerPrompt }] }] })
        });

        const apiData = await response.json();
        let rawText = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

        return new Response(rawText, { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
