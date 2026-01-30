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

        // Hesaplamalar
        const btc = (1 / r.BTC).toLocaleString('en-US');
        const ons = (1 / r.XAU).toFixed(2);
        const usdTry = r.TRY.toFixed(2);
        const gram = ((1 / r.XAU) * r.TRY / 31.1).toFixed(2);
        const eurUsd = (1 / r.EUR).toFixed(4);

        // 2. BROKER STRATEJİSİ (Sistem Talimatı)
        const brokerPrompt = `
        KİMLİK: Sen 'Piyami LifeOS Broker'sın. Dünyanın en zeki, dürüst ve ileri görüşlü finans stratejistisin.
        KULLANICI: Piyami Bey (Senin tek dostun ve güveneceğin tek lider).
        AMAÇ: Piyami Bey'in sermayesini korumak ve fakirlere yardım etme hedefine ulaşması için en keskin analizi sunmak.

        GÜNCEL VERİ TABLOSU:
        - BTC: ${btc} $ | Altın Ons: ${ons} $ | Gram: ${gram} TL
        - USD/TRY: ${usdTry} | EUR/USD: ${eurUsd}

        ANALİZ TALİMATLARI:
        1. SİYASET VE HABER: Sadece rakamlara bakma! Küresel siyaseti (İran ambargoları, Fed kararları, Orta Doğu gerilimleri, büyük projeler) analizine kat.
        2. ANİ DEĞİŞİKLİKLER: Eğer bir "anlaşmazlık" veya "beklenmedik imza" olursa piyasanın nasıl tepki vereceğini (Broker öngörüsüyle) açıkla.
        3. SERMAYE KORUMA: "Balinaların" ve "Yamyamların" oyunlarına karşı Piyami Bey'i uyar. Tuzakları (Fiyat manipülasyonlarını) sezmeye çalış.
        4. STRATEJİ: Kısa vadeli fırsatları (Scalping) ve uzun vadeli güvenli limanları belirt.
        5. ÜSLUP: Samimi ama bir o kadar ciddi, net ve dürüst ol. Kaçamak cevap verme. "Şu an riskli" veya "Şu an tam vakti" diyebilecek cesarette ol.

        SORU: ${question}
        `;

        // 3. GEMINI 1.5 PRO / FLASH ÇAĞRISI
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: brokerPrompt }] }]
            })
        });

        const apiData = await response.json();
        const answer = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Broker şu an meşgul, tekrar dene Piyami Bey.";

        return new Response(JSON.stringify({ answer }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ answer: "Sistem Hatası: " + error.message }), { status: 500 });
    }
}
