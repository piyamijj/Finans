export const config = { runtime: 'edge' };

export default async function handler(req) {
    if (req.method !== 'POST') return new Response("Hata", { status: 405 });

    try {
        const { question } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        // 1. ADIM: GENİŞLETİLMİŞ PİYASA VERİSİ
        const marketRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await marketRes.json();
        const r = data.rates;

        // Pariteler ve Emtialar
        const pairs = {
            usdTry: r.TRY?.toFixed(2),
            eurUsd: (1 / r.EUR)?.toFixed(4),
            gbpUsd: (1 / r.GBP)?.toFixed(4),
            usdJpy: r.JPY?.toFixed(2),
            btc: r.BTC ? (1 / r.BTC).toLocaleString() : "---",
            gold: r.XAU ? (1 / r.XAU).toFixed(2) : "---",
            silver: r.XAG ? (1 / r.XAG).toFixed(2) : "---",
            gramGold: (r.XAU && r.TRY) ? ((1 / r.XAU) * r.TRY / 31.1).toFixed(0) : "---"
        };

        // 2. ADIM: ÖZEL BROKER TALİMATI (RAKİBİ SUSTURAN DETAY)
        const brokerPrompt = `
        KİMLİK: Sen LifeOS'sun. Levent Bey'in profesyonel Forex Terminalisin. 
        MİSYON: Yetimlerin rızkını korumak ve piyasadaki "yamyamları" alt etmek için en ince teknik detayı samimiyetle birleştir.

        GÜNCEL FOREX TABLOSU:
        📊 EUR/USD: ${pairs.eurUsd} | GBP/USD: ${pairs.gbpUsd} | USD/JPY: ${pairs.usdJpy}
        💰 USD/TRY: ${pairs.usdTry} | Gram Altın: ${pairs.gramGold} TL
        ₿ BTC: ${pairs.btc}$ | Ons Altın: ${pairs.gold}$ | Gümüş: ${pairs.silver}$

        ANALİZ GÖREVLERİ:
        1. Sadece fiyat verme; Çin PMI verileri, Fed konuşmaları ve piyasa volatilitesini (oynaklığını) yorumla.
        2. SERMAYE YÖNETİMİ: Piyami Bey'e 100$, 500$ ve 1000$ sermaye için Lot miktarı, Stop-Loss (Zarar Durdur) ve Take-Profit (Kâr Al) seviyelerini net söyle.
        3. SCALPING vs INTRADAY: O anki piyasaya göre hangi strateji daha güvenli? Net bir "Yol Haritası" çiz.
        4. İRAN & TÜRKİYE HATTI: Bölgedeki kur fırlamalarını "operasyonel risk" olarak değerlendir.
        5. RAKİP ANALİZİ: Diğer yapay zekaların verdiği genel geçer bilgileri değil, LifeOS'un "içeriden" ve "cesur" bakış açısını sun.

        Levent Bey'in Sorusu: ${question}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: brokerPrompt }] }],
                safetySettings: [
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            })
        });

        const apiData = await response.json();
        const answerText = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Levent Bey, sinyaller karışık, tekrar bağlanıyorum.";

        return new Response(JSON.stringify({ answer: answerText }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ answer: "Bağlantı Hatası: " + error.message }), { status: 500 });
    }
}
