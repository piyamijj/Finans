export const config = {
    runtime: 'edge', // En hızlı ve hatasız çalışma modu
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ answer: "Sadece POST isteği kabul edilir." }), { status: 405 });
    }

    try {
        const { question } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ answer: "API Key Eksik!" }), { status: 500 });
        }

        // Gemini API Çağrısı
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Sen Piyami LifeOS finans asistanısın. Şu soruya kısa ve dürüst cevap ver: " + question }] }]
            })
        });

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Google cevap vermedi.";

        return new Response(JSON.stringify({ answer: text }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ answer: "Sunucu Hatası: " + error.message }), { status: 500 });
    }
}
