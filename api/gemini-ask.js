export const config = {
    runtime: 'edge', // En hızlı ve hatasız çalışma modu
};

export default async function handler(req) {
    // Sadece POST isteği kabul et
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ answer: "Sadece POST isteği kabul edilir." }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // İsteği oku
        const body = await req.json();
        const { question } = body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ answer: "API Anahtarı Vercel'de eksik!" }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Google Gemini API'ye Doğrudan Bağlan (Kütüphanesiz)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "Sen Piyami LifeOS finans asistanısın. Samimi, dürüst ve kısa cevap ver. Soru: " + question
                    }]
                }]
            })
        });

        const data = await response.json();

        // Cevabı ayıkla
        let answerText = "Cevap alınamadı.";
        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            answerText = data.candidates[0].content.parts[0].text;
        } else if (data.error) {
            answerText = "Google Hatası: " + data.error.message;
        }

        // Sonucu gönder
        return new Response(JSON.stringify({ answer: answerText }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ answer: "Sunucu Bağlantı Hatası: " + error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
