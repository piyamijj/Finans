const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{ parts: [{ text: brokerPrompt }] }],
        safetySettings: [
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    })
});

// JSON parse güvenli hale getirildi
let apiData;
try {
    apiData = await response.json();
} catch (e) {
    const text = await response.text();
    console.error("Gemini JSON döndürmedi, gelen cevap:", text);

    return new Response(JSON.stringify({
        answer: "Gemini JSON yerine hata metni döndürdü: " + text
    }), { status: 500 });
}

const answerText =
    apiData?.candidates?.[0]?.content?.parts?.[0]?.text
    || "Piyami Bey, sinyaller karışık, tekrar bağlanıyorum.";

return new Response(JSON.stringify({ answer: answerText }), {
    headers: { 'Content-Type': 'application/json' }
});
