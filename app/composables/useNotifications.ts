interface Notification {
  id: string
  type: 'subscription' | 'transcriptions'
  title: string
  description: string
  severity: 'info' | 'warning' | 'danger'
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function pluralDays(n: number): string {
  const abs = Math.abs(n)
  if (abs % 10 === 1 && abs % 100 !== 11) return `${abs} день`
  if (abs % 10 >= 2 && abs % 10 <= 4 && (abs % 100 < 10 || abs % 100 >= 20)) return `${abs} дня`
  return `${abs} дней`
}

export const useNotifications = () => {
  const { user } = useAuth()

  const notifications = computed<Notification[]>(() => {
    if (!user.value?.organization?.billing) return []

    const billing = user.value.organization.billing as any
    const items: Notification[] = []
    const now = new Date()

    // --- Подписка ---
    if (billing.status === 'TRIAL' && billing.trialEndsAt) {
      const end = new Date(billing.trialEndsAt)
      const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysLeft <= 0) {
        items.push({
          id: 'trial-expired',
          type: 'subscription',
          title: 'Пробный период истёк',
          description: 'Оформите подписку для продолжения работы',
          severity: 'danger'
        })
      } else {
        items.push({
          id: 'trial-active',
          type: 'subscription',
          title: `Пробный период до ${formatDate(end)}`,
          description: `Осталось ${pluralDays(daysLeft)}`,
          severity: daysLeft <= 7 ? 'danger' : daysLeft <= 10 ? 'warning' : 'info'
        })
      }
    } else if (billing.status === 'ACTIVE' && billing.activeUntil) {
      const end = new Date(billing.activeUntil)
      const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysLeft <= 0) {
        items.push({
          id: 'sub-expired',
          type: 'subscription',
          title: 'Подписка истекла',
          description: 'Продлите подписку для продолжения работы',
          severity: 'danger'
        })
      } else {
        items.push({
          id: 'sub-active',
          type: 'subscription',
          title: `Подписка до ${formatDate(end)}`,
          description: `Осталось ${pluralDays(daysLeft)}`,
          severity: daysLeft <= 7 ? 'danger' : daysLeft <= 10 ? 'warning' : 'info'
        })
      }
    } else if (billing.status === 'DISABLED') {
      items.push({
        id: 'sub-disabled',
        type: 'subscription',
        title: 'Подписка неактивна',
        description: 'Обратитесь к администратору',
        severity: 'danger'
      })
    }

    // --- Транскрипции ---
    const maxTranscriptions = billing.tariff?.maxTranscriptions
    if (maxTranscriptions) {
      const used = billing.transcriptionsUsed || 0
      const percent = Math.round((used / maxTranscriptions) * 100)

      items.push({
        id: 'transcriptions',
        type: 'transcriptions',
        title: `Транскрипции: ${used} / ${maxTranscriptions}`,
        description: used >= maxTranscriptions ? 'Лимит исчерпан' : `Использовано ${percent}%`,
        severity: used >= maxTranscriptions ? 'danger' : used >= maxTranscriptions * 0.8 ? 'warning' : 'info'
      })
    }

    return items
  })

  const count = computed(() => {
    return notifications.value.filter(n => n.severity !== 'info').length
  })

  const badgeColor = computed(() => {
    if (count.value === 0) return 'hidden'
    const hasDanger = notifications.value.some(n => n.severity === 'danger')
    if (hasDanger) return 'red'
    return 'orange'
  })

  return { notifications, count, badgeColor }
}
