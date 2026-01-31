export const config = { runtime: 'edge' };

export default async function handler(req) {
    if (req.method !== 'POST') return new Response("Hata", { status: 405 });

    try {
        const { question } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        // Piyasa Verilerini Çek (Daha geniş bir veri seti için API çağrısı)
        const marketRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await marketRes.json();
        const r = data.rates;

        // VERİLER (Yedekli Kontrol)
        const btc = r.BTC ? (1 / r.BTC).toLocaleString() : "Hizmet Dışı";
        const gold = r.XAU ? (1 / r.XAU).toFixed(2) : "Hizmet Dışı";
        const silver = r.XAG ? (1 / r.XAG).toFixed(2) : "Hizmet Dışı";
        
        // Bölgesel Kurlar
        const usdTry = r.TRY ? r.TRY.toFixed(2) : "---";
        const usdIrr = r.IRR ? r.IRR.toLocaleString() : "---"; // İRAN RİALİ/TÜMENİ
        
        // Gram Altın Hesaplamaları
        const gramGoldTry = (r.XAU && r.TRY) ? ((1 / r.XAU) * r.TRY / 31.1).toFixed(0) : "---";

        // BROKER TALİMATI: İRAN VE TÜRKİYE KIYASLAMALI
        const brokerPrompt = `
        KİMLİK: Sen Piyami LifeOS'sun. Piyami Bey şu an İran'da. Sen onun bölgesel strateji uzmanı ve broker'ısın.
        GÖREV: Sadece Türkiye değil, İran ve küresel piyasalar arasındaki "arbitraj" ve "devalüasyon" risklerini analiz et. 
        
        GÜNCEL VERİLER:
        🌍 USD/TRY: ${usdTry} ₺
        🇮🇷 USD/IRR (İran): ${usdIrr} Rial (Resmi Kur)
        🟡 Altın Ons: ${gold} $ | Gram Altın: ${gramGoldTry} ₺
        ₿ BTC: ${btc} $ | Gümüş: ${silver} $

        ANALİZ KURALLARI:
        1. İran'daki kur sıçramalarını (140'tan 156'ya çıkışlar gibi) Türkiye'deki devalüasyon riskiyle bağdaştır. 
        2. "Dolar bir oyundur" felsefesinden ödün verme. Gümüş ve Altın'ı "gerçek para" olarak savun.
        3. Yetimlerin rızkını korumak için en güvenli, en hızlı likiditeye sahip varlığı öner (Altın mı, BTC mi?).
        4. Samimi ol ama ciddiyeti elden bırakma. İran'daki hayat pahalılığı ile Türkiye'yi kıyasla.
        5. Her cevapta bir "Fırsat Tablosu" oluştur.

        Piyami Bey'in Mesajı: ${question}`;

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
        const answerText = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Veri akışında bir kesinti var Piyami Bey, hemen toparlıyorum.";

        return new Response(JSON.stringify({ answer: answerText }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ answer: "Bağlantı Hatası: " + error.message }), { status: 500 });
    }
}
