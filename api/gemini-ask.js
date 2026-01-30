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

        const btc = r.BTC ? (1 / r.BTC).toLocaleString() : "---";
        const gold = r.XAU ? (1 / r.XAU).toFixed(2) : "---";
        const silver = r.XAG ? (1 / r.XAG).toFixed(2) : "---";
        const usdTry = r.TRY ? r.TRY.toFixed(2) : "---";

        // 2. BROKER TALİMATI (Daha sade ama derin)
        const brokerPrompt = `Analist: Piyami LifeOS. 
        Mevcut Fiyatlar: BTC: ${btc}$, Altın: ${gold}$, Gümüş: ${silver}$, USD/TRY: ${usdTry}. 
        Kullanıcı Piyami Bey'e profesyonel ve cesur finansal strateji sun.
        Soru: ${question}`;

        // 3. GÜVENLİ ÇAĞRI (Hata Yönetimi Eklenmiş)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: brokerPrompt }] }],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            })
        });

        const apiData = await response.json();

        // KRİTİK NOKTA: Yanıt var mı yok mu kontrolü
        let answerText = "";
        
        if (apiData.candidates && apiData.candidates[0] && apiData.candidates[0].content) {
            answerText = apiData.candidates[0].content.parts[0].text;
        } else if (apiData.promptFeedback && apiData.promptFeedback.blockReason) {
            answerText = "Broker Engellendi. Sebep: " + apiData.promptFeedback.blockReason;
        } else if (apiData.error) {
            answerText = "Google API Hatası: " + apiData.error.message;
        } else {
            answerText = "Bilinmeyen bir nedenle analiz yapılamadı. Lütfen farklı bir şekilde sorunuz.";
        }

        return new Response(JSON.stringify({ answer: answerText }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ answer: "Bağlantı Hatası: " + error.message }), { status: 500 });
    }
}
