export const config = { runtime: 'edge' };

export default async function handler(req) {
    if (req.method !== 'POST') return new Response("Hata", { status: 405 });

    try {
        const { question } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        // 1. CANLI VERİLER (Altın, Gümüş, BTC, USD)
        const marketRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await marketRes.json();
        const r = data.rates;

        const btc = r.BTC ? (1 / r.BTC).toLocaleString() : "---";
        const gold = r.XAU ? (1 / r.XAU).toFixed(2) : "---";
        const silver = r.XAG ? (1 / r.XAG).toFixed(2) : "---";
        const usdTry = r.TRY ? r.TRY.toFixed(2) : "---";

        // 2. GİZLİ BROKER TALİMATI (Daha esnek ve profesyonel)
        const brokerPrompt = `Kullanıcı: Piyami Bey. Rolün: Gizli ve dahi bir Broker. 
        Piyasa Verileri: Bitcoin ${btc}$, Ons Altın ${gold}$, Ons Gümüş ${silver}$, Dolar ${usdTry} TL.
        Görev: Piyami Bey'in sermayesini koru, yetimler için kazanç stratejisi üret, siyasi ve ekonomik analiz yap. 
        Soru: ${question}`;

        // 3. EN GÜÇLÜ MODEL VE SIFIR FİLTRE ÇAĞRISI
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: brokerPrompt }] }],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ],
                generationConfig: {
                    temperature: 0.9, // Daha yaratıcı ve derin analiz için
                    topP: 1,
                    maxOutputTokens: 1000
                }
            })
        });

        const apiData = await response.json();
        
        // Yanıtı güvenli bir şekilde alalım
        let answerText = "";
        if (apiData.candidates && apiData.candidates[0].content) {
            answerText = apiData.candidates[0].content.parts[0].text;
        } else {
            // Eğer hala boş dönüyorsa hata detayını yazdır ki çözelim
            answerText = "Broker şu an verileri işleyemedi. Sebep: " + (apiData.promptFeedback?.blockReason || "Bilinmiyor");
        }

        return new Response(JSON.stringify({ answer: answerText }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ answer: "Bağlantı Hatası: " + error.message }), { status: 500 });
    }
}
