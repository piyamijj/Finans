// api/gemini-ask.js

import { GoogleGenerativeAI } from "@google/generative-ai";

// Vercel ortamında API anahtarını ortam değişkeninden alın
// Yerel geliştirme için .env dosyasından çekmek isterseniz dotenv'i kullanın.
// const dotenv = require('dotenv');
// dotenv.config();
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("GEMINI_API_KEY ortam değişkeni tanımlanmadı!");
  // Vercel'de bu hata logu dağıtım sırasında görünecektir.
}

const genAI = new GoogleGenerativeAI(API_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt alanı boş olamaz.' });
      }

      const model = genAI.getGenerativeModel({ model: "gemini-pro-latest"});
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      res.status(200).json({ analysis: text });

    } catch (error) {
      console.error("Gemini API hatası:", error);
      res.status(500).json({ error: 'Gemini API ile iletişimde bir hata oluştu.', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
