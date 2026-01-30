export const config = { runtime: 'edge' };

export default async function handler(req) {
    if (req.method !== 'POST') return new Response("Hata", { status: 405 });

    try {
        const { question } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        // 1. CANLI PİYASA VERİLERİ (Küresel Akış)
        const marketRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await marketRes.json();
        const r = data.rates;

        // Hesaplamalar (Bitcoin, Altın, Gümüş, Döviz)
        const btc = r.BTC ? (1 / r.BTC).toLocaleString('en-US') : "---";
        const onsGold = r.XAU ? (1 / r.XAU).toFixed(2) : "---";
        const onsSilver = r.XAG ? (1 / r.XAG).toFixed(2) : "---";
        const usdTry = r.TRY ? r.TRY.toFixed(2) : "---";
        const eurUsd = r.EUR ? (1 / r.EUR).toFixed(4) : "---";
        
        // Gram Hesaplamaları (TL bazlı)
        const gramGold = (r.XAU && r.TRY) ? ((1 / r.XAU) * r.TRY / 31.1).toFixed(2) : "---";
        const gramSilver = (r.XAG && r.TRY) ? ((1 / r.XAG) * r.TRY / 31.1).toFixed(2) : "---";

        // 2. BROKER STRATEJİSİ (Gelişmiş Talimat)
        const brokerPrompt = `
        KİMLİK: Sen 'Piyami LifeOS Broker'sın. Piyami Bey'in en sadık finans stratejistisin.
        AMACIN: Piyami Bey ve dostlarının bütçesini korumak, yamyamlara yem etmemek ve mazlumlara yardım etme hedeflerine ulaşmalarını sağlamak.

        GÜNCEL CANLI VERİ TABLOSU:
        -------------------------------------------
        ₿ BTC: ${btc} $
        🟡 Altın Ons: ${onsGold} $ | Gram Altın: ${gramGold} ₺
        ⚪ Gümüş Ons: ${onsSilver} $ | Gram Gümüş: ${gramSilver} ₺
        💵 USD/TRY: ${usdTry} ₺ | 💶 EUR/USD: ${eurUsd}
        -------------------------------------------

        BROKER TALİMATLARI:
        1. STRATEJİK ÖNGÖRÜ: Sadece fiyat söyleme! Siyasi gerilimler, İran piyasasındaki kur baskısı ve bölgesel projelerin (gaz, petrol vb.) fiyatları nereye itebileceğini Broker gözüyle analiz et.
        2. GÜMÜŞ ANALİZİ: Gümüşün altına göre rasyosunu ve potansiyelini mutlaka değerlendir.
        3. RİSK YÖNETİMİ: Piyasadaki spekülatörlerin oyunlarını sez ve Piyami Bey'i "şu an riskli" veya "bu bir fırsat" diyerek açıkça uyar.
        4. ÜSLUP: Samimi, dürüst ve net ol. Karmaşık cümleler kurma, bir dost gibi yol göster.

        SORU: ${question}
        `;

        // 3. GEMINI ÇAĞRISI
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: brokerPrompt }] }]
            })
        });

        const apiData = await response.json();
        const answer = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Broker şu an derin analizde, lütfen tekrar dene Piyami Bey.";

        return new Response(JSON.stringify({ answer }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ answer: "Sistem Hatası: " + error.message }), { status: 500 });
    }
}
