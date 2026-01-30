export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    // Sadece POST isteği kabul et
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ answer: "Sadece POST isteği kabul edilir." }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await req.json();
        const { question } = body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ answer: "API Anahtarı bulunamadı!" }), { status: 500 });
        }

        // 1. ADIM: CANLI VERİLERİ ÇEK (Altın, Bitcoin, Döviz)
        // Bu API ücretsizdir ve genelde güncel kurları verir.
        const marketRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await marketRes.json();
        const rates = data.rates;

        // Fiyat Hesaplamaları (Matematiksel Dönüşümler)
        // Bitcoin (BTC): 1 Dolar kaç BTC eder? -> Tersi bize BTC fiyatını verir.
        const btcPrice = rates.BTC ? (1 / rates.BTC).toFixed(2) : "Veri Yok";
        
        // Altın (XAU - Ons): 1 Dolar kaç Ons eder? -> Tersi bize Ons fiyatını verir.
        const goldOunce = rates.XAU ? (1 / rates.XAU).toFixed(2) : "Veri Yok";
        
        // Dolar/TL
        const usdTry = rates.TRY ? rates.TRY.toFixed(2) : "Veri Yok";
        
        // Gram Altın (TL) Hesabı: (Ons Fiyatı * Dolar Kuru) / 31.1
        let gramAltin = "Veri Yok";
        if (rates.XAU && rates.TRY) {
            gramAltin = ((1 / rates.XAU) * rates.TRY / 31.1).toFixed(2);
        }

        // Euro/Dolar Paritesi
        const eurUsd = rates.EUR ? (1 / rates.EUR).toFixed(4) : "Veri Yok";

        // 2. ADIM: PİYAMİ LIFEOS'A GİZLİ BİLGİLERİ VER
        const systemPrompt = `
        Sen 'Piyami LifeOS'sun. Kullanıcın Piyami Bey.
        Sen sıradan bir bot değil, dünya piyasalarına hakim usta bir Forex ve Kripto analistisin.
        
        ŞU ANKİ CANLI PİYASA FİYATLARI (Analizini bunlara göre yap):
        ---------------------------------------------------
        💰 Dolar / TL      : ${usdTry} ₺
        💶 Euro / Dolar    : ${eurUsd}
        🟡 Altın (Ons)     : ${goldOunce} $
        ✨ Gram Altın (TL) : ${gramAltin} ₺ (Yaklaşık)
        ₿  Bitcoin (BTC)   : ${btcPrice} $
        ---------------------------------------------------
        
        GÖREVİN:
        1. Piyami Bey'in sorusunu yukarıdaki CANLI verilere göre yanıtla.
        2. Eğer kullanıcı "Bitcoin alınır mı?" veya "Altın ne olur?" derse, şu anki fiyata bakarak destek/direnç yorumu yap.
        3. Asla "bilmiyorum" deme. Veriler önünde. Teknik analizci gibi konuş (RSI, Trend, Boğa/Ayı piyasası terimlerini yerinde kullan).
        4. Cevabın samimi, kısa ve net olsun. Tavsiye verirken "Yatırım tavsiyesi değildir (YTD)" uyarısını dostça ekle.

        Kullanıcı Sorusu: ${question}
        `;

        // 3. ADIM: GEMINI'YE GÖNDER
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }]
            })
        });

        const apiData = await response.json();
        const answerText = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Analiz şu an yapılamıyor.";

        return new Response(JSON.stringify({ answer: answerText }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ answer: "Sistem Hatası: " + error.message }), { status: 500 });
    }
}
