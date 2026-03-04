/**
 * POST /api/voice-messages/retry — Перетранскрибировать зависшие/упавшие голосовые
 *
 * Доступ: SUPER_ADMIN
 *
 * Body:
 * - id?: string — конкретное голосовое (если не указано — все зависшие)
 * - statuses?: string[] — какие статусы ретраить (по умолчанию RECEIVED, TRANSCRIBING, FAILED)
 *
 * Находит VoiceMessage по статусу, заново скачивает из Telegram и транскрибирует.
 */
import { createId } from '@paralleldrive/cuid2'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role !== 'SUPER_ADMIN') {
    throw createError({ statusCode: 403, message: 'Только SUPER_ADMIN' })
  }

  const body = await readBody(event)
  const targetId = body?.id as string | undefined
  const statuses = body?.statuses || ['RECEIVED', 'TRANSCRIBING', 'FAILED']

  // Находим голосовые для ретрая
  const where: any = {
    status: targetId ? undefined : { in: statuses },
  }
  if (targetId) {
    where.id = targetId
  } else {
    where.status = { in: statuses }
  }

  const voiceMessages = await prisma.voiceMessage.findMany({
    where,
    include: {
      restaurant: { select: { id: true, name: true } },
      transcript: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50, // Максимум 50 за раз
  })

  if (voiceMessages.length === 0) {
    return { message: 'Нет зависших сообщений', retried: 0, results: [] }
  }

  console.log(`[retry] Found ${voiceMessages.length} voice messages to retry`)

  const results: Array<{
    id: string
    status: string
    oldStatus: string
    text?: string
    error?: string
  }> = []

  for (const vm of voiceMessages) {
    try {
      console.log(`[retry] Processing ${vm.id} (status=${vm.status}, fileId=${vm.telegramFileId})`)

      // Если уже есть транскрипт — пропускаем (уже транскрибировано)
      if (vm.transcript) {
        console.log(`[retry] ${vm.id} already has transcript, skipping`)
        // Просто обновим статус если он не TRANSCRIBED
        if (vm.status !== 'TRANSCRIBED') {
          await prisma.voiceMessage.update({
            where: { id: vm.id },
            data: { status: 'TRANSCRIBED' },
          })
        }
        results.push({ id: vm.id, status: 'ALREADY_DONE', oldStatus: vm.status })
        continue
      }

      // Обновляем статус
      await prisma.voiceMessage.update({
        where: { id: vm.id },
        data: { status: 'TRANSCRIBING', error: null },
      })

      // Скачиваем из Telegram
      const audioBuffer = await downloadTelegramFile(vm.telegramFileId)
      console.log(`[retry] Downloaded ${audioBuffer.length} bytes for ${vm.id}`)

      // Транскрибируем
      const result = await transcribeAudio(audioBuffer, `voice_${vm.id}.ogg`)

      if (!result.text || result.text.trim().length === 0) {
        throw new Error('Whisper вернул пустую транскрипцию')
      }

      // Сохраняем транскрипт
      await prisma.transcript.create({
        data: {
          id: createId(),
          text: result.text,
          language: result.language || 'ru',
          durationMs: result.durationMs,
          voiceMessageId: vm.id,
          restaurantId: vm.restaurantId,
          userId: vm.userId,
        },
      })

      // Обновляем статус
      await prisma.voiceMessage.update({
        where: { id: vm.id },
        data: { status: 'TRANSCRIBED' },
      })

      console.log(`[retry] SUCCESS ${vm.id}: ${result.text.length} chars`)
      results.push({
        id: vm.id,
        status: 'TRANSCRIBED',
        oldStatus: vm.status,
        text: result.text.substring(0, 100) + (result.text.length > 100 ? '...' : ''),
      })
    } catch (err: any) {
      console.error(`[retry] FAILED ${vm.id}:`, err.message)

      await prisma.voiceMessage.update({
        where: { id: vm.id },
        data: { status: 'FAILED', error: `retry: ${err.message}` },
      }).catch(() => {})

      results.push({
        id: vm.id,
        status: 'FAILED',
        oldStatus: vm.status,
        error: err.message,
      })
    }
  }

  const succeeded = results.filter(r => r.status === 'TRANSCRIBED').length
  const failed = results.filter(r => r.status === 'FAILED').length
  const skipped = results.filter(r => r.status === 'ALREADY_DONE').length

  console.log(`[retry] Done: ${succeeded} success, ${failed} failed, ${skipped} skipped`)

  return {
    message: `Обработано: ${succeeded} успешно, ${failed} ошибок, ${skipped} пропущено`,
    retried: voiceMessages.length,
    succeeded,
    failed,
    skipped,
    results,
  }
})
