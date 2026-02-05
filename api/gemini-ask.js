export const config = { runtime: 'edge' };

const OANDA_URL = "https://api-fxpractice.oanda.com/v3";

async function sendTelegram(text, token, chatId) {
    if (!token || !chatId) return;
    return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" })
    });
}

async function getMarketData(token) {
    const targets = ["EUR_USD", "XAU_USD", "USD_JPY", "GBP_USD", "USD_TRY"];
    let report = "";
    for (const t of targets) {
        try {
            const res = await fetch(`${OANDA_URL}/instruments/${t}/candles?count=1&granularity=H1&price=M`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const d = await res.json();
            if (d.candles) {
                const c = d.candles[0].mid;
                report += `${t}: Fiyat ${c.c} | `;
            }
        } catch (e) {}
    }
    return report;
}

export default async function handler(req) {
    const oandaKey = process.env.OANDA_API_KEY;
    const oandaAccount = process.env.OANDA_ACCOUNT_ID;
    const geminiKey = process.env.GEMINI_API_KEY;
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChat = process.env.TELEGRAM_CHAT;

    try {
        const marketReport = await getMarketData(oandaKey);
        
        const prompt = `
        KİMLİK: Piyami LifeOS Otonom Operatör.
        VERİLER: ${marketReport}
        GÖREV: Piyasayı analiz et. Eğer çok güçlü bir Al veya Sat fırsatı varsa (Örn: Altın direnci kırdıysa), bunu bir 'OPERASYON EMRİ' olarak bildir. Eğer piyasa durgunsa sadece 'Nöbet devam ediyor' mesajı hazırla.
        
        ÇIKTI FORMATI (JSON):
        {
            "global_status": "Kısa durum",
            "radar_elements": ["Unsur 1", "Unsur 2"],
            "strategies": {
                "scalp": {"pair": "...", "action": "BUY", "price": "...", "tp": "...", "sl": "..."},
                "day": {"pair": "...", "action": "...", "price": "...", "tp": "...", "sl": "..."},
                "swing": {"pair": "...", "action": "...", "price": "...", "tp": "...", "sl": "..."}
            },
            "telegram_alert": "🚨 *PİYAMİ OPERASYON EMRİ* 🚨\n\nAnaliz: [Buraya teknik nedenleri yaz]\n\n📍 Çift: XAU/USD\n📈 İşlem: BUY\n🎯 Hedef: 2050\n🛡️ Stop: 2030\n\nOnayınız bekleniyor komutanım!"
        }`;

        const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const gData = await gRes.json();
        let raw = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();
        const result = JSON.parse(raw);

        // Telegram'a raporu gönder (Her taramada veya sadece önemli bir şey bulduğunda)
        if (tgToken && tgChat) {
            await sendTelegram(result.telegram_alert, tgToken, tgChat);
        }

        return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
