export const config = { runtime: 'edge' };

export default async function handler(req) {
    if (req.method !== 'POST') return new Response("Hata", { status: 405 });

    try {
        const { question, strategy } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        // 1. CANLI FİYATLARI ÇEK (Piyasa Nabzı)
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
            usdIrr: r.IRR ? r.IRR.toLocaleString('en-US') : "---" 
        };

        // 3. STRATEJİ BELİRLEME
        let strategyContext = "";
        if (strategy === "scalp") {
            strategyContext = "MOD: SCALPING (Hızlı Vur-Kaç). M1/M5 Grafik. Çok kısa vadeli, anlık kararlar.";
        } else if (strategy === "day") {
            strategyContext = "MOD: GÜNLÜK (Intraday). Gün içi trendleri takip et. Akşam pozisyon kapatma odaklı.";
        } else if (strategy === "swing") {
            strategyContext = "MOD: HAFTALIK (Swing). Büyük resmi analiz et.";
        } else if (strategy === "crisis") {
            strategyContext = "MOD: KRİZ YÖNETİMİ. Varlık Koruma odaklı. Risk alma, parayı koru.";
        }

        // 4. KÜRESEL KOMUTA PROMPT (JSON FORMATI İÇİN EĞİTİLDİ)
        const brokerPrompt = `
        KİMLİK: Sen Piyami LifeOS'sun. Piyami Bey'in Küresel Strateji Komutanısın.
        
        GÖREVİN: Kullanıcı sorusunu ve piyasa verilerini analiz et. Çıktı olarak SADECE ve SADECE saf bir JSON objesi ver. Markdown kullanma (\`\`\`json yazma).
        
        CANLI İSTİHBARAT:
        USD/TRY: ${pairs.usdTry} | USD/IRR: ${pairs.usdIrr} | EUR/USD: ${pairs.eurUsd} | USD/JPY: ${pairs.usdJpy} | ALTIN: ${pairs.gold}

        KULLANICI MODU: ${strategyContext}
        KULLANICI SORUSU: "${question}"

        ÇIKTI FORMATI (Aynen Bunu Doldur):
        {
            "analysis_text": "Buraya piyasa yorumunu HTML formatında yaz (Satır başları için <br>, kalın yazı için <b> kullan). Tonun otoriter ve samimi olsun. Yetim hakkını koruma vurgusu yap.",
            "signal": {
                "active": true, 
                "pair": "Örn: USD/JPY",
                "action": "SELL (veya BUY)",
                "type": "MARKET (veya LIMIT)",
                "price": "Örn: 155.45",
                "amount": "1.000",
                "stop_loss": "Örn: 155.65",
                "take_profit": "Örn: 154.00",
                "chart_link": "TradingView Linki"
            }
        }

        Eğer net bir işlem fırsatı yoksa "signal": {"active": false} yap.
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: brokerPrompt }] }]
            })
        });

        const apiData = await response.json();
        let rawText = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        // JSON temizliği (Markdown varsa kaldırır)
        rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

        return new Response(rawText, {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ 
            analysis_text: "Sistem Hatası: " + error.message, 
            signal: { active: false } 
        }), { status: 500 });
    }
}
