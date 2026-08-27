export const projectTexts = {
  page: {
    title: "Настройки проекта",
    description: "Общие сведения проекта, каталог ресурсов и форматы для новых ручных активностей.",
    projectChip: (projectName: string) => `Проект: ${projectName}`,
    resourcesChip: (resourcesCount: number) => `Ресурсов: ${resourcesCount}`,
    reset: "Сбросить",
    save: "Сохранить изменения",
  },
  alerts: {
    projectRequired: "Выберите проект, чтобы изменить его параметры и ресурсы.",
    projectUpdateForbidden: "Только администратор может изменять настройки проекта.",
    configsLoadFailed: (error: string) => `Не удалось загрузить список конфигов: ${error}`,
    resourceUsed: (isCurrency: boolean) => `Этот ресурс используется в игровом конфиге. Его нельзя удалить${isCurrency ? " или изменить формат валюты." : "."}`,
  },
  projectDetails: {
    title: "Сведения о проекте",
    subtitle: "Название, код и описание проекта",
    nameLabel: "Название",
    codeLabel: "Код проекта",
    codeHelper: "Код проекта неизменяем.",
    descriptionLabel: "Описание",
  },
  activityTypes: {
    title: "Активности",
    subtitle: "Названия и доступность форматов для новых ручных результатов",
    availabilityHint: "Переключатель действует только на создание новых ручных результатов и не отключает нативные игры или Quiz Event.",
    enabledLabel: "Доступен",
    defaultTitleLabel: "Название по умолчанию",
    defaultTitleRequired: "Укажите название формата.",
  },
  resource: {
    currency: "Валюта",
    item: "Предмет",
    newResource: "Новый ресурс",
    usedInConfigs: "Используется в конфигах",
    unusedInConfigs: "Не используется в конфигах",
    listTitle: "Ресурсы",
    listSubtitle: "Выберите ресурс для редактирования",
    addCurrency: "Валюта",
    addItem: "Предмет",
    editorSubtitle: "Настройки выбранного ресурса",
    nameLabel: "Название",
    valueTypeLabel: "Формат суммы",
    integerValueType: "Целая",
    decimalValueType: "Десятичная",
    precisionLabel: "Знаков после запятой",
    previewTitle: "Предпросмотр",
    previewSubtitle: "Так ресурс будет отображаться внутри игр.",
    itemPreviewPlaceholder: "Название предмета",
    currencyPreviewPlaceholder: "единиц",
    deleteAriaLabel: (resourceName: string) => `Удалить ресурс ${resourceName}`,
    countAriaLabel: (resourcesCount: number) => `Ресурсов: ${resourcesCount}`,
    meta: (resourceType: "currency" | "item", state: "new" | "used" | "unused") => {
      const type = resourceType === "currency" ? "Валюта" : "Предмет";
      const status = {
        new: "новый ресурс",
        used: "используется в конфигах",
        unused: "не используется в конфигах",
      }[state];

      return `${type} · ${status}`;
    },
  },
  usage: {
    title: "Использование в конфигах",
    subtitle: "Игры и пресеты, которые используют выбранный ресурс",
    gameColumn: "Игра",
    configColumn: "Пресет",
    usageColumn: "Использование",
    empty: "Ресурс пока не используется в игровых конфигах.",
    rulesAndRewards: "Правила и награды",
    gameNames: {
      journey: "Карта Мародёров",
      lotto: "Лото",
      battleships: "Морской бой",
    },
  },
} as const;
