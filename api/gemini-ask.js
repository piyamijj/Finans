export const config = { runtime: 'edge' };

// OANDA Practice API Adresi (Canlı hesap için link değişir, şu an practice modundayız)
const OANDA_URL = "https://api-fxpractice.oanda.com/v3";

// 1. OANDA'dan Fiyat Verisi Çeken Fonksiyon (Mum Grafiği)
async function getOandaPrice(pair, token) {
    try {
        // H1 (1 Saatlik) grafikten son 5 mumu çekiyoruz
        const response = await fetch(`${OANDA_URL}/instruments/${pair}/candles?count=5&granularity=H1&price=M`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        return data;
    } catch (e) {
        return null;
    }
}

// 2. OANDA'dan Hesap Bakiyesi Çeken Fonksiyon
async function getAccountSummary(token, accountId) {
    try {
        const response = await fetch(`${OANDA_URL}/accounts/${accountId}/summary`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    } catch (e) {
        return null;
    }
}

export default async function handler(req) {
    try {
        const { question } = await req.json();

        // .env dosyasındaki değişkenleri alıyoruz
        const oandaKey = process.env.OANDA_API_KEY;
        const oandaAccount = process.env.OANDA_ACCOUNT_ID;
        const geminiKey = process.env.GEMINI_API_KEY;

        // --- ADIM 1: GERÇEK VERİLERİ TOPLA ---
        
        // Hesap Bakiyesi
        const accData = await getAccountSummary(oandaKey, oandaAccount);
        const balance = accData?.account?.balance || "Bilinmiyor";
        const marginAvail = accData?.account?.marginAvailable || "0";

        // Parite Verileri (OANDA sembol formatı: EUR_USD)
        const eurData = await getOandaPrice("EUR_USD", oandaKey);
        const goldData = await getOandaPrice("XAU_USD", oandaKey);
        const jpyData = await getOandaPrice("USD_JPY", oandaKey);

        // Mum verisini okunabilir metne çeviren yardımcı
        const parseCandle = (d) => {
            if (!d || !d.candles || d.candles.length === 0) return "Veri alınamadı";
            const last = d.candles[d.candles.length - 1]; // Son mum
            return `Kapanış: ${last.mid.c}, En Yüksek: ${last.mid.h}, En Düşük: ${last.mid.l}`;
        };

        const technicalReport = `
        [HESAP DURUMU]
        Bakiye: ${balance} USD
        Kullanılabilir Marjin: ${marginAvail} USD

        [PİYASA VERİLERİ (Son 1 Saatlik Mum)]
        EUR/USD: ${parseCandle(eurData)}
        XAU/USD (ALTIN): ${parseCandle(goldData)}
        USD/JPY: ${parseCandle(jpyData)}
        `;

        // --- ADIM 2: GEMINI'YE RAPOR SUN VE EMİR AL ---
        
        const brokerPrompt = `
        KİMLİK: Sen 'Piyami LifeOS', seçkin bir finansal operasyon yapay zekasısın. 
        MİSYON: Aşağıdaki GERÇEK TEKNİK VERİLERİ analiz et ve kullanıcıya para kazandıracak stratejiler üret.

        SAHA RAPORU:
        ${technicalReport}

        KULLANICI SORUSU: "${question}"

        GÖREVLER:
        1. Kullanıcının bakiyesini (${balance} USD) dikkate alarak risk yönetimi yap.
        2. Scalp, Günlük ve Swing işlemleri için XAU/USD, EUR/USD veya USD/JPY arasından fırsat bul.
        3. Trend yönüne göre (Buy/Sell) net fiyatlar ver.

        ÇIKTI FORMATI (SADECE SAF JSON, YORUM YOK):
        {
            "global_status": "Kısa piyasa yorumu ve bakiye durumu (Örn: Komutanım, 10.000$ bakiyemiz hazır. Altın direnci zorluyor.)",
            "radar_elements": ["XAU/USD (Yükseliş Trendi)", "USD/JPY (Düzeltme Bekleniyor)"],
            "strategies": {
                "scalp": {"pair": "EUR/USD", "action": "SELL", "price": "1.0850", "tp": "1.0820", "sl": "1.0870"},
                "day": {"pair": "USD/JPY", "action": "BUY", "price": "150.20", "tp": "151.00", "sl": "149.80"},
                "swing": {"pair": "XAU/USD", "action": "BUY", "price": "2035", "tp": "2080", "sl": "2010"}
            }
        }`;

        // Gemini API Çağrısı
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: brokerPrompt }] }] })
        });

        const apiData = await response.json();
        let rawText = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        
        // Markdown temizliği (```json ... ``` kısımlarını siler)
        rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

        return new Response(rawText, { headers: { 'Content-Type': 'application/json' } });

    } catch (e) {
        return new Response(JSON.stringify({ 
            global_status: "HATA: OANDA bağlantısı kurulamadı. API Keyleri kontrol edin.",
            radar_elements: ["Veri Yok"],
            strategies: {
                scalp: {pair: "-", action: "-", price: "-", tp: "-", sl: "-"},
                day: {pair: "-", action: "-", price: "-", tp: "-", sl: "-"},
                swing: {pair: "-", action: "-", price: "-", tp: "-", sl: "-"}
            },
            error_detail: e.message 
        }), { headers: { 'Content-Type': 'application/json' } });
    }
}
