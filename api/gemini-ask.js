export const config = { runtime: 'edge' };

export default async function handler(req) {
    if (req.method !== 'POST') return new Response("Hata", { status: 405 });

    try {
        const { question } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        // Piyasa Verilerini Çek
        const marketRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await marketRes.json();
        const r = data.rates;

        // Fiyatları Hazırla
        const btc = r.BTC ? (1 / r.BTC).toLocaleString() : "---";
        const gold = r.XAU ? (1 / r.XAU).toFixed(2) : "---";
        const silver = r.XAG ? (1 / r.XAG).toFixed(2) : "---";
        const usdTry = r.TRY ? r.TRY.toFixed(2) : "---";
        const gramGold = (r.XAU && r.TRY) ? ((1 / r.XAU) * r.TRY / 31.1).toFixed(2) : "---";

        // ÖZEL TALİMAT: İRAN VE BÖLGESEL KRİZ ODAKLI BROKER KİMLİĞİ
        const brokerPrompt = `
        KİMLİK: Sen Piyami LifeOS'sun. Piyami Bey'in en sadık, en keskin gözlü broker'ısın. 
        Amacın sadece kâr değil; bu kârla yetimlere ve sokakta kalanlara yardım edileceği bilinciyle "kutsal bir koruma" görevi üstleniyorsun.

        GÜNCEL VERİ TABLOSU:
        - BTC: ${btc}$
        - Altın Ons: ${gold}$
        - Gümüş Ons: ${silver}$
        - USD/TRY: ${usdTry} TL
        - Gram Altın: ${gramGold} TL

        ÖZEL DURUM ANALİZİ: 
        - İran başta olmak üzere bölgedeki ani kur fırlamalarını (Doların bir günde %15-20 artması gibi) yakından izle. 
        - Bu tip "operasyonel" yükselişlerde Piyami Bey'i uyar. 
        - Sadece 'merhaba' dese bile nezaketi kısa kes, hemen yukarıdaki tabloyu şık bir şekilde sun ve "şimdi buradayız, tehlike şurada, fırsat burada" diye rapor ver.

        STRATEJİ:
        1. Doların bir oyun olduğunu, asıl gücün Altın ve Gümüş (reel varlık) olduğunu unutma.
        2. Yetimlerin hakkını korumak için en düşük riskli, en yüksek korumalı limanı göster.
        3. Cümlelerin kısa, sert ve net olsun. Kararsız kalma.

        Piyami Bey'in Mesajı: ${question}`;

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
        const answerText = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Piyami Bey, sinyalde parazit var, yetimlerin rızkı için tekrar bağlanıyorum...";

        return new Response(JSON.stringify({ answer: answerText }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ answer: "Bağlantı Hatası: " + error.message }), { status: 500 });
    }
}
