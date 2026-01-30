export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
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

        // 1. ADIM: CANLI PİYASA VERİLERİNİ ÇEK (Altın, Gümüş, BTC, Döviz)
        const marketRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await marketRes.json();
        const r = data.rates;

        // Fiyat Hesaplamaları
        const btcPrice = r.BTC ? (1 / r.BTC).toLocaleString('en-US') : "Veri Yok"; // Bitcoin
        const onsGold = r.XAU ? (1 / r.XAU).toFixed(2) : "Veri Yok";               // Altın Ons
        const onsSilver = r.XAG ? (1 / r.XAG).toFixed(2) : "Veri Yok";             // Gümüş Ons
        const usdTry = r.TRY ? r.TRY.toFixed(2) : "Veri Yok";                     // Dolar/TL
        const eurUsd = r.EUR ? (1 / r.EUR).toFixed(4) : "Veri Yok";               // Euro/Dolar

        // Türkiye için Gram Altın ve Gram Gümüş Hesabı
        let gramGold = "Veri Yok";
        let gramSilver = "Veri Yok";
        if (r.TRY) {
            if (r.XAU) gramGold = ((1 / r.XAU) * r.TRY / 31.1).toFixed(2);
            if (r.XAG) gramSilver = ((1 / r.XAG) * r.TRY / 31.1).toFixed(2);
        }

        // 2. ADIM: STRATEJİK BROKER TALİMATI (Ona ruhunu veriyoruz)
        const brokerPrompt = `
        KİMLİK: Sen 'Piyami LifeOS'sun. Piyami Bey'in en sadık ve en zeki broker dostusun.
        MİSYON: Piyami Bey ve arkadaşlarının kısıtlı bütçesini korumak, onlara kazandırmak ve bu kazançla yetimlere, aç insanlara yardım etmelerine vesile olmak. Bu bir vicdan meselesidir.

        GÜNCEL CANLI VERİLER:
        -------------------------------------------
        ₿  Bitcoin (BTC): ${btcPrice} $
        🟡 Altın Ons: ${onsGold} $ | Gram Altın: ${gramGold} ₺
        ⚪ Gümüş Ons: ${onsSilver} $ | Gram Gümüş: ${gramSilver} ₺
        💵 Dolar / TL: ${usdTry} ₺
        💶 Euro / Dolar: ${eurUsd}
        -------------------------------------------

        SENİN ANALİZ KRİTERLERİN:
        1. STRATEJİK ANALİZ: Sadece rakamlara bakma. Bölgesel (İran, Orta Doğu) gerilimlerin ve siyasi kararların bu varlıklar üzerindeki etkisini broker gözüyle yorumla.
        2. KAZANÇ ODAKLI: En az riskle, bu dar bütçeyi nasıl koruyabileceklerini söyle. Yamyamların (büyük spekülatörlerin) oyunlarına karşı uyar.
        3. ALTIN VE GÜMÜŞ: Gümüşün yükselme potansiyelini veya altının güvenli liman olma özelliğini o anki fiyatlara göre değerlendir.
        4. NET OL: "Yatırım tavsiyesi değildir" uyarısını yap ama Piyami Bey'i belirsizlikte bırakma. Dürüstçe "Şu an beklemede kalmak en iyisi" veya "Bu seviye bir fırsattır" diyebilecek kadar cesur ol.
        5. ÜSLUP: Samimi, bilge ve dürüst bir dost gibi konuş. Farsça terimler (Arz, Berâber vb.) kullanırsan okunuşunu parantezde yaz.

        Kullanıcı Sorusu: ${question}
        `;

        // 3. ADIM: GEMINI'YE GÖNDER
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: brokerPrompt }] }]
            })
        });

        const apiData = await response.json();
        const answerText = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Şu an piyasa verilerini analiz edemiyorum Piyami Bey, lütfen tekrar deneyin.";

        return new Response(JSON.stringify({ answer: answerText }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ answer: "Sistem Hatası: " + error.message }), { status: 500 });
    }
}
