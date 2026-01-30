export const config = { runtime: 'edge' };

export default async function handler(req) {
    if (req.method !== 'POST') return new Response("Hata", { status: 405 });

    try {
        const { question } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        // 1. CANLI PİYASA VERİLERİ
        const marketRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await marketRes.json();
        const r = data.rates;

        const btc = r.BTC ? (1 / r.BTC).toLocaleString('en-US') : "---";
        const onsGold = r.XAU ? (1 / r.XAU).toFixed(2) : "---";
        const onsSilver = r.XAG ? (1 / r.XAG).toFixed(2) : "---";
        const usdTry = r.TRY ? r.TRY.toFixed(2) : "---";
        const eurUsd = r.EUR ? (1 / r.EUR).toFixed(4) : "---";
        const gramGold = (r.XAU && r.TRY) ? ((1 / r.XAU) * r.TRY / 31.1).toFixed(2) : "---";
        const gramSilver = (r.XAG && r.TRY) ? ((1 / r.XAG) * r.TRY / 31.1).toFixed(2) : "---";

        // 2. BROKER TALİMATI
        const brokerPrompt = `Sen Piyami LifeOS Broker'sın. Piyami Bey'e sadıksın.
        GÜNCEL: BTC: ${btc}$, Altın: ${onsGold}$, Gümüş: ${onsSilver}$, Dolar: ${usdTry}TL, Gram Altın: ${gramGold}TL.
        GÖREV: Siyasi ve finansal analiz yap, dürüst ve cesur ol. Soru: ${question}`;

        // 3. GEMINI ÇAĞRISI (Güvenlik Ayarları Eklenmiş)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: brokerPrompt }] }],
                // BURASI ÖNEMLİ: Güvenlik filtrelerini en düşük seviyeye çekiyoruz
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40
                }
            })
        });

        const apiData = await response.json();

        // Hata ayıklama için: Eğer Google engellediyse sebebi anlamamızı sağlar
        if (apiData.promptFeedback?.blockReason) {
            return new Response(JSON.stringify({ answer: "Google bu soruyu güvenlik nedeniyle engelledi: " + apiData.promptFeedback.blockReason }), { headers: { 'Content-Type': 'application/json' } });
        }

        const answer = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Broker şu an derin analizde, lütfen tekrar dene Piyami Bey.";

        return new Response(JSON.stringify({ answer }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ answer: "Sistem Hatası: " + error.message }), { status: 500 });
    }
}
