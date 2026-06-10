import { Router, Request, Response } from 'express';
import db from '../db/database';

const router = Router();

const VALID_TYPES = [
  'Подвеска', 'Рулевое управление', 'Тормозная система',
  'Двигатель', 'Охлаждение', 'Электрика', 'Трансмиссия',
  'Кузов', 'Фильтры'
];

router.post('/diagnose', async (req: Request, res: Response) => {
  const { symptom } = req.body;

  if (!symptom || typeof symptom !== 'string') {
    return res.status(400).json({ error: 'Укажите симптом' });
  }

 try {
    const prompt = `
Ты — эксперт по диагностике автомобилей.
Пользователь описывает симптом: "${symptom}"

Определи какие категории автозапчастей могут быть нужны.
Выбери ТОЛЬКО из этого списка (можно несколько):
${VALID_TYPES.join(', ')}

Ответь СТРОГО в формате JSON (без markdown, без пояснений):
{
  "diagnosis": ["Категория1", "Категория2"],
  "message": "Краткое объяснение проблемы на русском языке, 1-2 предложения"
}
`;

    const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${process.env.YANDEX_API_KEY}`,
        'x-folder-id': process.env.YANDEX_FOLDER_ID!,
      },
      body: JSON.stringify({
        modelUri: `gpt://${process.env.YANDEX_FOLDER_ID}/yandexgpt-lite`,
        completionOptions: {
          stream: false,
          temperature: 0.3,
          maxTokens: 500,
        },
        messages: [
          {
            role: 'user',
            text: prompt,
          },
        ],
      }),
    });

    const data = await response.json() as any;
    console.log('Yandex response:', JSON.stringify(data, null, 2));

    const text = data?.result?.alternatives?.[0]?.message?.text?.trim();

    if (!text) {
      throw new Error('Пустой ответ от YandexGPT');
    }

    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const diagnosis: string[] = (parsed.diagnosis as string[])
      .filter(d => VALID_TYPES.includes(d));

    if (diagnosis.length === 0) {
      diagnosis.push('Двигатель', 'Подвеска');
    }

    const placeholders = diagnosis.map(() => '?').join(', ');
    const products = db.prepare(`
      SELECT
        p.*,
        u.name as seller_name,
        COALESCE(AVG(r.rating), 0) as seller_rating
      FROM products p
      JOIN users u ON u.id = p.seller_id
      LEFT JOIN reviews r ON r.seller_id = p.seller_id
      WHERE p.part_type IN (${placeholders})
        AND p.stock > 0
      GROUP BY p.id
      ORDER BY p.is_promoted DESC, seller_rating DESC
      LIMIT 8
    `).all(...diagnosis);

    return res.json({
      diagnosis,
      products,
      message: parsed.message,
    });

  } catch (err: any) {
    console.error('YandexGPT error:', err);
    return res.status(500).json({ error: 'Ошибка AI сервиса' });
  }
});

export default router;