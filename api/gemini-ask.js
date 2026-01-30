export const config = { runtime: 'edge' };

export default async function handler(req) {
    if (req.method !== 'POST') return new Response("Hata", { status: 405 });

    try {
        const { question } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        // 1. CANLI VERİLER
        const marketRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await marketRes.json();
        const r = data.rates;

        const btc = r.BTC ? (1 / r.BTC).toLocaleString() : "---";
        const gold = r.XAU ? (1 / r.XAU).toFixed(2) : "---";
        const silver = r.XAG ? (1 / r.XAG).toFixed(2) : "---";
        const usdTry = r.TRY ? r.TRY.toFixed(2) : "---";

        // 2. DAHA HAFİF VE NET TALİMAT
        const lightPrompt = `Sen Piyami LifeOS Broker'sın. 
        Piyasa: BTC:${btc}$, Altın:${gold}$, Gümüş:${silver}$, Dolar:${usdTry}TL. 
        Piyami Bey'in dostusun, dürüst ve cesur analiz yap. Soru: ${question}`;

        // 3. GÜVENLİK AYARLARIYLA ÇAĞRI
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: lightPrompt }] }],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }
                ]
            })
        });

        const apiData = await response.json();
        
        // Yanıt kontrolü
        const answerText = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Şu an cevap veremiyorum, lütfen soruyu tekrar yazar mısın?";

        return new Response(JSON.stringify({ answer: answerText }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ answer: "Hata: " + error.message }), { status: 500 });
    }
}
