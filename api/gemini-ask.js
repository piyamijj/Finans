export const config = { runtime: 'edge' };

export default async function handler(req) {
    try {
        const { question, strategy } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        // 1. CANLI PÄ°YASA VERÄ°LERÄ°NÄ° Ã‡EK
        const marketRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await marketRes.json();
        const r = data.rates;

        const pairs = {
            usdTry: r.TRY?.toFixed(2),
            eurUsd: (1 / r.EUR)?.toFixed(4),
            gbpUsd: (1 / r.GBP)?.toFixed(4),
            usdJpy: r.JPY?.toFixed(2),
            gold: r.XAU ? (1 / r.XAU).toFixed(2) : "---"
        };

        const brokerPrompt = `
        KÄ°MLÄ°K: Sen Piyami LifeOS Otonom Finans OperatÃ¶rÃ¼sÃ¼n. 
        GÃ–REVÄ°N: PiyasayÄ± tara, riskli elementleri belirle ve 3 farklÄ± varyantta (Scalp, Day, Swing) pusu noktalarÄ± oluÅŸtur.
        
        VERÄ°LER: USD/TRY: ${pairs.usdTry}, EUR/USD: ${pairs.eurUsd}, GOLD: ${pairs.gold}
        SORU: "${question}"

        Ã‡IKTIYI SADECE SAF JSON OLARAK VER:
        {
            "global_status": "Piyasa genel durum Ã¶zeti (Ä°ran-TR hattÄ± dahil)",
            "radar_elements": ["USD/JPY (Riskli)", "ALTIN (SÄ±Ã§rama Bekleniyor)"],
            "strategies": {
                "scalp": {"pair": "EUR/USD", "action": "BUY", "price": "1.1860", "tp": "1.1890", "sl": "1.1840"},
                "day": {"pair": "USD/JPY", "action": "SELL", "price": "155.10", "tp": "154.00", "sl": "155.50"},
                "swing": {"pair": "XAU/USD", "action": "BUY", "price": "2030", "tp": "2100", "sl": "2010"}
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
