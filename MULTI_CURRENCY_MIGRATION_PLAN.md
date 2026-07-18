# Multi-Currency Migration Plan

## Purpose

Перевести проект от модели одной проектной валюты к модели общего пула валют на верхнем уровне конфига.

После перехода:

- каждый `AppConfig` хранит набор доступных валют проекта
- награды в играх не хранят строку валюты напрямую
- каждая награда ссылается на валюту из общего пула конфига
- игры сохраняют snapshot использованных валют и наград в момент старта партии
- Journey получает полноценную мультивалютную экономику, включая награды на клетках в разных валютах

---

## Target Outcome

Целевая модель должна позволять:

- в конфиге проекта задать несколько валют
- в Journey назначать разным клеткам разные валюты
- в Journey назначать jackpot и achievements в валютах из общего пула
- в Battleships выбирать валюту награды для доски
- в Lotto выбирать валюту призов из общего пула
- не зависеть от будущих изменений конфига для уже созданных игр

---

## Current State

Сейчас система построена вокруг одной валюты:

- `AppConfig.currency: string`
- `JourneyRules.currency: string`
- `BattleshipsBoardRules.currency: string`
- `LottoGame.currency: string`

Это приводит к следующим ограничениям:

- конфиг проекта задаёт только одну валюту
- Journey не может хранить награды в разных валютах
- текущая модель Journey использует один числовой баланс игрока
- Lotto и Battleships отображают награды как `number + currency string`
- read-model, UI и тексты событий не готовы к нескольким валютам внутри одной партии Journey

---

## Core Design Rule

Валюты задаются только на верхнем уровне конфига.

Игры и игровые награды:

- не создают собственные валюты
- не хранят произвольные строки валют
- используют только ссылки на валюты из `config.currencies`

Это означает, что в доменной модели нужны не просто массивы строк, а нормализованные валютные сущности с идентификаторами.

---

## Proposed Target Model

### 1. Config-level currency pool

Вместо:

```ts
currency: string;
```

нужен пул валют:

```ts
interface ConfigCurrency {
  id: string;
  code: string;
  label: string;
  order: number;
}

interface AppConfig {
  currencies: ConfigCurrency[];
}
```

Минимально обязательны:

- `id` для стабильных ссылок из наград
- `label` для отображения

Рекомендуемо добавить:

- `code` для короткого уникального имени
- `order` для стабильного порядка в UI

### 2. Reward reference

Любая награда должна ссылаться на валюту по `currencyId`.

Базовый тип:

```ts
interface CurrencyAmount {
  amount: number;
  currencyId: string;
}
```

### 3. Game snapshot rule

При создании игры backend должен сохранять snapshot используемых валют и правил, чтобы:

- старые игры не ломались после редактирования конфига
- read-model всегда мог показать корректные label валют

Пример:

```ts
interface GameCurrencySnapshot {
  id: string;
  code: string;
  label: string;
}
```

---

## Domain Changes By Layer

## Backend

### Configs module

Нужно изменить:

- `AppConfig`
- `AppConfigMutationInput`
- `AppConfigReadModel`
- `defaultConfigs`
- `normalizeAppConfigInput`
- `normalizeStoredAppConfig`
- `configs.schemas.ts`
- `ConfigReadModelFactory`

Новая ответственность `configs`:

- валидировать пул валют
- гарантировать уникальность `currency.id`
- гарантировать, что игровые награды ссылаются только на валюты из пула

Дополнительная валидация:

- пул валют не пустой
- `id`, `code`, `label` не пустые
- `id` уникален внутри конфига
- `code` желательно уникален внутри конфига

### Journey

Journey требует самой глубокой переработки.

Сейчас:

- `JourneyRules.currency: string`
- `JourneyMapCell.prize: number`
- `JourneyAchievement.prize: number`
- `JourneyPlayer.prize: number`
- `fullPrize: number`

Целевая модель:

- `JourneyRules` не хранит одну валюту
- jackpot, cell rewards и achievements используют `CurrencyAmount`
- баланс игрока хранится как мультивалютный кошелёк

Рекомендуемая модель:

```ts
interface JourneyWallet {
  balances: Record<string, number>;
}
```

или

```ts
interface JourneyBalanceEntry {
  currencyId: string;
  amount: number;
}
```

Что нужно переписать:

- `domain/types.ts`
- `domain/config.ts`
- `domain/engine.ts`
- `domain/commentTemplates.ts`
- `JourneyReadModelFactory.ts`
- результаты и derived data

Что меняется логически:

- клетка даёт не просто `+5`, а `+5 в currencyId=X`
- ловушка снимает сумму в конкретной валюте
- jackpot хранит конкретную валюту
- achievement хранит конкретную валюту
- итог игрока становится набором балансов, а не одним числом

### Battleships

Battleships уже близок к нужной форме, но сейчас `board.currency` принудительно синхронизируется из одного `config.currency`.

Целевое поведение:

- каждая доска выбирает валюту награды из общего пула конфига
- приз за попадание и бонус за добивание относятся к валюте доски

Изменения:

- `BattleshipsBoardRules.currency` заменить на `currencyId`
- при snapshot игры сохранять currency snapshot выбранной доски
- в read-model отдавать и `currencyId`, и display label

Что переписать:

- `domain/types.ts`
- `domain/config.ts`
- `Configs normalize` без принудительного `syncBattleshipsCurrency`
- `BattleshipsReadModelFactory.ts`
- config summary

### Lotto

Если Lotto остаётся single-currency per game, достаточно:

- выбирать валюту призов из общего пула
- сохранять ссылку и snapshot этой валюты в игре

Рекомендуемая модель:

- `LottoRules` получает `prizeCurrencyId`
- `LottoGame` хранит `prizeCurrencySnapshot`

Если в будущем призы за 1/2/other должны быть в разных валютах, тогда нужно переводить каждую награду на `CurrencyAmount`.

Что переписать в минимальном варианте:

- `LottoService.ts`
- `LottoEngine.ts`
- `domain/types.ts`
- `LottoReadModelFactory.ts`
- events/messages с отображением label валюты

---

## Frontend

### Configs feature

Нужно изменить редактор конфига так, чтобы он умел:

- управлять пулом валют проекта
- позволять играм выбирать валюту из этого пула

Что меняется:

- один input `currency` удаляется
- появляется список валют проекта
- Journey cell editor получает selector валюты
- Journey jackpot editor получает selector валюты
- Journey achievements editor получают selector валюты
- Battleships board editor получает selector валюты
- Lotto rules editor получает selector валюты

Файлы:

- `frontend/src/features/configs/types.ts`
- `editorDraft.ts`
- `ConfigEditorCard.tsx`
- `ConfigsPage.tsx`

### Journey frontend

Journey UI сейчас ожидает один `journeyConfig.currency`.

Нужно перейти на read-model, который отдаёт:

- доступные валюты snapshot игры
- награды клеток с валютами
- мультивалютные балансы игроков
- подготовленные display-поля для итогов, логов и подсказок

Важно:

- не переносить расчёт мультивалютных итогов на frontend
- backend должен отдавать готовые display-friendly структуры

Нужно переписать:

- `features/journey/types.ts`
- `features/journey/config.ts`
- `useJourneyGame.ts`
- `JourneyMapCard.tsx`
- `JourneyResultsCard.tsx`
- `JourneyRoundControlsCard.tsx`
- `JourneyRulesDialog.tsx`
- возможные helpers, завязанные на `fullPrize`

### Battleships frontend

Изменения умеренные:

- board rules используют `currencyId`
- read-model получает label валюты snapshot
- компоненты продолжают показывать одну валюту для доски

Нужно переписать:

- `features/battleships/types.ts`
- config summary
- dialogs/cards/saved games, где сейчас ждут `currency: string`

### Lotto frontend

Изменения умеренные при single-currency-per-game:

- rules dialog и results берут валюту из snapshot/read-model
- config editor позволяет выбрать валюту призов из project pool

Нужно переписать:

- `features/lotto/types.ts`
- `useLottoGame.ts`
- `LottoRulesDialog.tsx`
- `LottoResultsCard.tsx`
- `LottoSavedGamesDialog.tsx`

---

## Read Model Recommendations

Чтобы не усложнять frontend, backend должен отдавать не только raw currency ids, но и display-ready поля.

Рекомендуется отдавать:

- `currenciesById`
- formatted reward labels
- formatted player balances
- per-currency totals

Для Journey особенно полезно:

```ts
interface JourneyPlayerBalanceReadModel {
  currencyId: string;
  label: string;
  amount: number;
}
```

и

```ts
interface JourneyCellRewardReadModel {
  amount: number;
  currencyId: string;
  currencyLabel: string;
}
```

---

## Migration Strategy

## Phase 1. Introduce currency pool contracts

Цель:

- добавить `config.currencies`
- оставить backward compatibility со старым `currency`

Шаги:

- расширить backend config types
- расширить zod schema
- научить normalizer читать старый `currency: string` и превращать его в `currencies[0]`
- расширить frontend config types

Результат:

- старые конфиги продолжают читаться
- новые контракты уже знают про пул валют

## Phase 2. Convert game configs to currency references

Цель:

- убрать строковые валюты из игровых правил

Шаги:

- Journey: cell/jackpot/achievement reward -> `CurrencyAmount`
- Battleships: board -> `currencyId`
- Lotto: `prizeCurrencyId`

Результат:

- конфиг игры использует только ссылки на project currency pool

## Phase 3. Snapshot support for created games

Цель:

- новые игры сохраняют использованные валюты внутри snapshot

Шаги:

- при старте игры сохранять `currency snapshots`
- read-model строить только из snapshot игры

Результат:

- изменение конфига не влияет на уже созданные партии

## Phase 4. Journey multi-currency engine

Цель:

- перейти от одного `player.prize` к мультивалютному балансу

Шаги:

- переписать types и engine
- переписать awarding/removal logic
- переписать comments/results/read-model
- определить новый порядок сортировки итогов

Результат:

- Journey реально поддерживает разные валюты на разных клетках

## Phase 5. Frontend editor and rendering migration

Цель:

- дать оператору UI для редактирования пула валют и привязки наград

Шаги:

- обновить Configs editor
- обновить Journey/Battleships/Lotto pages и dialogs
- перейти на новые display contracts

Результат:

- пользователь может создавать и использовать мультивалютные конфиги

## Phase 6. Legacy cleanup

Цель:

- удалить старые поля и временные compatibility shim

Шаги:

- удалить `config.currency`
- удалить fallback normalization для старого контракта после миграции данных
- зачистить фронтовые и бэковые временные адаптеры

---

## Data Migration Rules

Нужно предусмотреть миграцию старых данных.

### Existing configs

Старый конфиг:

```ts
currency: "фишек"
```

должен автоматически превращаться в:

```ts
currencies: [
  {
    id: "default",
    code: "default",
    label: "фишек",
    order: 0,
  },
]
```

Игровые правила старого конфига должны получить ссылки на `currencyId: "default"`.

### Existing Journey games

Старые игры Journey содержат скалярные значения. Для них нужен compatibility mode:

- существующий `player.prize` считается балансом в `default` currency
- existing cell/jackpot/achievement prizes маппятся в `default` currency

Это позволит:

- не ломать старые игры
- не мигрировать все документы мгновенно

### Existing Battleships games

Старые snapshot rules получают `currencyId: "default"` и snapshot label из старой валюты.

### Existing Lotto games

Старый `game.currency` превращается в `prizeCurrencySnapshot`.

---

## Validation Rules

Нужны новые инварианты.

### Config-level

- `currencies.length >= 1`
- `currency.id` уникален
- `currency.label` не пустой

### Reward-level

- каждая награда указывает существующий `currencyId`
- amount валиден по правилам конкретной игры

### Journey-level

- trap currency должна существовать в pool
- achievement currency должна существовать в pool
- jackpot currency должна существовать в pool
- maxPrize semantics должны быть явно определены

---

## Open Design Decisions

Перед реализацией нужно зафиксировать следующие правила.

### 1. Итоги Journey

Нужно выбрать один вариант:

- сортировка только по одной базовой валюте
- сортировка по заранее заданному приоритету валют
- сортировка по сумме после внешней конвертации
- отсутствие общего рейтинга и показ итогов по валютам

Без этого нельзя корректно переписать `results`.

### 2. `maxPrize` в Journey

Нужно определить:

- лимит общий на все валюты
- лимит на каждую валюту отдельно
- лимит только на базовую валюту
- убрать лимит из мультивалютного режима

### 3. Achievements и jackpot в Journey

Нужно подтвердить:

- achievement reward выбирает валюту из общего пула
- jackpot reward выбирает валюту из общего пула

### 4. Lotto scope

Нужно подтвердить:

- одна валюта на все lotto prizes
- или каждая prize bucket может иметь свою валюту

### 5. Battleships scope

Нужно подтвердить:

- одна валюта на доску
- или разные типы наград доски могут иметь разные валюты

---

## Recommended Decision Set

Чтобы миграция оставалась реалистичной, рекомендован такой первый релиз:

- `AppConfig` хранит `currencies[]`
- Journey поддерживает мультивалютные клетки, jackpot и achievements
- Battleships использует одну валюту на доску
- Lotto использует одну валюту на игру
- snapshot игры хранит используемые валюты
- старые данные читаются через compatibility layer

Это даёт требуемую функциональность без лишнего обобщения.

---

## Acceptance Criteria

Миграция считается завершённой, когда:

- конфиг проекта умеет хранить несколько валют
- редактор конфига позволяет управлять пулом валют
- все игровые награды ссылаются только на валюты из пула
- Journey поддерживает награды на разных клетках в разных валютах
- Battleships и Lotto выбирают валюту наград из пула
- уже созданные игры не ломаются после изменения конфига
- frontend не рассчитывает доменную мультивалютную логику сам
- все старые `currency: string` контракты удалены или изолированы в compatibility слое

---

## Suggested Implementation Order

1. Зафиксировать итоговый backend contract для `currencies[]` и reward references.
2. Зафиксировать доменную модель Journey multi-currency balances.
3. Ввести backward-compatible config normalization.
4. Перевести Battleships и Lotto на ссылки на project currency pool.
5. Переписать Journey engine и read-model.
6. Перевести frontend editor и игровые страницы на новые read-model.
7. Провести cleanup legacy currency fields.

