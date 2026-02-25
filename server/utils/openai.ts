/**
 * OpenAI утилиты — Whisper (транскрипция) + GPT (отчёты)
 *
 * Whisper:
 * - Принимает голосовое из Telegram (OGG/OPUS)
 * - Возвращает текст транскрипции
 * - Модель: whisper-1
 *
 * GPT:
 * - Генерирует отчёты на основе транскрипций
 * - Использует шаблоны промптов из ReportPrompt
 * - Модель: gpt-4o-mini (баланс качества/цены)
 *
 * Env: OPENAI_API_KEY
 */
import OpenAI from 'openai'

let _client: OpenAI | null = null

/**
 * Получить OpenAI клиент (singleton)
 */
function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY не задан в env')
    }
    _client = new OpenAI({ apiKey })
  }
  return _client
}

/**
 * Транскрибировать голосовое сообщение через Whisper
 *
 * @param audioBuffer - Buffer с аудио-данными (OGG/OPUS из Telegram)
 * @param filename - Имя файла (нужно для OpenAI, расширение важно)
 * @returns Текст транскрипции и определённый язык
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string = 'voice.ogg'
): Promise<{
  text: string
  language?: string
  durationMs: number
}> {
  const client = getClient()
  const startTime = Date.now()

  console.log(`[openai] Transcribing audio: ${filename}, size: ${audioBuffer.length} bytes`)

  // Создаём File-like объект для OpenAI SDK
  const file = new File([audioBuffer], filename, {
    type: 'audio/ogg'
  })

  const response = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'ru', // Подсказка: основной язык — русский
    response_format: 'verbose_json'
  })

  const durationMs = Date.now() - startTime

  console.log(`[openai] Transcription completed in ${durationMs}ms, language: ${response.language}, text length: ${response.text.length}`)

  return {
    text: response.text,
    language: response.language,
    durationMs
  }
}

/**
 * Сгенерировать отчёт через GPT
 *
 * @param template - Шаблон промпта из ReportPrompt
 * @param variables - Переменные для подстановки в шаблон
 * @returns Сгенерированный отчёт
 */
export async function generateReport(params: {
  template: string
  variables: {
    restaurant_name: string
    period_start: string
    period_end: string
    transcripts: string  // Все транскрипции, объединённые в один текст
  }
  model?: string
}): Promise<{
  content: string
  summary: string
  model: string
  tokensUsed: number
  generationTimeMs: number
}> {
  const client = getClient()
  const startTime = Date.now()
  const model = params.model || 'gpt-4o-mini'

  // Подставляем переменные в шаблон
  let prompt = params.template
  prompt = prompt.replace(/\{restaurant_name\}/g, params.variables.restaurant_name)
  prompt = prompt.replace(/\{period_start\}/g, params.variables.period_start)
  prompt = prompt.replace(/\{period_end\}/g, params.variables.period_end)
  prompt = prompt.replace(/\{transcripts\}/g, params.variables.transcripts)
  // Алиасы
  prompt = prompt.replace(/\{week_start\}/g, params.variables.period_start)
  prompt = prompt.replace(/\{week_end\}/g, params.variables.period_end)

  console.log(`[openai] Generating report: model=${model}, prompt length=${prompt.length}, transcripts length=${params.variables.transcripts.length}`)

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'Ты — аналитик ресторанного бизнеса. Составляй чёткие, структурированные отчёты в формате Markdown. Используй заголовки, списки, выделение жирным для ключевых цифр и выводов.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3, // Низкая — для стабильных аналитических отчётов
    max_tokens: 4000
  })

  const generationTimeMs = Date.now() - startTime
  const content = response.choices[0]?.message?.content || ''
  const tokensUsed = response.usage?.total_tokens || 0

  // Генерируем краткую выжимку
  const summaryResponse = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'Сформулируй краткую выжимку (2-3 предложения) на основе отчёта. Только факты и ключевые выводы.'
      },
      {
        role: 'user',
        content
      }
    ],
    temperature: 0.2,
    max_tokens: 300
  })

  const summary = summaryResponse.choices[0]?.message?.content || ''
  const totalTokens = tokensUsed + (summaryResponse.usage?.total_tokens || 0)

  console.log(`[openai] Report generated in ${generationTimeMs}ms, tokens: ${totalTokens}, content length: ${content.length}`)

  return {
    content,
    summary,
    model,
    tokensUsed: totalTokens,
    generationTimeMs
  }
}

/**
 * Классифицировать транскрипцию отзыва через GPT-4o-mini
 *
 * Возвращает структурированные данные: sentiment, category, subcategory, dishes, severity, problemTypes
 * Стоимость: ~$0.001 за вызов (input ~300 tokens + output ~100 tokens)
 */
export async function classifyTranscript(text: string): Promise<{
  sentiment: string
  category: string
  subcategory: string | null
  dishes: string[]
  severity: number
  problemTypes: string[]
}> {
  const client = getClient()
  const startTime = Date.now()

  console.log(`[openai] Classifying transcript: ${text.length} chars`)

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Ты — классификатор отзывов в ресторанном бизнесе. Проанализируй текст голосового сообщения сотрудника ресторана и верни JSON.

Правила классификации:

sentiment — общий тон сообщения:
- "positive" — хвалят, благодарят, доволен
- "negative" — жалуются, ругают, недоволен
- "neutral" — информационное, без оценки
- "mixed" — есть и позитив, и негатив

category — основная категория проблемы/отзыва:
- "food" — еда и напитки (качество, вкус, температура, инородные предметы)
- "service" — сервис (скорость обслуживания, вежливость, ошибки в заказе)
- "atmosphere" — атмосфера (чистота, музыка, температура в зале, туалет)
- "loyalty" — программа лояльности (бонусы, скидки, акции)
- "wow" — эффект вау (подача, креатив, впечатления, общее впечатление)

subcategory — только если category="food":
- "temperature" — блюдо холодное/горячее
- "taste" — невкусно, пересолено, недосолено
- "foreign_object" — волос, насекомое, посторонний предмет
- "cooking" — неправильная прожарка, сырое, подгорело
- "quality" — несвежие ингредиенты, низкое качество

Для остальных категорий subcategory = null.

dishes — массив названий конкретных блюд, упомянутых в тексте (пустой массив если нет).

severity — серьёзность от 1 до 5:
1 = мелкое замечание
2 = незначительная проблема
3 = заметная проблема, стоит обратить внимание
4 = серьёзная проблема, требует немедленного внимания
5 = критический инцидент (санитарные нарушения, отравление, травма)

problemTypes — массив ключевых слов проблем:
Примеры: "cold_food", "hair_found", "insect", "slow_service", "rude_staff", "wrong_order", "dirty_table", "loud_music", "broken_ac", "bonus_not_applied", "boring_presentation"
Пустой массив для позитивных отзывов.

ВАЖНО: Отвечай ТОЛЬКО валидным JSON, без markdown и комментариев.`
      },
      {
        role: 'user',
        content: text
      }
    ],
    max_tokens: 500
  })

  const durationMs = Date.now() - startTime
  const raw = response.choices[0]?.message?.content || '{}'

  console.log(`[openai] Classification completed in ${durationMs}ms`)

  const parsed = JSON.parse(raw)

  // Валидация и нормализация
  return {
    sentiment: ['positive', 'negative', 'neutral', 'mixed'].includes(parsed.sentiment)
      ? parsed.sentiment : 'neutral',
    category: ['food', 'service', 'atmosphere', 'loyalty', 'wow'].includes(parsed.category)
      ? parsed.category : 'service',
    subcategory: parsed.category === 'food' ? (parsed.subcategory || null) : null,
    dishes: Array.isArray(parsed.dishes) ? parsed.dishes : [],
    severity: Math.min(5, Math.max(1, Math.round(parsed.severity || 1))),
    problemTypes: Array.isArray(parsed.problemTypes) ? parsed.problemTypes : []
  }
}

/**
 * Скачать файл из Telegram по file_id
 * Telegram Bot API: getFile → file_path → download
 */
export async function downloadTelegramFile(fileId: string): Promise<Buffer> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN не задан')
  }

  // Шаг 1: Получить file_path
  const fileInfo = await $fetch<{
    ok: boolean
    result: { file_path: string; file_size?: number }
  }>(`https://api.telegram.org/bot${botToken}/getFile`, {
    params: { file_id: fileId }
  })

  if (!fileInfo.ok || !fileInfo.result.file_path) {
    throw new Error(`Telegram: не удалось получить file_path для ${fileId}`)
  }

  console.log(`[openai] Downloading telegram file: ${fileInfo.result.file_path} (${fileInfo.result.file_size || '?'} bytes)`)

  // Шаг 2: Скачать файл
  const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`

  const response = await fetch(fileUrl)
  if (!response.ok) {
    throw new Error(`Telegram: ошибка скачивания файла: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
