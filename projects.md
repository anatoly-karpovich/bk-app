# BK App — Project & Game Config Refactoring

## Architecture Specification (Part 1)

Version: Draft 1.0

## MVP decisions (2026-07-18)

The following decisions are the binding MVP specification. Earlier sections of this draft are historical design context only; when they conflict with this block, they must not be implemented or used as rollout criteria.

- Project and game-config lifecycle uses physical deletion in the MVP. Archive and restore flows are out of scope.
- `GameConfig.version` and optimistic locking are out of scope for the MVP. A game still keeps its complete rules and currency snapshots.
- Additional MongoDB indexes beyond MongoDB's `_id` index are out of scope for the expected MVP data volume.
- The legacy `configs` runtime API is not a compatibility target. The application must use only Project and project-owned GameConfig flows after the data cutover.
- Production data will be rebuilt from a curated backup import. The migration path must therefore support a deterministic import, not preserve every malformed legacy record in place.
- Automated tests are deferred. Typechecking and a documented manual smoke checklist remain required before rollout.

In particular, all later references to archive/restore, duplicate flows, status fields, `GameConfig.version`, optimistic locking, or extra MongoDB indexes are out of scope for this MVP.

---

# 1. Overview

## 1.1 Предпосылки

Изначально BK App проектировался как приложение для проведения игр в рамках одного проекта (OldBK) и небольшого количества ведущих.

Поэтому конфигурационная модель была максимально простой.

Существует один общий `AppConfig`, который одновременно хранит:

- название проекта;
- описание проекта;
- список игровых валют;
- конфигурацию Journey;
- конфигурацию Battleships;
- конфигурацию Lotto.

Такая архитектура позволила быстро реализовать первую рабочую версию приложения, однако по мере роста функциональности начала создавать ограничения практически во всех слоях системы.

Основная проблема заключается в том, что разные сущности с разным жизненным циклом объединены в один агрегат.

Фактически один документ одновременно является:

- настройками проекта;
- настройками экономики;
- настройками Journey;
- настройками Battleships;
- настройками Lotto.

При этом изменения любой части требуют сохранения всего объекта целиком.

---

## 1.2 Почему текущая архитектура перестала подходить

Постепенно появились требования, которые невозможно красиво реализовать поверх текущей модели.

Например:

### Несколько вариантов одной игры

Хотелось иметь:

```
Journey
 ├── Обычная
 ├── Праздничная
 ├── Турнирная
 └── Тестовая
```

Но текущая модель хранит только:

```
games.journey
```

Чтобы сделать праздничную Journey, приходится создавать полностью новый AppConfig, в котором дублируются ещё и Battleships вместе с Lotto.

Это нарушает принцип единственной ответственности.

---

### Поддержка нескольких проектов

Изначально приложение разрабатывалось только под OldBK.

Однако сейчас появилась идея сделать его универсальным инструментом, который можно использовать практически в любом БК-проекте.

Например:

```
OldBK

Radio X

Another BK

Private Server
```

Каждый проект должен иметь:

- собственные валюты;
- собственные игровые конфиги;
- собственных ведущих;
- собственные партии.

Сейчас всё хранится в одном общем пространстве.

---

### Будущие роли

Планируется добавить роли.

Например:

```
Owner

Admin

DJ

Viewer
```

Диджей должен видеть только свой проект.

При текущей архитектуре это практически невозможно реализовать красиво, потому что конфиги являются глобальными.

---

### Независимое развитие игр

Journey развивается значительно быстрее остальных игр.

Нередко требуется изменить только Journey.

Но сейчас приходится обновлять объект, содержащий одновременно:

```
Journey
Battleships
Lotto
Currencies
```

Даже если изменился один чекбокс Journey.

---

### Безопасность сохранения

Представим ситуацию.

Пользователь А открыл страницу конфигов.

Пользователь Б изменил Battleships.

Через минуту пользователь А изменяет одну настройку Journey.

Если форма отправляет весь AppConfig целиком, то Battleships могут быть случайно перезаписаны старой копией.

То есть возникает классическая проблема Lost Update.

---

### История игр

Партия должна навсегда сохранить правила, по которым она была создана.

Если сегодня Journey имеет:

```
Lucky = 5
```

а завтра:

```
Lucky = 8
```

то вчерашняя партия не должна автоматически измениться.

Следовательно, игра должна хранить snapshot правил.

Текущая архитектура делает этот процесс значительно сложнее.

---

# 2. Цели рефакторинга

## 2.1 Основная цель

Перейти от единственного глобального AppConfig к системе независимых проектов и игровых конфигураций.

Итоговая модель должна позволять масштабировать приложение практически без изменения архитектуры.

---

## 2.2 Что должно получиться

Вместо этого:

```
AppConfig

├── currencies
├── journey
├── battleships
└── lotto
```

должно появиться:

```
Project

├── currencies
├── Journey configs
├── Battleships configs
└── Lotto configs
```

При этом каждая конфигурация игры становится самостоятельной сущностью.

---

## 2.3 Архитектурные принципы

Во время реализации необходимо придерживаться следующих принципов.

### Single Responsibility

Каждая сущность отвечает только за свою область.

Project хранит сведения о проекте.

GameConfig хранит правила одной игры.

Game хранит конкретную партию.

---

### Project Isolation

Все данные принадлежат проекту.

Никакие игровые конфиги не являются глобальными.

Все запросы должны выполняться в рамках Project Scope.

---

### Snapshot Instead Of Live References

После создания партии никакие изменения конфигурации не должны менять её правила.

Партия всегда работает со snapshot.

---

### Independent Configurations

Каждый GameConfig является полностью самостоятельным документом.

Не существует "главного" Journey-конфига.

Можно создать любое количество пресетов.

---

### Copy Instead Of Inheritance

Если пользователь хочет создать праздничную конфигурацию, приложение создаёт полную копию существующего пресета.

После создания между ними нет никакой связи.

Не используется наследование.

Не используется diff.

Не используется merge.

---

### Archive Instead Of Delete

Практически все основные сущности должны архивироваться.

Удаление допустимо только там, где оно действительно безопасно.

---

### Backend Owns Business Logic

Frontend является только клиентом.

Backend отвечает за:

- генерацию идентификаторов;
- нормализацию;
- проверки;
- snapshots;
- поиск зависимостей;
- проверку валют;
- проверку project scope.

---

# 3. Целевая архитектура

Предлагается перейти к следующей модели.

```
Application

├── Projects
│
│   ├── Project A
│   │
│   │   ├── Currencies
│   │   │
│   │   ├── Journey configs
│   │   │     ├── Default
│   │   │     ├── Holiday
│   │   │     └── Tournament
│   │   │
│   │   ├── Battleships configs
│   │   │
│   │   └── Lotto configs
│   │
│   └── Project B
│
└── Games
```

Каждый Project полностью независим.

---

# 4. Основные доменные сущности

После рефакторинга в системе должны существовать следующие агрегаты.

## Project

Отвечает за:

- название проекта;
- описание;
- валюты;
- принадлежность данных.

Project ничего не знает о правилах Journey.

---

## ProjectCurrency

Принадлежит только одному проекту.

Используется всеми игровыми конфигурациями данного проекта.

Не существует глобальных валют.

---

## GameConfig

Хранит правила ровно одной игры.

Например:

```
Journey
```

или

```
Battleships
```

но никогда не обе одновременно.

---

## Game

Конкретная игровая партия.

При создании получает snapshot выбранного GameConfig.

После создания больше никогда не обращается к нему.

---

## CurrencyPreset

Не является доменной сущностью.

Это обычный helper.

Используется только для удобного создания новой валюты.

После копирования исчезает из бизнес-логики.

---

# 5. Domain Relationships

```
Project
 │
 ├──────── owns ───────────────┐
 │                             │
 ▼                             ▼

ProjectCurrency         GameConfig
                               │
                               │ snapshot
                               ▼

                            Game
```

Главная идея:

Project является владельцем всего.

Все остальные сущности существуют только внутри него.

---

# 6. Что сознательно НЕ делается

Данный рефакторинг не должен превращаться в переписывание всего приложения.

Поэтому в рамках задачи НЕ реализуются:

- авторизация;
- пользователи;
- роли;
- memberships;
- аудит;
- глобальный справочник валют;
- наследование конфигов;
- история версий конфигов;
- автоматическое обновление старых игр;
- глобальная статистика.

Однако архитектура должна позволять добавить всё перечисленное без очередного большого рефакторинга.

---

# 7. Главные инварианты системы

После завершения рефакторинга должны всегда выполняться следующие правила.

## Project

Каждый Project полностью независим.

Данные разных проектов никогда не пересекаются.

---

## Currency

Каждая валюта принадлежит ровно одному проекту.

Никакой общей коллекции валют не существует.

---

## GameConfig

Каждый GameConfig принадлежит одному проекту.

Каждый GameConfig описывает ровно один тип игры.

---

## Game

Каждая партия принадлежит одному проекту.

Каждая партия знает, из какого GameConfig она была создана.

Каждая партия содержит собственный snapshot правил.

---

## Snapshot

После создания партии изменение:

- проекта;
- валют;
- игровых конфигов;

не должно изменять уже существующую игру.

Это является одним из важнейших требований новой архитектуры.

# 8. Project

## Назначение

`Project` является верхней границей всей системы.

Все остальные сущности существуют исключительно внутри проекта.

Проект является владельцем:

- валют;
- игровых конфигураций;
- будущих пользователей;
- будущих ролей;
- партий;
- статистики.

Именно Project является главным агрегатом новой архитектуры.

---

## Почему Project — отдельная сущность

В текущей архитектуре проект как таковой отсутствует.

Есть только AppConfig, который одновременно означает:

- настройки проекта;
- настройки экономики;
- правила всех игр.

Это нарушает сразу несколько принципов:

- Single Responsibility;
- Bounded Context;
- Aggregate Root.

После разделения Project становится самостоятельной бизнес-сущностью.

---

## Структура

```ts
interface Project {
  id: string;

  code: string;

  name: string;

  description: string;

  status: "active" | "archived";

  currencies: ProjectCurrency[];

  createdAt: string;
  updatedAt: string;
}
```

---

## Поле code

Это основной человекочитаемый идентификатор проекта.

Например

```
oldbk
```

или

```
radio-club
```

или

```
private-server
```

Используется:

- в логах;
- в импортах;
- в экспортируемых данных;
- потенциально в URL;
- при интеграциях.

После создания менять code крайне нежелательно.

---

## Поле name

Отображаемое название.

Например

```
OldBK
```

или

```
Radio Club
```

Никаких ограничений кроме обычной длины.

---

## Project Status

На первом этапе достаточно двух состояний.

```
active
archived
```

Archived Project:

- нельзя выбрать при создании новой игры;
- можно просматривать;
- можно восстановить.

Удаление проекта пока не требуется.

---

## Почему currencies остаются внутри Project

Рассматривались два варианта.

### Вариант 1

Отдельная Mongo collection

```
projects

currencies
```

### Вариант 2

Embedded document

```
Project

 └── currencies[]
```

Для текущего масштаба выбран второй вариант.

Причины:

Количество валют крайне маленькое.

Обычно:

```
1

2

3

максимум 5-10
```

Читать проект практически всегда нужно вместе с валютами.

Отдельная коллекция лишь усложнит запросы.

При необходимости вынести валюты отдельно можно позже без изменения бизнес-модели.

---

# 9. ProjectCurrency

## Назначение

Валюта существует исключительно внутри проекта.

Она не знает о существовании других проектов.

Не существует никакой общей коллекции валют.

---

## Почему отказались от глобального Currency

Первоначально рассматривалась схема

```
CurrencyDefinition

↓

ProjectCurrency

↓

Reward
```

Однако после анализа стало понятно, что это создаёт искусственную связь между независимыми проектами.

Например

```
OldBK

"Фишки"

```

и

```
Другой БК

"Жетоны"

```

могут иметь одинаковую механику, но являются разными бизнес-сущностями.

Общий справочник лишь создаёт ненужную связанность.

Поэтому принято решение полностью отказаться от него.

---

## Структура

```ts
interface ProjectCurrency {
  id: string;

  code: string;

  name: string;

  label: string;

  shortLabel?: string;

  valueType: "integer" | "decimal";

  precision: number;

  status: "active" | "archived";

  createdAt: string;

  updatedAt: string;
}
```

---

## id

UUID.

Используется как основной идентификатор.

Никогда не зависит от имени.

Никогда не зависит от code.

Не пересоздаётся при обновлении.

---

## code

Стабильный машинный ключ.

Например

```
chips

credits

checks
```

Используется:

- внутри конфигов;
- в snapshot;
- при экспортах;
- потенциально в API.

Требования:

- lowercase;
- уникален внутри проекта;
- после начала использования желательно больше не менять.

---

## name

Название для пользователя.

```
Фишки

Кредиты

Чеки
```

Используется практически во всём UI.

---

## label

Форма для игровых сообщений.

Например

```
Получает 5 фишек

Получает 2 кредита

Теряет 3 чека
```

Именно label должен использоваться генератором игровых логов.

---

## shortLabel

Используется там, где мало места.

Например

```
5 кр.

2 ф.

3 ч.
```

Полностью необязательное поле.

---

## valueType

На сегодняшний день нужны два варианта.

```
integer

decimal
```

Journey практически всегда использует integer.

Battleships уже допускает дробные значения.

Поэтому ограничения должны храниться не глобально, а у самой валюты.

---

## precision

Количество знаков после запятой.

Например

```
integer

precision = 0
```

или

```
decimal

precision = 1
```

Backend обязан валидировать соответствие всех наград precision выбранной валюты.

---

## Currency lifecycle

Удаление валюты практически всегда опасно.

Причины:

На неё могут ссылаться:

- GameConfig;
- исторические партии;
- будущая статистика.

Поэтому вводится lifecycle.

```
active

↓

archived
```

Archived Currency:

- нельзя выбрать в новых конфигах;
- продолжает отображаться в старых;
- остаётся доступной для snapshot.

---

# 10. Currency Presets

## Общая идея

Preset — это не сущность.

Preset — это шаблон.

Он нужен только для ускорения создания новой валюты.

---

## Почему не база

Шаблоны одинаковы для всех установок приложения.

Например

```
Фишки

Кредиты

Чеки
```

Нет смысла хранить их в Mongo.

Достаточно обычного TS файла.

---

## Структура

```ts
interface CurrencyPreset {
  presetId: string;

  title: string;

  description?: string;

  currency: {
    suggestedCode: string;

    name: string;

    label: string;

    shortLabel?: string;

    valueType: "integer" | "decimal";

    precision: number;
  };
}
```

---

## Copy semantics

Это крайне важный момент.

Preset никогда не становится родителем.

Работает только операция

```
Preset

↓

Copy

↓

ProjectCurrency
```

После копирования связь полностью исчезает.

Например

```
Preset

↓

Фишки

↓

Добавить
```

Создаётся

```
ProjectCurrency
```

после чего пользователь может изменить абсолютно всё.

Например

```
Фишки

↓

Жетоны

↓

Очки

↓

Монеты
```

Никаких последствий для preset это не имеет.

---

## Почему отказались от global Currency

Если бы существовала общая сущность Currency,

то возникали бы проблемы:

```
Переименование

Удаление

Общие права

Ссылочная целостность

Миграции
```

Все они полностью исчезают при использовании Copy Model.

---

## UI

Пользователь видит две кнопки.

```
Создать валюту
```

и

```
Добавить из шаблона
```

После выбора шаблона открывается обычная форма создания валюты.

Поля уже заполнены.

Пользователь может изменить всё.

Только после подтверждения создаётся новая ProjectCurrency.

---

# 11. GameConfig

## Главная идея

GameConfig хранит правила одной конкретной игры.

Не двух.

Не трёх.

Не всего приложения.

Только одной.

---

## Структура

```
Journey Config

или

Battleships Config

или

Lotto Config
```

Никогда

```
Journey

+

Battleships

+

Lotto
```

---

## Почему это важно

Представим ситуацию.

Есть

```
Journey

Обычная
```

и

```
Journey

Новогодняя
```

Раньше приходилось создавать второй AppConfig.

Теперь создаётся просто ещё один GameConfig.

Все остальные игры остаются без изменений.

---

## Domain Model

```ts
interface BaseGameConfig<TRules> {
  id: string;

  projectId: string;

  gameType: GameType;

  name: string;

  description: string;

  version: number;

  status: "active" | "archived";

  rules: TRules;

  createdAt: string;

  updatedAt: string;
}
```

---

## GameType

```
journey

battleships

lotto
```

Используется:

- выбор редактора;

- выбор validator;

- выбор engine;

- выбор snapshot;

- выбор списка конфигов.

---

## Version

Каждый Config имеет версию.

Создание

```
1
```

Любое успешное изменение

```
+1
```

Версия используется только как metadata.

Она НЕ заменяет snapshot.

---

## Почему не diff

Иногда возникает желание хранить

```
Holiday Config

=

Default

+

несколько изменений
```

Это значительно усложняет:

- загрузку;

- валидацию;

- snapshot;

- экспорт;

- миграции.

Поэтому каждый GameConfig всегда хранит полный rules object.

Никаких наследований.

Никаких merge.

Никаких patch.

# 12. MongoDB Model

## Общие принципы

После рефакторинга база данных должна отражать реальные доменные сущности, а не UI.

Каждая коллекция должна отвечать только за один агрегат.

Предлагаемая схема:

```
projects

gameConfigs

journeyGames

battleshipsGames

lottoGames

migrations
```

Важно:

GameConfig НЕ хранится внутри Project.

Project хранит только валюты.

Причина проста.

Конфигов может быть:

```
Journey
    Обычная
    Новогодняя
    Турнирная
    Эксперимент

Battleships
    Стандарт
    Мини

Lotto
    Обычная
    Весенняя
```

Если хранить их embedded внутри Project, то обновление одного Journey будет постоянно обновлять огромный документ проекта.

Кроме того, список конфигов — самостоятельный жизненный цикл.

---

## Project Collection

```
projects
```

Документ:

```ts
interface ProjectDocument {
  _id: ObjectId;

  code: string;

  normalizedCode: string;

  name: string;

  description: string;

  status: "active" | "archived";

  currencies: ProjectCurrency[];

  createdAt: string;

  updatedAt: string;
}
```

---

### Индексы

```
normalizedCode
```

Unique.

Также желательно

```
status

updatedAt
```

для быстрых списков.

---

## GameConfigs Collection

```
gameConfigs
```

Документ

```ts
interface GameConfigDocument {
  _id: ObjectId;

  projectId: ObjectId;

  gameType: GameType;

  normalizedName: string;

  name: string;

  description: string;

  version: number;

  status: "active" | "archived";

  rules: unknown;

  createdAt: string;

  updatedAt: string;
}
```

---

### Почему rules: unknown

Mongo ничего не знает о TS generic.

Типизировать нужно только Domain Layer.

Repository должен спокойно хранить любой Rules Object.

Типизация должна происходить выше.

---

### Индексы

Самый важный индекс

```
projectId

gameType

normalizedName
```

Unique.

Это гарантирует невозможность двух Journey-конфигов

```
Обычная
```

в одном проекте.

При этом допускается

```
Journey

Обычная
```

и

```
Lotto

Обычная
```

---

Ещё один индекс

```
projectId

gameType

status
```

для быстрого получения списка активных конфигов.

---

# 13. Backend Architecture

Текущий модуль

```
configs
```

должен исчезнуть.

Вместо него появляются два самостоятельных bounded context.

```
projects

gameConfigs
```

---

## Projects Module

```
projects/

ProjectsController

ProjectsService

ProjectsRepository

ProjectReadModelFactory

schemas

routes

errors
```

Отвечает только за проект.

Никогда не знает ничего про Journey.

---

### Service

ProjectService отвечает за:

- создание проекта

- обновление проекта

- архивирование

- создание валют

- изменение валют

- проверки уникальности

- lifecycle валют

---

### Repository

Repository ничего не знает про бизнес.

Он умеет:

```
find

create

update

replace

archive
```

и больше ничего.

---

## GameConfigs Module

```
GameConfigsController

GameConfigsService

GameConfigsRepository

schemas

validation

errors
```

Отвечает исключительно за игровые конфигурации.

---

Service отвечает за

- project scope

- проверки валют

- duplicate

- version

- archive

- restore

- создание snapshot metadata

---

# 14. API Design

Все API становятся project-scoped.

Это критически важно.

Никаких

```
GET /configs
```

больше существовать не должно.

---

## Projects

```
GET /projects
```

```
POST /projects
```

```
GET /projects/:projectId
```

```
PATCH /projects/:projectId
```

---

## Currencies

```
GET

/projects/:projectId/currencies
```

```
POST

/projects/:projectId/currencies
```

```
PATCH

/projects/:projectId/currencies/:currencyId
```

```
POST

/projects/:projectId/currencies/:currencyId/archive
```

```
POST

/projects/:projectId/currencies/:currencyId/restore
```

---

## GameConfigs

```
GET

/projects/:projectId/game-configs
```

Query

```
gameType

status
```

---

Получить один

```
GET

/projects/:projectId/game-configs/:id
```

---

Создать

```
POST

/projects/:projectId/game-configs
```

---

Изменить

```
PUT

/projects/:projectId/game-configs/:id
```

---

Архивировать

```
POST

/projects/:projectId/game-configs/:id/archive
```

---

Восстановить

```
POST

/projects/:projectId/game-configs/:id/restore
```

---

Создать копию

```
POST

/projects/:projectId/game-configs/:id/duplicate
```

Эта операция будет использоваться постоянно.

Особенно для праздничных игр.

---

# 15. Почему Duplicate лучше наследования

Представим

```
Default
```

и

```
Holiday
```

При наследовании Holiday зависит от Default.

Получается цепочка.

```
Holiday

↓

Default
```

Изменили Default —

внезапно изменилась Holiday.

Это плохо.

---

Copy работает иначе.

```
Default

↓

Copy

↓

Holiday
```

После копирования связи больше нет.

Можно менять что угодно.

Это значительно проще:

- сериализовать

- экспортировать

- снапшотить

- валидировать

---

# 16. Snapshot Philosophy

Это самая важная часть всей архитектуры.

---

## Почему snapshot обязателен

Представим.

Сегодня

```
Lucky

5
```

Запустили игру.

Через час

```
Lucky

8
```

Если игра продолжит использовать live config,

то игроки внезапно начнут получать другие достижения.

Это полностью ломает честность игры.

---

Поэтому игра получает полную копию.

```
Game

rules

=

Copy(GameConfig.rules)
```

После этого

GameConfig можно хоть удалить.

Игра продолжит работать.

---

## Snapshot содержит

Не только rules.

Но и

```
используемые валюты
```

Потому что завтра

```
Фишки
```

могут стать

```
Радио-жетоны
```

Старая игра должна продолжать писать

```
Получает 5 фишек
```

---

### GameCurrencySnapshot

```ts
interface GameCurrencySnapshot {
  id: string;

  code: string;

  name: string;

  label: string;

  shortLabel?: string;

  valueType: "integer" | "decimal";

  precision: number;
}
```

---

### Игра должна хранить

```
projectId

gameConfigId

gameConfigName

gameConfigVersion

rulesSnapshot

currenciesSnapshot
```

После создания игры backend больше никогда не читает ProjectCurrency.

И никогда не читает GameConfig.

Работает исключительно snapshot.

---

# 17. Currency Validation

Frontend никогда не считается доверенным.

Даже если select не позволяет выбрать неправильную валюту.

Любой может отправить POST вручную.

---

Поэтому Backend обязан:

1.

Получить Project.

2.

Получить список валют.

3.

Извлечь все currencyId из rules.

4.

Проверить существование.

5.

Проверить active.

6.

Проверить precision.

Только потом сохранить Config.

---

Для этого рекомендуется сделать отдельный helper.

Например

```ts
collectJourneyCurrencies();

collectBattleshipsCurrencies();

collectLottoCurrencies();
```

которые возвращают

```
Set<CurrencyId>
```

или

```
RewardReference[]
```

с путём до поля.

Это позволит красиво писать ошибки.

Например

```
rules

↓

achievements

↓

lucky

↓

reward[0]

↓

currencyId
```

---

# 18. Versioning

Каждый GameConfig имеет

```
version
```

При создании

```
1
```

Любое успешное изменение

```
+1
```

Зачем нужна версия?

Не для восстановления.

Не вместо snapshot.

Она нужна только чтобы понимать,

по какой версии правил была создана игра.

Например

```
Journey

Holiday

v4
```

Игра сохранит

```
gameConfigVersion = 4
```

Это сильно упрощает разбор спорных ситуаций спустя месяцы.

# 19. Frontend Architecture

## Общая идея

Текущая страница Configs постепенно превратилась в огромный редактор всего приложения.

На одной странице одновременно редактируются:

- Project metadata
- Currencies
- Journey
- Battleships
- Lotto

Каждый новый параметр делает страницу ещё больше.

После разделения доменной модели необходимо разделить и UI.

---

## Новая структура

Предлагается следующая навигация.

```
Projects

    OldBK

        Overview

        Settings

        Currencies

        Journey

        Battleships

        Lotto
```

Таким образом пользователь сначала выбирает проект, после чего работает только внутри него.

---

## Project Overview

Главная страница проекта должна показывать не настройки, а краткую информацию.

Например:

```
OldBK

Активных Journey конфигов: 3

Battleships: 2

Lotto: 1

Валют: 2

Последняя игра:
...
```

Это становится своеобразным Dashboard проекта.

---

## Project Settings

Здесь находятся только:

- название
- описание
- code
- статус

Никаких игровых правил здесь быть не должно.

---

## Project Currencies

Полностью отдельная страница.

Например

```
Фишки

Активна

Integer
```

```
Чеки

Archived
```

Отсюда можно:

- создать валюту

- изменить

- архивировать

- восстановить

---

## Journey Configs

Отдельная страница.

Например

```
Обычная

v4

Active
```

```
Новогодняя

v2

Active
```

```
Экспериментальная

Archived
```

Каждая карточка содержит

```
Открыть

Создать копию

Архивировать
```

---

## Journey Editor

Редактор Journey больше не знает ничего про Battleships.

Вообще.

Он работает только с JourneyRules.

Аналогично:

```
Battleships Editor
```

работает исключительно со своими правилами.

Это значительно уменьшит размер компонентов.

---

# 20. Создание игры

Текущий процесс создания игры должен измениться.

---

## Было

Frontend фактически передавал config целиком либо использовал глобальный AppConfig.

---

## Станет

Frontend знает:

```
Project

↓

Journey Config

↓

Игроки
```

И отправляет только

```json
{
  "projectId": "...",

  "gameConfigId": "...",

  "players": []
}
```

Backend делает всё остальное самостоятельно.

---

## Что делает Backend

Последовательность должна быть строго такой.

### Шаг 1

Получить Project.

---

### Шаг 2

Получить GameConfig.

---

### Шаг 3

Проверить

```
projectId
```

совпадает.

---

### Шаг 4

Проверить

```
status == active
```

---

### Шаг 5

Проверить

```
gameType
```

---

### Шаг 6

Проверить валюты.

---

### Шаг 7

Создать snapshot.

---

### Шаг 8

Создать игру.

---

Это гарантирует, что невозможно создать игру по архивному конфигу или с несуществующей валютой.

---

# 21. Migration

Это один из самых ответственных этапов.

---

## Что существует сейчас

```
AppConfig

↓

Journey

↓

Battleships

↓

Lotto
```

---

## Что должно появиться

```
Project

↓

Journey Config

↓

Battleships Config

↓

Lotto Config
```

---

## Currency Migration

Старые currency id выглядят примерно так

```
default

checks
```

После миграции каждая валюта получает UUID.

Следовательно необходимо построить таблицу соответствий.

Например

```
default

↓

7fc53a...
```

```
checks

↓

c29c8...
```

После чего пройти по ВСЕМ rules всех игр и заменить старые id.

Это нельзя делать частично.

---

## Game Migration

Каждая сохранённая партия должна получить

```
projectId

gameConfigId

gameConfigName

gameConfigVersion

currenciesSnapshot
```

При этом существующий

```
rulesSnapshot
```

не должен заменяться новым.

Это критически важно.

---

## Dry Run

Любая миграция должна поддерживать режим

```
dry-run
```

который ничего не пишет в базу.

Он нужен для проверки количества документов.

---

## Идемпотентность

Повторный запуск миграции не должен создавать новые проекты повторно.

Лучше хранить

```
migrations
```

со списком уже выполненных миграций.

---

# 22. Тестирование

## Unit Tests

Обязательно проверить:

Project

- создание

- duplicate code

- archive

---

Currency

- duplicate code

- precision

- archived

---

GameConfig

- duplicate

- version

- archive

- restore

- validation

---

Snapshot

После изменения Config

старая игра не должна измениться.

После переименования валюты

старая игра должна отображать старое название.

Это один из важнейших тестов всей архитектуры.

---

## Integration Tests

Проверить:

- Mongo indexes

- duplicate names

- project isolation

- config isolation

- archived configs

---

## API Tests

Проверить:

Все CRUD операции.

Ошибки.

Валидацию.

Project scope.

---

## Frontend

Проверить:

- переключение проекта

- выбор Journey Config

- создание копии

- архивирование

- создание валюты

- создание из шаблона

---

# 23. Roadmap реализации

Рефакторинг нельзя делать одним гигантским PR.

Рекомендуемый порядок.

---

## Этап 1

Добавить

```
Project
```

без изменения существующих игр.

---

## Этап 2

Добавить

```
GameConfig
```

---

## Этап 3

Добавить

```
Currency Validation
```

---

## Этап 4

Переделать создание игр.

---

## Этап 5

Сделать миграцию.

---

## Этап 6

Переделать Frontend.

---

## Этап 7

Удалить старый Config Module.

---

# 24. Acceptance Criteria

Рефакторинг считается завершённым, если выполняются следующие условия.

## Projects

✓ Можно создать несколько проектов.

✓ Каждый проект полностью независим.

---

## Currencies

✓ Валюты принадлежат только проекту.

✓ Нет глобального Currency.

✓ Можно создать вручную.

✓ Можно создать из Preset.

✓ Preset копируется.

---

## GameConfigs

✓ Несколько Journey Config.

✓ Duplicate.

✓ Archive.

✓ Restore.

✓ Version.

---

## Games

✓ Создаются только через GameConfig.

✓ Хранят snapshot.

✓ Не изменяются после изменения Config.

---

## Backend

✓ Все запросы project-scoped.

✓ Проверяются валюты.

✓ Проверяются версии.

✓ Проверяется статус.

---

## Frontend

✓ Нет огромной страницы Config.

✓ Каждый тип игры имеет собственный Editor.

✓ Каждая сущность редактируется отдельно.

---

# 25. Главные архитектурные идеи

После завершения рефакторинга приложение должно строиться вокруг следующих принципов.

## Project владеет данными

Не существует глобальных игровых конфигов.

Не существует глобальных валют.

---

## GameConfig — независимый пресет

Один Config.

Одна игра.

Полный Rules Object.

---

## Copy лучше наследования

Любой новый пресет создаётся копированием.

После создания никакой связи между ними нет.

---

## Snapshot важнее Live Data

Игра никогда не зависит от текущего состояния проекта.

Она полностью автономна.

---

## Backend — единственный источник истины

Frontend отображает данные.

Backend принимает архитектурные решения.

Все проверки выполняются исключительно на сервере.

---

# 26. Возможные улучшения после этого рефакторинга

После завершения данной задачи архитектура будет готова к следующим крупным функциям без дополнительных переломов модели.

Например:

```
Users

↓

Project Membership

↓

Roles
```

или

```
Game Statistics
```

или

```
Achievements
```

или

```
Annual Dashboards
```

или

```
Cross-game Analytics
```

или

```
DJ Activity
```

или

```
Player Statistics
```

или

```
Top Prize Winners
```

Все эти сущности естественным образом будут принадлежать Project и не потребуют очередного большого рефакторинга.

---

# Заключение

Главная цель данного рефакторинга — не просто заменить `AppConfig` на несколько новых сущностей, а сформировать устойчивую архитектуру, вокруг которой приложение сможет развиваться в течение следующих лет.

После его завершения система должна опираться на четыре фундаментальных принципа:

1. **Project является верхней границей всех данных.**
2. **GameConfig описывает правила только одной игры и существует независимо.**
3. **Любая игровая партия работает исключительно со snapshot правил и валют.**
4. **Preset — это лишь шаблон для создания новых сущностей, а не источник истины.**

Именно эта модель создаёт прочный фундамент для мультипроектной работы, ролей, статистики, аналитики и дальнейшего развития BK App без необходимости повторных архитектурных переломов.

# 27. Дополнительные требования и архитектурные уточнения

Ниже перечислены детали, которые важно зафиксировать до начала реализации. Они не меняют основную архитектуру, но закрывают неоднозначности, способные привести к разным трактовкам задачи.

---

# 27.1. Терминология в коде

На текущем этапе использовать единое имя:

```ts
GameConfig;
```

Не смешивать в одном коде:

```text
Config
GameConfig
Ruleset
Preset
GamePreset
```

Допустимые термины:

```text
Project
ProjectCurrency
CurrencyPreset
GameConfig
Game
```

При этом:

- `CurrencyPreset` — статический шаблон;
- `GameConfig` — сохранённая сущность MongoDB;
- `rules` — непосредственно правила внутри `GameConfig`;
- `Game` — конкретная партия со snapshot.

Переименование `GameConfig` в `GameRuleset` можно рассмотреть отдельно после завершения рефакторинга. В текущей задаче этого делать не нужно.

---

# 27.2. Идентификатор валюты в игровых правилах

В текущей модели используется:

```ts
interface CurrencyValue {
  currencyId: string;
  value: number;
}
```

После рефакторинга `currencyId` должен ссылаться на:

```ts
ProjectCurrency.id;
```

то есть на UUID, а не на:

```ts
ProjectCurrency.code;
```

Пример:

```json
{
  "currencyId": "7fc53a25-46a5-4470-b9be-493b0eab1045",
  "value": 5
}
```

Почему используется ID, а не code:

- пользователь может захотеть изменить code;
- UUID не зависит от отображаемого имени;
- ссылки остаются стабильными;
- snapshot легко воспроизводится;
- два проекта могут иметь одинаковые codes.

`code` остаётся машинно-читаемым атрибутом, но не primary reference.

---

# 27.3. Изменение currency code

После того как валюта используется хотя бы одним активным `GameConfig`, изменение `code` следует запретить.

Причина:

- code может использоваться в экспортах;
- code может использоваться в будущих интеграциях;
- изменение code не даёт заметной пользы;
- свободное изменение создаёт лишние миграционные сценарии.

Backend должен позволять менять:

```text
name
label
shortLabel
```

Но `code` после первого использования становится immutable.

До первого использования изменение допустимо.

Для определения использования достаточно выполнить поиск по активным и архивным `GameConfig` проекта.

---

# 27.4. Изменение precision валюты

Изменение `precision` может сделать существующие конфиги невалидными.

Пример:

```text
Было:
decimal, precision 1

В GameConfig:
2.5

Стало:
integer, precision 0
```

Такое изменение нельзя разрешать без проверки зависимостей.

Перед обновлением:

1. найти все GameConfig проекта, использующие валюту;
2. проверить все значения;
3. отклонить изменение, если хотя бы одно значение не соответствует новому ограничению.

Исторические игры проверять не требуется, поскольку они содержат snapshot старых настроек валюты.

---

# 27.5. Удаление валюты из массива Project

Физическое удаление ProjectCurrency не должно быть основным сценарием.

Разрешить физическое удаление можно только если валюта:

- никогда не использовалась в GameConfig;
- никогда не использовалась в игре;
- была создана ошибочно;
- не имеет внешней статистики.

На первом этапе безопаснее вообще не реализовывать delete currency.

Использовать только:

```text
archive
restore
```

---

# 27.6. Удаление GameConfig

Физический `DELETE` для GameConfig также не требуется.

Использовать:

```text
archive
restore
```

Если позже понадобится удаление черновика, разрешать его только при условии:

```text
games count by gameConfigId == 0
```

и только пользователю с соответствующим правом.

---

# 28. Конкурентные обновления

После появления нескольких диджеев два пользователя могут одновременно открыть один конфиг.

Пример:

1. User A открывает version 3.
2. User B открывает version 3.
3. User B сохраняет version 4.
4. User A сохраняет старую форму и случайно перезаписывает изменения B.

Для защиты рекомендуется optimistic locking.

---

## 28.1. Update payload

Frontend передаёт ожидаемую версию:

```ts
interface UpdateGameConfigInput {
  expectedVersion: number;
  name: string;
  description: string;
  gameType: GameType;
  rules: unknown;
}
```

---

## 28.2. Repository update

Mongo update должен фильтровать одновременно:

```ts
{
  _id: gameConfigId,
  projectId,
  version: expectedVersion,
}
```

Update:

```ts
{
  $set: {
    name,
    normalizedName,
    description,
    rules,
    updatedAt,
  },
  $inc: {
    version: 1,
  },
}
```

Если документ не найден, необходимо отличить:

- config действительно отсутствует;
- version conflict.

Для этого после неуспешного update можно выполнить scoped find.

---

## 28.3. Ошибка

Добавить:

```ts
GameConfigVersionConflictError;
```

HTTP:

```text
409 Conflict
```

Response желательно содержать:

```json
{
  "code": "GAME_CONFIG_VERSION_CONFLICT",
  "message": "Game config was changed by another user",
  "expectedVersion": 3,
  "currentVersion": 4
}
```

Frontend должен предложить:

```text
Конфигурация была изменена другим пользователем.
Перезагрузите данные перед повторным сохранением.
```

Даже если роли реализуются позже, optimistic locking стоит заложить сразу.

---

# 29. Формат ошибок API

Ошибки должны иметь стабильный machine-readable `code`.

Не заставлять frontend разбирать текст сообщения.

Рекомендуемый формат:

```ts
interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}
```

Примеры:

```text
PROJECT_NOT_FOUND
PROJECT_CODE_CONFLICT

PROJECT_CURRENCY_NOT_FOUND
PROJECT_CURRENCY_CODE_CONFLICT
PROJECT_CURRENCY_IN_USE
PROJECT_CURRENCY_ARCHIVED
PROJECT_CURRENCY_PRECISION_CONFLICT

GAME_CONFIG_NOT_FOUND
GAME_CONFIG_NAME_CONFLICT
GAME_CONFIG_ARCHIVED
GAME_CONFIG_TYPE_MISMATCH
GAME_CONFIG_VERSION_CONFLICT

UNKNOWN_PROJECT_CURRENCY
ARCHIVED_PROJECT_CURRENCY
INVALID_REWARD_PRECISION
```

Zod validation может возвращать:

```json
{
  "code": "REQUEST_VALIDATION_FAILED",
  "message": "Request validation failed",
  "details": {
    "issues": []
  }
}
```

---

# 30. Проект по умолчанию и старт приложения

После миграции приложение больше не должно предполагать, что существует единственный глобальный config.

При входе возможны сценарии:

## Нет проектов

Показать onboarding:

```text
Проекты ещё не созданы.

[Создать проект]
```

## Один проект

Можно автоматически выбрать его на frontend, но нельзя хардкодить его ID в backend.

## Несколько проектов

Пользователь выбирает проект.

После появления ролей список должен содержать только доступные проекты.

---

# 30.1. Хранение последнего выбранного проекта

До появления пользователей разрешено хранить на frontend:

```text
localStorage.activeProjectId
```

Это только UX-настройка.

Backend не должен доверять этому значению и всегда проверяет переданный project ID.

После появления авторизации настройку можно перенести в профиль пользователя.

---

# 31. Конфигурация по умолчанию

Один проект может иметь несколько активных конфигов одного типа.

На первой итерации можно требовать явный выбор при запуске игры.

Позже возможно добавить:

```ts
interface ProjectDefaults {
  journeyGameConfigId?: string;
  battleshipsGameConfigId?: string;
  lottoGameConfigId?: string;
}
```

Однако в текущий refactor добавлять default config необязательно.

Причины:

- создаёт дополнительные зависимости;
- архивирование default config требует отдельного поведения;
- при небольшом числе пресетов явный выбор понятнее;
- сначала необходимо стабилизировать базовую модель.

Codex не должен автоматически вводить default config без необходимости.

---

# 32. GameConfig summaries

Текущая модель содержит summary для Journey, Battleships и Lotto.

После разделения read model summary должен относиться к конкретному GameConfig.

Пример:

```ts
type GameConfigSummary =
  | {
      gameType: "journey";
      mapSize: number;
      diceRange: string;
      jackpotCount: number;
      bonusKinds: number;
      trapKinds: number;
    }
  | {
      gameType: "battleships";
      boardSize: number;
      maxShots: number;
      fleet: string[];
    }
  | {
      gameType: "lotto";
      range: string;
      cardNumbersAmount: number;
      rewardDistributionMode: string;
    };
```

List endpoint может возвращать:

```ts
interface GameConfigListItemReadModel {
  id: string;
  projectId: string;
  gameType: GameType;
  name: string;
  description: string;
  version: number;
  status: GameConfigStatus;
  summary: GameConfigSummary;
  createdAt: string;
  updatedAt: string;
}
```

Полные `rules` необязательно возвращать в списке.

Получать их только через detail endpoint.

Это уменьшает payload и разделяет list/detail read models.

---

# 33. GameConfig duplication

Duplicate должен выполняться на backend, а не только копированием клиентской формы.

Endpoint:

```http
POST /projects/:projectId/game-configs/:gameConfigId/duplicate
```

Payload:

```ts
interface DuplicateGameConfigInput {
  name: string;
  description?: string;
}
```

Backend:

1. получает исходный config в рамках project;
2. проверяет уникальность нового имени;
3. deep-clone rules;
4. создаёт новый document;
5. устанавливает version = 1;
6. устанавливает status = active;
7. создаёт новые timestamps.

Не копировать:

```text
_id
version
status archived
createdAt
updatedAt
```

Архивный config можно разрешить дублировать. Это удобный способ восстановить старый набор правил как новый активный preset.

---

# 34. Game creation and trust boundary

Frontend при запуске игры должен отправлять:

```ts
interface CreateJourneyGameInput {
  gameConfigId: string;
  nicknames: string[];
  djName: string;
}
```

`projectId` берётся из route:

```http
POST /projects/:projectId/journey/games
```

Это предпочтительнее, чем дублировать project ID и в URL, и в body.

Backend не принимает:

```text
rules
configName
configVersion
currenciesSnapshot
```

Эти значения формирует только сервер.

Таким образом невозможно создать партию, заявив один `gameConfigId`, но передав изменённые награды.

Аналогичная структура нужна для Battleships и Lotto.

---

# 35. Snapshot и обновление игровых документов

Внутри Game желательно хранить metadata явно:

```ts
interface GameConfigurationSnapshot<TRules> {
  source: {
    projectId: string;
    gameConfigId: string;
    gameConfigName: string;
    gameConfigVersion: number;
  };

  rules: TRules;
  currencies: GameCurrencySnapshot[];
}
```

В игровом документе:

```ts
interface JourneyGame {
  // game state

  configuration: GameConfigurationSnapshot<JourneyRules>;
}
```

Это чище, чем добавлять много несвязанных top-level полей:

```text
gameConfigId
gameConfigName
gameConfigVersion
currenciesSnapshot
rules
```

Однако текущий Journey уже хранит `rules` на верхнем уровне.

Чтобы не раздувать scope, допустим промежуточный вариант:

```ts
projectId;
gameConfigId;
gameConfigName;
gameConfigVersion;
rules;
currenciesSnapshot;
```

Codex должен выбрать вариант, который минимально ломает существующие engines и read models.

Главный инвариант важнее формы документа:

> Игра содержит полную информацию, необходимую для работы и отображения, без обращения к текущему Project или GameConfig.

---

# 36. Нормализация legacy games

Текущие normalizers уже поддерживают старые документы.

После рефакторинга normalization должна:

- читать старые поля;
- заполнять отсутствующие optional metadata;
- не генерировать новые случайные project/config IDs при каждом чтении;
- не изменять документ в базе неявно;
- помечать legacy source в read model при необходимости.

Неправильно:

```ts
game.projectId = crypto.randomUUID();
```

при каждом `normalizeGame`.

Если legacy metadata отсутствует, использовать:

- migration mapping;
- стабильный fallback;
- либо `null` в read model до миграции.

Нормализатор не должен притворяться миграцией.

---

# 37. Локальная разработка и MongoDB

Для разработки использовать локальную MongoDB.

Пример `docker-compose.yml`:

```yaml
services:
  mongo:
    image: mongo:7
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - bk-app-mongo:/data/db

volumes:
  bk-app-mongo:
```

Environment:

```env
MONGO_URI=mongodb://localhost:27017/bk_app_local
```

Production URI хранится отдельно.

Нельзя запускать automated integration tests против production database.

Тестовая база должна иметь отдельное имя:

```env
MONGO_URI=mongodb://localhost:27017/bk_app_test
```

Tests должны очищать только эту базу.

---

# 38. Создание MongoDB indexes

Индексы должны создаваться явно при старте infrastructure layer либо отдельной setup command.

Предпочтительно:

```ts
ensureProjectsIndexes();
ensureGameConfigsIndexes();
ensureJourneyIndexes();
```

Создание индексов должно быть идемпотентным.

Не полагаться только на service-level проверки.

## Projects

```ts
await collection.createIndex(
  { code: 1 },
  {
    unique: true,
    name: "projects_code_unique",
  },
);
```

## GameConfigs

```ts
await collection.createIndex(
  {
    projectId: 1,
    gameType: 1,
    normalizedName: 1,
  },
  {
    unique: true,
    name: "game_configs_project_type_name_unique",
  },
);
```

## Listing

```ts
await collection.createIndex(
  {
    projectId: 1,
    gameType: 1,
    status: 1,
    updatedAt: -1,
  },
  {
    name: "game_configs_project_type_status_updated",
  },
);
```

---

# 39. Normalized values

Не хранить только display values при case-insensitive uniqueness.

Для Project:

```ts
code;
```

уже хранится нормализованным.

Для GameConfig:

```ts
name: "Обычная игра";
normalizedName: "обычная игра";
```

Нормализатор:

```ts
function normalizeEntityName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru");
}
```

Mongo collation можно использовать дополнительно, но explicit normalized field делает поведение понятным и тестируемым.

---

# 40. Transaction boundary

Mongo transaction для большинства операций не требуется.

Простые операции:

- создание Project;
- создание GameConfig;
- update GameConfig;
- archive;

атомарны на уровне одного документа.

Но создание игры включает чтение:

- Project;
- GameConfig;

и запись Game.

Между чтением и записью config теоретически может быть изменён.

Это допустимо, если snapshot создаётся из уже прочитанной согласованной версии и metadata сохраняет именно эту version.

Если требуется строгая гарантия, repository может повторно проверить version перед insert.

Для текущего масштаба transaction не обязательна.

---

# 41. Архивирование проекта

При архивировании Project:

- все GameConfig необязательно физически архивировать;
- они становятся недоступными для запуска через статус проекта;
- исторические данные продолжают читаться.

Создание новой игры должно проверять одновременно:

```text
project.status == active
gameConfig.status == active
```

При восстановлении проекта его активные GameConfig снова доступны.

Таким образом архивирование проекта не должно массово переписывать все дочерние документы.

---

# 42. Каскадное поведение

Не выполнять автоматические каскадные удаления.

## Archive Project

Не удаляет и не архивирует физически:

- GameConfig;
- Games;
- currencies.

Только блокирует новые операции.

## Archive GameConfig

Не изменяет:

- уже созданные игры;
- другие configs;
- валюты.

## Archive Currency

Запрещается, если используется активными configs.

Не изменяет исторические games.

---

# 43. Состояние незавершённой игры

Игра, начатая до архивирования проекта или конфига, должна иметь возможность завершиться.

Проверка active status выполняется только при создании новой игры.

Во время продолжения существующей игры backend работает со snapshot и не блокирует ходы из-за того, что источник позже архивирован.

Исключение — отдельная будущая административная блокировка конкретной партии.

---

# 44. Миграционный отчёт

Migration command должна выводить структурированный отчёт.

Пример:

```text
Migration: split-app-configs

Legacy configs found: 1
Projects created: 1
Currencies created: 2
Game configs created:
  journey: 1
  battleships: 1
  lotto: 1

Games migrated:
  journey: 14
  battleships: 3
  lotto: 5

Unresolved games: 0
Warnings: 0
```

При `dry-run`:

```text
DRY RUN — no database writes were performed
```

Если существуют unresolved records, production migration должна завершаться с ошибкой, если явно не передан флаг разрешения.

Не игнорировать данные молча.

---

# 45. Backup и rollback

До миграции production обязательно выполнить backup/export.

Rollback первой миграции лучше делать не через автоматический `down`, который массово переписывает документы обратно, а через:

1. сохранение старой `configs` collection;
2. сохранение backup игровых коллекций;
3. переключение приложения обратно на предыдущую версию;
4. восстановление базы из backup при необходимости.

Причина:

обратное объединение нескольких GameConfig в один AppConfig может быть неоднозначным.

Поэтому migration должна быть forward-safe, а rollback — backup-based.

---

# 46. Definition of Done для Codex

Codex не должен считать задачу завершённой только после компиляции.

Перед финальным отчётом необходимо:

1. Запустить TypeScript typecheck backend.
2. Запустить TypeScript typecheck frontend.
3. Запустить lint.
4. Запустить unit tests.
5. Запустить integration tests с локальной Mongo.
6. Проверить production build.
7. Проверить create project.
8. Проверить create currency.
9. Проверить currency preset copy.
10. Создать два Journey GameConfig.
11. Создать копию конфига.
12. Запустить Journey по выбранному конфигу.
13. Изменить исходный конфиг.
14. Убедиться, что запущенная игра не изменилась.
15. Архивировать config.
16. Убедиться, что он не доступен для новой игры.
17. Убедиться, что старая игра открывается.
18. Прогнать migration dry-run на fixture.
19. Прогнать migration второй раз и проверить отсутствие дублей.
20. Описать изменённые endpoints и migration command в README.

---

# 47. Формат отчёта Codex после реализации

Codex должен в конце работы предоставить:

```text
Implemented:
- ...

Architecture decisions:
- ...

Database changes:
- ...

Migration:
- command
- dry-run command
- backup requirements

API changes:
- ...

Frontend changes:
- ...

Backward compatibility:
- ...

Tests executed:
- ...

Known limitations:
- ...

Manual verification steps:
- ...
```

Не скрывать:

- непройденные тесты;
- незавершённые миграции;
- оставшиеся compatibility fallbacks;
- предположения о production data.

---

# 48. Финальные инварианты

После всей реализации должны быть истинны следующие утверждения.

```text
No global currencies exist.
```

```text
Every currency belongs to one Project.
```

```text
Every GameConfig belongs to one Project.
```

```text
Every GameConfig contains rules for exactly one GameType.
```

```text
A Project can contain multiple GameConfigs of the same GameType.
```

```text
A Game is created only from an active GameConfig of an active Project.
```

```text
A Game stores full immutable rules and currency snapshots.
```

```text
Editing a Project does not mutate existing Games.
```

```text
Editing a GameConfig does not mutate existing Games.
```

```text
Archiving a source entity does not break historical Games.
```

```text
CurrencyPreset is copied and never referenced by persisted business data.
```

```text
All access paths are project-scoped on the backend.
```

```text
Migration is explicit, testable, dry-runnable and never runs automatically on application startup.
```

---

# 49. Краткая инструкция Codex перед началом работы

Перед реализацией:

1. Изучи весь текущий модуль `configs`.
2. Найди все использования `AppConfig`.
3. Найди все использования `configId` и `configName`.
4. Найди все места создания Journey, Battleships и Lotto.
5. Найди все места, где `currencyId` читается или записывается.
6. Найди frontend-компоненты общей страницы конфигурации.
7. Найди current seed/default configs.
8. Найди существующие legacy normalizers.
9. Составь impact map.
10. Только после этого начинай изменения.

Работай по этапам.

Не удаляй старую модель до появления:

- новой модели;
- migration;
- backward-compatible reads;
- нового frontend flow;
- тестов.

Главный приоритет:

> Не потерять существующие игры и не изменить их исторические результаты.

# 50. Зафиксированные архитектурные решения

Этот раздел имеет приоритет над возможными альтернативами, которые Codex может обнаружить во время реализации.

Если текущее устройство кода конфликтует с решениями ниже, необходимо адаптировать код к целевой модели, сохранив backward compatibility и данные.

---

## 50.1. Валюты остаются вложенными в Project

На текущем этапе не создавать отдельную коллекцию:

```text
projectCurrencies
```

Использовать:

```ts
interface Project {
  currencies: ProjectCurrency[];
}
```

Причины:

- валют внутри проекта немного;
- они почти всегда нужны вместе с проектом;
- отдельная коллекция сейчас усложнит CRUD и миграцию;
- будущий вынос возможен без изменения внешней бизнес-модели.

При этом на уровне API валюты ведут себя как самостоятельные вложенные сущности:

```http
POST  /projects/:projectId/currencies
PATCH /projects/:projectId/currencies/:currencyId
```

---

## 50.2. Глобальных валют нет

Не создавать:

```text
CurrencyDefinition
GlobalCurrency
CurrencyCatalog
SharedCurrency
```

Валюты разных проектов не имеют общей идентичности.

Даже одинаковые по названию валюты:

```text
OldBK / Фишки
OtherBK / Фишки
```

являются разными `ProjectCurrency`.

---

## 50.3. CurrencyPreset не хранится в MongoDB

Preset является статической заготовкой в коде.

Он:

- не имеет Mongo `_id`;
- не редактируется через административный CRUD;
- не синхронизируется с проектами;
- не обновляет созданные ранее валюты;
- не является внешним ключом.

При использовании данные preset копируются в форму создания `ProjectCurrency`.

---

## 50.4. GameConfig хранится в отдельной коллекции

Не вкладывать массив конфигов внутрь Project.

Использовать:

```text
gameConfigs
```

с обязательным:

```ts
projectId;
gameType;
```

Причины:

- конфигов может стать много;
- у них отдельный lifecycle;
- они часто редактируются;
- нужны фильтры и индексы;
- несколько пользователей могут работать с ними независимо;
- Project не должен разрастаться.

---

## 50.5. Один GameConfig — один тип игры

Недопустим новый аналог старого `AppConfig`:

```ts
interface GameConfig {
  journey: JourneyRules;
  battleships: BattleshipsRules;
  lotto: LottoRules;
}
```

Правильно:

```ts
GameConfig<JourneyRules>;
```

или:

```ts
GameConfig<BattleshipsRules>;
```

или:

```ts
GameConfig<LottoRules>;
```

Тип должен определяться через discriminated union по `gameType`.

---

## 50.6. GameConfig не наследуется от другого GameConfig

Не добавлять:

```ts
parentConfigId;
baseConfigId;
extendsConfigId;
overrides;
rulesPatch;
```

Праздничный или экспериментальный конфиг создаётся полной копией.

После копирования конфиги независимы.

---

## 50.7. Snapshot партии является полным

При создании Game нельзя хранить только:

```ts
gameConfigId;
```

И затем читать актуальные правила из `gameConfigs`.

Игра должна содержать:

```ts
rules;
currenciesSnapshot;
gameConfigName;
gameConfigVersion;
```

`gameConfigId` сохраняется только для трассировки и аналитики.

Snapshot является источником истины для игрового движка.

---

## 50.8. Внутри rewards используется ProjectCurrency.id

Новые правила используют:

```ts
{
  currencyId: ProjectCurrency["id"];
  value: number;
}
```

Не использовать `code` как relation key.

`code` остаётся стабильным человекочитаемым атрибутом для UI, экспорта и интеграций.

---

## 50.9. Project code и currency code — разные понятия

Project:

```ts
project.code = "oldbk";
```

ProjectCurrency:

```ts
currency.code = "chips";
```

Не использовать один универсальный `id/code` helper без понимания контекста.

Уникальность:

```text
Project.code — глобальная
ProjectCurrency.code — внутри Project
```

---

## 50.10. Имя GameConfig уникально внутри Project + GameType

Уникальный ключ:

```text
projectId + gameType + normalizedName
```

Одинаковое имя допустимо:

- в разных проектах;
- у разных типов игр.

Пример:

```text
OldBK / Journey / Обычная
OldBK / Lotto / Обычная
AnotherBK / Journey / Обычная
```

---

## 50.11. Архивирование является основным lifecycle

Для следующих сущностей основной сценарий — archive/restore:

```text
Project
ProjectCurrency
GameConfig
```

Не реализовывать физическое удаление как стандартное действие UI.

Исторические игры не удаляются и не переписываются при архивировании источника.

---

## 50.12. Идущая партия не блокируется архивированием источника

Если после старта партии были архивированы:

- Project;
- GameConfig;
- ProjectCurrency;

партия продолжает работать по snapshot.

Status источника проверяется только при создании новой партии.

---

## 50.13. Frontend не отправляет rules при создании партии

Production flow:

```http
POST /projects/:projectId/journey/games
```

Body:

```ts
{
  gameConfigId: string;
  nicknames: string[];
  djName: string;
}
```

Backend загружает rules самостоятельно.

Это защищает от рассинхронизации между выбранным config и переданными правилами.

---

## 50.14. Полная конфигурация отправляется при сохранении GameConfig

Для обновления GameConfig использовать полный replacement его редактируемых данных:

```ts
{
  expectedVersion: number;
  name: string;
  description: string;
  gameType: GameType;
  rules: TGameRules;
}
```

Не вводить сложный JSON Patch в первой версии.

Optimistic version защищает от lost update.

---

## 50.15. Версия увеличивается при любом сохранённом изменении GameConfig

Изменение:

- `name`;
- `description`;
- `rules`;

увеличивает `version`.

Изменение `status` через archive/restore может:

- либо увеличивать version;
- либо не увеличивать.

Для последовательности рекомендуется **не увеличивать rules version при archive/restore**, потому что содержимое правил не изменилось.

Status changes фиксируются через `updatedAt`.

---

## 50.16. GameConfig duplication создаёт version 1

Независимо от версии источника:

```text
Source v8
```

копия создаётся как:

```text
Copy v1
```

Потому что это новая самостоятельная сущность.

---

## 50.17. Read models отделяются от persisted documents

Mongo document может содержать:

```ts
ObjectId;
normalizedName;
```

Public read model должен возвращать:

```ts
id: string;
```

и не обязан отдавать внутренние технические поля:

```text
normalizedName
```

Не смешивать repository document с API response.

---

## 50.18. Summary вычисляется, а не хранится

Поля типа:

```text
mapSize
diceRange
boardSize
lottoRange
```

в карточках конфигов вычисляются из `rules` через read model factory.

Не дублировать summary в Mongo, чтобы избежать рассинхронизации.

---

## 50.19. Default configs не являются системно обязательными

Не вводить предположение:

```text
У каждого проекта ровно один default Journey config
```

Проект может иметь:

- ноль конфигов;
- один;
- несколько.

При старте игры пользователь явно выбирает config.

Автоматический default можно добавить позднее отдельной задачей.

---

## 50.20. Default seeds являются стартовыми данными, а не скрытым fallback

Если новый Project создаётся с базовыми конфигами, они должны быть реально сохранены в MongoDB.

Нельзя во время runtime молча использовать:

```ts
DEFAULT_JOURNEY_RULES;
```

если config отсутствует.

Default constants допустимы:

- для нормализации legacy data;
- для создания начального пресета;
- в unit tests.

Но production Game должна ссылаться на сохранённый GameConfig.

---

# 51. Seed-стратегия

После появления Projects нужен понятный сценарий первого запуска.

## Вариант для production migration

Migration создаёт:

```text
Project: текущий проект
Currencies: из старого AppConfig
Journey config: Основной
Battleships config: Основной
Lotto config: Основной
```

## Вариант для пустой локальной базы

Можно предоставить явную seed-команду:

```bash
npm run seed:local
```

Она создаёт:

- тестовый Project;
- одну базовую валюту;
- по одному GameConfig каждого типа.

Seed не должен автоматически запускаться в production.

## Seed idempotency

Повторный запуск:

- не создаёт дубликаты;
- ищет project по code;
- ищет configs по project + type + name;
- выводит, что уже существует.

---

# 52. Рекомендуемый формат миграционных ID

Использовать sortable ID:

```text
20260717_001_create_projects_and_game_configs
```

или:

```text
2026-07-17-split-app-config
```

Главное:

- уникальность;
- понятность;
- стабильность;
- запись в migrations collection.

Не привязывать migration ID к случайному UUID.

---

# 53. Проверка ссылочной целостности

MongoDB не обеспечивает foreign keys, поэтому целостность проверяет service layer.

Перед созданием GameConfig:

```text
Project exists
All currencies exist
All currencies active
```

Перед созданием Game:

```text
Project exists and active
GameConfig exists in Project
GameConfig active
GameConfig type matches endpoint
```

Перед архивированием Currency:

```text
No active GameConfig depends on it
```

Перед физическим удалением GameConfig, если оно когда-либо появится:

```text
No Game references it
```

---

# 54. Project-scoped query policy

Все новые repository/service методы дочерних сущностей должны принимать `projectId`.

Предпочтительно:

```ts
getGameConfig(projectId, gameConfigId);
```

а не:

```ts
getGameConfig(gameConfigId);
```

Даже при глобально уникальном ObjectId это снижает риск доступа к чужому проекту после появления ролей.

Mongo query:

```ts
{
  _id: new ObjectId(gameConfigId),
  projectId: new ObjectId(projectId),
}
```

---

# 55. Политика 404 и 403

До появления auth запрос конфига не в том Project должен возвращать:

```text
404 Not Found
```

После появления membership можно продолжить использовать 404, чтобы не раскрывать существование ресурса чужого проекта.

`403 Forbidden` использовать, когда:

- пользователь имеет доступ к Project;
- но его роль не разрешает операцию.

---

# 56. Обработка частично мигрированных данных

Application не должна работать в неопределённом mixed state бесконечно.

Во время rollout допускаются:

```text
legacy AppConfig
new Project/GameConfig
```

Но для каждого legacy config должен быть однозначный migration status.

Можно хранить:

```ts
legacyConfigId;
```

в metadata нового Project/GameConfig только на период миграции.

После успешного перехода это поле можно удалить отдельной migration.

Нельзя использовать legacy ID как постоянную основу новой модели.

---

# 57. Наблюдаемость миграции

Migration должна логировать не только counts, но и аномалии:

```text
missing source config
unknown currency reference
duplicate normalized project code
duplicate normalized config name
game without configId
game with unsupported rules shape
currency used with incompatible precision
```

Каждая аномалия должна содержать идентификатор документа.

Не выводить в лог полные игровые документы без необходимости.

---

# 58. Минимальный smoke-сценарий после production rollout

После миграции вручную проверить:

1. Открывается список Projects.
2. Открывается мигрированный Project.
3. Отображаются валюты.
4. Отображаются три типа GameConfig.
5. Открывается старый Journey game.
6. Его результаты и логи не изменились.
7. Через project-scoped API создаётся отдельный Journey config.
8. В нём изменяется награда.
9. Создаётся новая Journey по этому config.
10. Новая партия использует изменённую награду.
11. Старая партия использует старую snapshot.
12. Preset удаляется физически.
13. Существующая партия, созданная по удалённому preset, продолжает открываться из своего snapshot.
14. Попытка удалить валюту, на которую ссылается preset этого Project, отклоняется; API возвращает для неё `canDelete: false`.

---

# 59. Финальный Definition of Done

Работа полностью завершена, когда:

- [ ] старый `AppConfig` больше не является runtime source of truth;
- [ ] существует Project domain;
- [ ] существуют project-owned currencies;
- [ ] существуют independent GameConfig;
- [ ] поддерживаются несколько конфигов одного GameType;
- [ ] Project и GameConfig удаляются физически; archive/restore и duplicate flows отсутствуют;
- [ ] Game хранит immutable snapshots;
- [ ] backend API project-scoped;
- [ ] frontend разделён на Project и game-specific pages;
- [ ] миграция production данных подготовлена и протестирована;
- [ ] миграция не запускается автоматически;
- [ ] дополнительные MongoDB indexes и optimistic locking не введены в MVP;
- [ ] legacy games читаются;
- [ ] новые games создаются только через новый flow;
- [ ] typecheck и build проходят; выполнен документированный manual smoke checklist;
- [ ] backup README содержит команды локальной Mongo и детерминированного backup import/restore;
- [ ] Codex перечислил все оставшиеся compatibility fallbacks.

---

# 60. Финальная инструкция исполнителю

Не воспринимай эту задачу как простое переименование `AppConfig`.

Это изменение границ домена.

Работай от следующих инвариантов:

```text
Project — верхняя граница изоляции.
```

```text
Project владеет валютами.
```

```text
Project владеет игровыми конфигурациями.
```

```text
GameConfig описывает одну игру.
```

```text
Game получает полную копию правил при создании.
```

```text
Исторические игры не зависят от редактируемых сущностей.
```

```text
Шаблоны только копируются.
```

```text
Удаление заменяется архивированием.
```

Перед изменением кода составь impact map и план миграции.

Не удаляй старую реализацию до того, как новая модель:

- сохраняет данные;
- читает данные;
- создаёт новые игры;
- отображает старые игры;
- покрыта тестами;
- имеет проверенную migration.

При обнаружении неоднозначности не выбирай молча наиболее быстрый вариант. Сверь решение с архитектурными инвариантами документа и явно зафиксируй принятое допущение в итоговом отчёте.
