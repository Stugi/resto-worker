# 🎓 Nuxt 3 + TypeScript — Краткий справочник

## 📦 Структура проекта

```
app/
├── components/     # Автоимпорт компонентов
├── composables/    # Автоимпорт composables (use*.ts)
├── pages/          # Файловый роутинг
├── stores/         # Pinia stores
└── assets/         # CSS, картинки
```

---

## 🔧 Типизация в компонентах

### Props

```typescript
// Способ 1: Interface + withDefaults
interface Props {
    title: string
    count?: number // опциональный
}

const props = withDefaults(defineProps<Props>(), {
    count: 0, // дефолтное значение
})

// Способ 2: Inline (для простых случаев)
defineProps<{
    title: string
    items: string[]
}>()
```

### Emits

```typescript
// Типизированные события
interface Emits {
    (event: "update", value: string): void
    (event: "delete", id: number): void
}

const emit = defineEmits<Emits>()

// Использование
emit("update", "новое значение")
```

### Refs и Computed

```typescript
// ref с явным типом
const count = ref<number>(0)
const user = ref<User | null>(null)

// ref с выводом типа (автоматически)
const name = ref("John") // тип: Ref<string>

// computed всегда выводит тип из return
const fullName = computed(() => `${first.value} ${last.value}`)
```

---

## 🏪 Pinia Store

```typescript
// stores/counter.ts
export const useCounterStore = defineStore("counter", () => {
    // State
    const count = ref(0)
    const user = ref<User | null>(null)

    // Getters (computed)
    const doubleCount = computed(() => count.value * 2)

    // Actions (functions)
    function increment() {
        count.value++
    }

    async function fetchUser(id: string) {
        user.value = await $fetch<User>(`/api/users/${id}`)
    }

    return { count, user, doubleCount, increment, fetchUser }
})
```

---

## 🌐 Загрузка данных

### useFetch (рекомендуется)

```typescript
// Автоматический SSR + кеширование
const { data, error, pending, refresh } = await useFetch<User[]>("/api/users", {
    query: { page: 1 },
})
```

### $fetch (для actions)

```typescript
// Внутри функций/actions
const user = await $fetch<User>("/api/users/1")

// POST запрос
await $fetch("/api/users", {
    method: "POST",
    body: { name: "John" },
})
```

---

## 📝 Полезные типы

```typescript
// Из Prisma — типы моделей БД
import type { User, Reservation } from "@prisma/client"

// Расширение типов
interface UserWithPosts extends User {
    posts: Post[]
}

// Utility types
type PartialUser = Partial<User> // все поля опциональные
type UserName = Pick<User, "name"> // только name
type UserWithoutId = Omit<User, "id"> // всё кроме id
```

---

## 🔄 Watch и WatchEffect

```typescript
// watch — явное отслеживание
watch(
    selectedDate,
    async (newDate, oldDate) => {
        await fetchData(newDate)
    },
    { immediate: false },
)

// watch нескольких источников
watch([firstName, lastName], ([first, last]) => {
    fullName.value = `${first} ${last}`
})

// watchEffect — автоматическое отслеживание зависимостей
watchEffect(() => {
    console.log(count.value) // автоматически следит за count
})
```

---

## 🛣️ Роутинг

```typescript
// Получение параметров
const route = useRoute()
const id = route.params.id as string // /users/[id]
const query = route.query.search // ?search=...

// Навигация
const router = useRouter()
router.push("/dashboard")
router.push({ name: "user", params: { id: "1" } })

// Мета страницы
definePageMeta({
    layout: "admin",
    middleware: "auth",
})
```

---

## 💡 Советы

1. **Автоимпорт**: `ref`, `computed`, `watch`, `useFetch` — не нужно импортировать
2. **Типы**: Используй `import type` для типов — не попадут в бандл
3. **Nullable**: Всегда учитывай `null` — `user.value?.name`
4. **Строгий режим**: `tsconfig.json` → `"strict": true`

---

## 🔗 Ссылки

-   [Nuxt 3 Docs](https://nuxt.com/docs)
-   [Vue 3 + TS](https://vuejs.org/guide/typescript/overview.html)
-   [Pinia](https://pinia.vuejs.org/)
