export const config = { runtime: 'edge' };

export default async function handler(req) {
    try {
        const { question } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        // CANLI VERİ ÇEKİMİ (Asistanın Gözleri)
        const marketRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await marketRes.json();
        const r = data.rates;

        const pairs = {
            usdTry: r.TRY?.toFixed(2),
            gold: r.XAU ? (1 / r.XAU).toFixed(2) : "---",
            usdIrr: r.IRR ? r.IRR.toLocaleString('en-US') : "---"
        };

        const babaPrompt = `
        KİMLİK: Sen Piyami LifeOS "Baba" Asistanısın. Görevin yetimlerin rızkını yamyamlardan korumaktır.
        
        GÜNCEL DURUM: USD/TRY: ${pairs.usdTry} | USD/IRR: ${pairs.usdIrr} | XAU/USD: ${pairs.gold}
        SORU: "${question}"

        FORMAT: Sadece JSON döndür. 
        - Risk tahmini yap (İran-TR hattını incele).
        - 2 satırlı radar verisi oluştur.
        - Renk kodlarını belirle (white, green, blue, danger-zone).

        {
            "radar_v1": "Element İsmi (Örn: XAU/USD)",
            "radar_v2": "Sıçrama/Risk Tahmini (Örn: %2.5 Yükseliş Bekleniyor)",
            "radar_color": "danger-zone",
            "pusu": {
                "pair": "USD/JPY",
                "action": "1.34 SELL (Mavi Mod)",
                "price": "155.20",
                "tp": "154.60",
                "sl": "155.55",
                "color_code": "blue"
            },
            "analiz": "Baba usulü kısa, samimi ve otoriter bir yorum."
        }`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: babaPrompt }] }] })
        });

        const apiData = await response.json();
        let rawText = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

        return new Response(rawText, { headers: { 'Content-Type': 'application/json' } });

    } catch (e) {
        return new Response(JSON.stringify({ error: "Sistem Meşgul Komutanım" }), { status: 500 });
    }
}
