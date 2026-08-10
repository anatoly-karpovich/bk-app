import type { LottoBingoGameView, LottoBingoPhase } from "./types";

const phaseLabels: Record<LottoBingoPhase, string> = {
  registration: "Регистрация",
  round1: "Раунд 1",
  round2: "Раунд 2",
  round3: "Раунд 3",
  remaining_barrels: "Добор",
  ready_to_finalize: "Завершение",
  finished: "Завершена",
};

export function getLottoBingoPhaseLabel(phase: LottoBingoPhase) {
  return phaseLabels[phase];
}

export function formatLottoBingoTimestamp(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getCandidateDescription(candidate: LottoBingoGameView["state"]["round"]["candidates"][number]) {
  return candidate.matchedAreas.map((area) => {
    if (area.type === "full_card") return "закрыт весь билет";
    if (area.type === "half") return `закрыта ${area.half === "top" ? "верхняя" : "нижняя"} половина`;
    return `закрыта ${area.rowIndexes.length > 1 ? "строки" : "строка"} ${area.rowIndexes.map((index) => index + 1).join(" и ")}`;
  }).join(", ");
}
