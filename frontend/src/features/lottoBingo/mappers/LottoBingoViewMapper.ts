import type { LottoBingoGameView, LottoBingoPageModel } from "../types";

/** Converts the public backend view into the page contract without re-evaluating game rules. */
export class LottoBingoViewMapper {
  toPageModel(view: LottoBingoGameView): LottoBingoPageModel {
    return structuredClone(view);
  }
}

export const lottoBingoViewMapper = new LottoBingoViewMapper();
