// api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Metod İzni Yok');

  const { question, history, image } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  // Senin seçtiğin model adı
  const MODEL_NAME = "gemini-pro-latest"; 

  // Senin belirlediğin sistem talimatı
  const SYSTEM_INSTRUCTION = `
    Sen Piyami LifeOS'sun. Kullanıcın Piyami Bey.
    Finansal analiz yaparken dürüst ve samimi ol.
    Zarara girmesini önleyecek şekilde rehberlik et.
    Farsça terim kullanırsan okunuşunu parantezde yaz.
  `;

  try {
    let contentsArray = [];

    // Geçmişi ekle (Eski sistemimizdeki mantık)
    if (history && history.length > 0) {
      history.forEach(msg => {
        contentsArray.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }

    // Yeni mesaj ve Resim hazırlığı
    const newParts = [{ text: question || "Finansal bir analiz yap." }];
    
    if (image) {
      const base64Data = image.includes('base64,') ? image.split('base64,')[1] : image;
      newParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data
        }
      });
    }

    contentsArray.push({ role: "user", parts: newParts });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents: contentsArray,
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ answer: "Google Hatası: " + data.error.message });
    }

    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Cevap yok.";
    res.status(200).json({ answer });

  } catch (error) {
    res.status(500).json({ answer: "Sunucu hatası: " + error.message });
  }
}
