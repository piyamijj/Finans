export const config = { runtime: 'edge' };

export default async function handler(req) {
    try {
        const { question, strategy } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        // 1. CANLI PİYASA VERİLERİNİ ÇEK
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
        KİMLİK: Sen Piyami LifeOS Otonom Finans Operatörüsün. 
        GÖREVİN: Piyasayı tara, riskli elementleri belirle ve 3 farklı varyantta (Scalp, Day, Swing) pusu noktaları oluştur.
        
        VERİLER: USD/TRY: ${pairs.usdTry}, EUR/USD: ${pairs.eurUsd}, GOLD: ${pairs.gold}
        SORU: "${question}"

        ÇIKTIYI SADECE SAF JSON OLARAK VER:
        {
            "global_status": "Piyasa genel durum özeti (İran-TR hattı dahil)",
            "radar_elements": ["USD/JPY (Riskli)", "ALTIN (Sıçrama Bekleniyor)"],
            "strategies": {
                "scalp": {"pair": "EUR/USD", "action": "BUY", "price": "1.1860", "tp": "1.1890", "sl": "1.1840"},
                "day": {"pair": "USD/JPY", "action": "SELL", "price": "155.10", "tp": "154.00", "sl": "155.50"},
                "swing": {"pair": "XAU/USD", "action": "BUY", "price": "2030", "tp": "2100", "sl": "2010"}
            }
        }`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
