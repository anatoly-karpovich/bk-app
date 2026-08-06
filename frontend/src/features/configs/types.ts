import type { ReactNode } from "react";

export type JourneyConfigSectionId = "map" | "rewards" | "jackpot" | "cells" | "achievements";
export type JourneyConfigPageSectionId = "general" | JourneyConfigSectionId;

export type LottoConfigSectionId = "general" | "card" | "prizes" | "distribution";

export type BattleshipsConfigSectionId = "general" | "boards" | "board" | "fleet" | "rewards";

export type QuizConfigSectionId = "general" | "rewards" | "bonus" | "messages";

export interface ConfigSection<TSectionId extends string> {
  id: TSectionId;
  label: string;
  description: string;
  icon: ReactNode;
}
