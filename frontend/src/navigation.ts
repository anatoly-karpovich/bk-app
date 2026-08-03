import { appHeaderTexts } from "./texts/appHeaderTexts";

export const navigationGroups = [
  {
    id: "games",
    label: appHeaderTexts.nav.games,
    items: [
      { key: "journey", label: appHeaderTexts.nav.journey, to: "/journey" },
      { key: "lotto", label: appHeaderTexts.nav.lotto, to: "/lotto" },
      { key: "battleship", label: appHeaderTexts.nav.battleship, to: "/battleship" },
    ],
  },
  {
    id: "utilities",
    label: "Утилиты",
    items: [
      { key: "quizzes", label: "Викторины", to: "/quizzes" },
    ],
  },
  {
    id: "settings",
    label: appHeaderTexts.nav.settings,
    items: [
      { key: "project", label: appHeaderTexts.nav.project, to: "/project" },
      { key: "configs", label: appHeaderTexts.nav.configs, to: "/configs" },
      { key: "quizConfigs", label: appHeaderTexts.nav.quizConfigs, to: "/configs/quizzes" },
      { key: "users", label: appHeaderTexts.nav.users, to: "/users" },
    ],
  },
] as const;

export type NavigationGroup = typeof navigationGroups[number];
export type NavigationGroupId = NavigationGroup["id"];
export type NavigationItem = NavigationGroup["items"][number];
export type NavigationItemKey = NavigationItem["key"];

export function findNavigationItem(pathname: string): { group: NavigationGroup; item: NavigationItem } | null {
  for (const group of navigationGroups) {
    const item = group.items.find((candidate) => candidate.to === pathname);
    if (item) {
      return { group, item };
    }
  }

  return null;
}
