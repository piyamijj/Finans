export const config = { runtime: 'edge' };

// OANDA Practice API (Canlı için link değişir)
const OANDA_URL = "https://api-fxpractice.oanda.com/v3";

// --- YARDIMCI ARAÇLAR ---

// 1. Telegram Mesajı Gönderme
async function sendTelegram(text, token, chatId) {
    if (!token || !chatId) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" })
    });
}

// 2. Fiyat Çekme (Genişletilmiş Liste)
async function getOandaPrice(pair, token) {
    try {
        // H4 (4 Saatlik) mumlara bakarak daha sağlam trendleri görsün
        const response = await fetch(`${OANDA_URL}/instruments/${pair}/candles?count=10&granularity=H4&price=M`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    } catch (e) { return null; }
}

// 3. Hesap Bakiyesi
async function getAccountSummary(token, accountId) {
    try {
        const response = await fetch(`${OANDA_URL}/accounts/${accountId}/summary`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    } catch (e) { return null; }
}

export default async function handler(req) {
    try {
        // Hem POST (Siteden) hem GET (Zamanlayıcıdan/Cron) isteği kabul etsin
        const body = req.method === 'POST' ? await req.json() : {};
        const question = body.question || "Genel piyasa taraması yap ve fırsat varsa bildir.";
        const isCron = req.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`; // Güvenlik için

        const oandaKey = process.env.OANDA_API_KEY;
        const oandaAccount = process.env.OANDA_ACCOUNT_ID;
        const geminiKey = process.env.GEMINI_API_KEY;
        const tgToken = process.env.TELEGRAM_BOT_TOKEN;
        const tgChat = process.env.TELEGRAM_CHAT;

        // --- 1. GENİŞ İSTİHBARAT AĞI ---
        // Daha fazla enstrüman ekledik:
        const targets = ["EUR_USD", "XAU_USD", "USD_JPY", "GBP_USD", "BTC_USD"];
        let marketData = "";

        // Tüm hedeflerin verisini çek
        for (const t of targets) {
            const data = await getOandaPrice(t, oandaKey);
            if (data && data.candles && data.candles.length > 0) {
                const last = data.candles[data.candles.length - 1];
                marketData += `${t}: Son=${last.mid.c} (Açılış=${last.mid.o}) | `;
            }
        }

        const acc = await getAccountSummary(oandaKey, oandaAccount);
        const balance = acc?.account?.balance || "???";

        // --- 2. GEMINI ANALİZİ ---
        const prompt = `
        KİMLİK: Piyami LifeOS Otonom Finans Asistanı.
        DURUM: Hesap Bakiyesi ${balance} USD.
        
        PİYASA VERİLERİ (H4 Mumları):
        ${marketData}
        
        GÖREV:
        1. Verileri analiz et. Trendi güçlü olan (net yükseliş veya düşüş) pariteleri seç.
        2. ${balance} USD bakiye ile güvenli bir "Giriş", "Stop" ve "Hedef" noktası belirle.
        3. Eğer çok net bir fırsat yoksa "Nöbetçiler beklemede" de.
        
        ÇIKTI (JSON):
        {
            "global_status": "Piyasa özeti (Tek cümle)",
            "radar_elements": ["Fırsat Görülen 1. Parite", "Riskli Görülen Parite"],
            "strategies": {
                "scalp": {"pair": "...", "action": "BUY/SELL", "price": "...", "tp": "...", "sl": "..."},
                "day": {"pair": "...", "action": "...", "price": "...", "tp": "...", "sl": "..."},
                "swing": {"pair": "...", "action": "...", "price": "...", "tp": "...", "sl": "..."}
            },
            "telegram_message": "Komutanım, ${balance}$ cephane ile tarama bitti. XAU_USD paritesinde YÜKSELİŞ tespit edildi. Giriş önerisi: ..."
        }`;

        const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const gData = await gRes.json();
        let text = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const result = JSON.parse(text);

        // --- 3. TELEGRAM TETİKLEME (EVRİM) ---
        // Eğer bu işlem bir "Cron Job" ise veya siteden özellikle istendiyse Telegram at.
        // Şimdilik sitedeki butona basınca da analiz raporunu Telegram'a atacak şekilde ayarladım.
        if (tgToken && tgChat) {
            // Basit rapor
            await sendTelegram(`📡 *PİYAMİ RADAR RAPORU*\n\n${result.telegram_message}`, tgToken, tgChat);
            
            // İLERİ SEVİYE: İşlem Linki (Henüz aktif değil, mantığı göstermek için)
            // await sendTelegram(`[İŞLEMİ ONAYLA: ${result.strategies.scalp.pair} ${result.strategies.scalp.action}](https://senin-site.com/api/trade?action=buy)`, tgToken, tgChat);
        }

        return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
