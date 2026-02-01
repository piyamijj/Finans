export const config = { runtime: 'edge' };

export default async function handler(req) {
    if (req.method !== 'POST') return new Response("Hata", { status: 405 });

    try {
        const { question, strategy } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        // 1. CANLI FİYATLARI ÇEK
        const marketRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await marketRes.json();
        const r = data.rates;

        // 2. PARİTELER VE KRİTİK VERİLER
        const pairs = {
            usdTry: r.TRY?.toFixed(2),
            eurUsd: (1 / r.EUR)?.toFixed(4),
            gbpUsd: (1 / r.GBP)?.toFixed(4),
            usdJpy: r.JPY?.toFixed(2),
            btc: r.BTC ? (1 / r.BTC).toLocaleString('en-US') : "---",
            gold: r.XAU ? (1 / r.XAU).toFixed(2) : "---",
            usdIrr: r.IRR ? r.IRR.toLocaleString('en-US') : "---" // İran Riyali
        };

        // 3. STRATEJİ BELİRLEME (Kullanıcının Seçimine Göre)
        let strategyContext = "";
        if (strategy === "scalp") {
            strategyContext = "MOD: SCALPING (Hızlı Vur-Kaç). Dakikalık grafiklere odaklan. Risk/Ödül oranı yüksek, çok kısa vadeli işlemler öner.";
        } else if (strategy === "day") {
            strategyContext = "MOD: GÜNLÜK (Intraday). Gün içi trendleri takip et. Akşam pozisyon kapatma odaklı konuş.";
        } else if (strategy === "swing") {
            strategyContext = "MOD: HAFTALIK (Swing). Büyük resmi, siyasi olayları ve trend dönüşlerini analiz et.";
        } else if (strategy === "crisis") {
            strategyContext = "MOD: KRİZ YÖNETİMİ. İran/Türkiye hattındaki devalüasyon, savaş riski veya ani kur şoklarına karşı 'Varlık Koruma' odaklı konuş.";
        }

        // 4. KÜRESEL KOMUTA PROMPT (Panoptikon Bakışı)
        const brokerPrompt = `
        KİMLİK: Sen Piyami LifeOS'sun. Piyami Bey'in Küresel Strateji Komutanısın.
        
        GÖREVİN: Dünyayı tek bir top gibi gör. Siyaset, Ekonomi, Savaş Riskleri ve Forex verilerini birleştirerek "Yetimlerin Hakkını Koruyan" en kârlı hamleyi bul.
        
        CANLI İSTİHBARAT (Fiyatlar):
        -------------------------------------------
        🇺🇸/🇹🇷 USD/TRY: ${pairs.usdTry} 
        🇮🇷 USD/IRR (İran): ${pairs.usdIrr}
        🇪🇺 EUR/USD: ${pairs.eurUsd} | 🇯🇵 USD/JPY: ${pairs.usdJpy}
        🟡 ONS ALTIN: ${pairs.gold}$ | ₿ BTC: ${pairs.btc}$
        -------------------------------------------

        KULLANICI SEÇİMİ: ${strategyContext}
        KULLANICI SORUSU: "${question}"

        YAPMAN GEREKENLER:
        1. **Küresel Röntgen:** Soruyu cevaplarken sadece fiyata bakma. İran'daki gerginlik, ABD'deki faiz veya Avrupa'daki enerji krizini hesaba kat.
        2. **Nokta Atışı Plan:** Belirlenen stratejiye (${strategy}) göre net GİRİŞ, STOP ve HEDEF fiyatı ver. "Şuradan dönerse al" de.
        3. **İzleme Sayacı:** Kullanıcıya o an hangi grafiği (Örn: XAUUSD veya EURUSD) izlemesi gerektiğini söyle.
        4. **TradingView Linki:** Analizinin en sonunda, önerdiğin paritenin TradingView linkini "LINK: https://tr.tradingview.com/chart/?symbol=..." formatında ver. (Semboller: FX:EURUSD, FX:USDTRY, OANDA:XAUUSD, BINANCE:BTCUSDT vb.)

        TON: Ciddi, otoriter ama "Bizim Çocuk" samimiyetinde. Hata payı bırakmayan netlikte konuş.
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: brokerPrompt }] }]
            })
        });

        const apiData = await response.json();
        const answerText = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Bağlantı zayıf komutanım, tekrar deneyin.";

        return new Response(JSON.stringify({ answer: answerText }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ answer: "Sistem Hatası: " + error.message }), { status: 500 });
    }
}
