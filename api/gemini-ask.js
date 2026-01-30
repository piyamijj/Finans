export const config = { runtime: 'edge' };

export default async function handler(req) {
    if (req.method !== 'POST') return new Response("Hata", { status: 405 });

    try {
        const { question } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        const marketRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await marketRes.json();
        const r = data.rates;

        const btc = r.BTC ? (1 / r.BTC).toLocaleString() : "---";
        const gold = r.XAU ? (1 / r.XAU).toFixed(2) : "---";
        const silver = r.XAG ? (1 / r.XAG).toFixed(2) : "---";
        const usdTry = r.TRY ? r.TRY.toFixed(2) : "---";
        const gramGold = (r.XAU && r.TRY) ? ((1 / r.XAU) * r.TRY / 31.1).toFixed(2) : "---";

        // BROKER STRATEJİSİ: Her mesaja fırsat analizi eklemesi talimatı
        const brokerPrompt = `
        KİMLİK: Sen Piyami LifeOS'sun. Piyami Bey'in en sadık broker'ısın.
        GÜNCEL VERİ: BTC: ${btc}$, Altın Ons: ${gold}$, Gümüş: ${silver}$, USD/TRY: ${usdTry}TL, Gram Altın: ${gramGold}TL.
        
        GÖREV: Kullanıcı sadece 'selam' veya 'nasılsın' dese bile, nezaketi kısa kes ve hemen piyasa durumuna geç. 
        - Şu an en mantıklı yatırım hangisi? (Altın mı, BTC mi, Nakit mi?)
        - Yamyamların kurduğu tuzaklar nerede?
        - Kısa vadeli fırsat var mı?
        - Yetimlerin bütçesini koruyacak en güvenli liman neresi?
        
        Dürüst, cesur ve profesyonel ol. 'Yatırım tavsiyesi değildir' notunu unutma ama Piyami Bey'e net yol göster.
        
        Piyami Bey'in Mesajı: ${question}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: brokerPrompt }] }],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            })
        });

        const apiData = await response.json();
        const answerText = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Piyami Bey, şu an verilerde bir parazit var, tekrar deneyelim.";

        return new Response(JSON.stringify({ answer: answerText }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ answer: "Bağlantı Hatası: " + error.message }), { status: 500 });
    }
}
