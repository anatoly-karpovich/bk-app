import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Grid, IconButton, MenuItem, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import type { BattleshipsBoardRules, BattleshipsRules, BattleshipsShipConfig } from "../../battleships/types";
import type { ProjectCurrency } from "../../projects/types";
import CurrencyValuesEditor from "./CurrencyValuesEditor";
import RuleSection from "./RuleSection";

interface BattleshipsConfigEditorProps {
  rules: BattleshipsRules;
  currencies: ProjectCurrency[];
  disabled: boolean;
  onChange: (rules: BattleshipsRules) => void;
}

function getActiveBoard(rules: BattleshipsRules): BattleshipsBoardRules | null {
  const boards = rules.boards && typeof rules.boards === "object" ? rules.boards : {};
  return boards[String(rules.selectedBoardSize)] ?? Object.values(boards)[0] ?? null;
}

export default function BattleshipsConfigEditor({ rules, currencies, disabled, onChange }: BattleshipsConfigEditorProps) {
  const boards = rules.boards && typeof rules.boards === "object" ? rules.boards : {};
  const activeBoard = getActiveBoard(rules);
  const boardEntries = Object.entries(boards).sort(([left], [right]) => Number(left) - Number(right));

  function updateActiveBoard(patch: Partial<BattleshipsBoardRules>) {
    if (!activeBoard) {
      return;
    }

    const boardKey = String(activeBoard.boardSize);
    onChange({
      ...rules,
      selectedBoardSize: activeBoard.boardSize,
      boards: { ...boards, [boardKey]: { ...activeBoard, ...patch } },
    });
  }

  function updateShip(index: number, patch: Partial<BattleshipsShipConfig>) {
    if (!activeBoard) {
      return;
    }

    const ships = (Array.isArray(activeBoard.ships) ? activeBoard.ships : []).map((ship, currentIndex) =>
      currentIndex === index ? { ...ship, ...patch } : ship,
    );
    updateActiveBoard({ ships });
  }

  function addBoard() {
    const nextSize = Math.max(1, ...Object.keys(boards).map(Number)) + 1;
    const sourceBoard = activeBoard;
    const board: BattleshipsBoardRules = sourceBoard
      ? structuredClone({ ...sourceBoard, boardSize: nextSize })
      : { boardSize: nextSize, maxShots: 1, ships: [], prizes: { shoot: [], destroyBonus: {} } };

    onChange({
      ...rules,
      selectedBoardSize: nextSize,
      boards: { ...boards, [String(nextSize)]: board },
    });
  }

  function removeActiveBoard() {
    if (!activeBoard || boardEntries.length <= 1) {
      return;
    }

    const nextEntries = boardEntries.filter(([key]) => key !== String(activeBoard.boardSize));
    const nextBoardSize = Number(nextEntries[0][0]);
    onChange({
      ...rules,
      selectedBoardSize: nextBoardSize,
      boards: Object.fromEntries(nextEntries),
    });
  }

  return (
    <Stack spacing={2.5}>
      <RuleSection title="Доски" description="Конфиг может содержать несколько размеров доски. Для новой игры используется выбранная доска.">
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
          <AppTextInput select size="small" label="Выбранная доска" value={String(activeBoard?.boardSize ?? "")} disabled={disabled || !activeBoard} onChange={(event) => onChange({ ...rules, selectedBoardSize: Number(event.target.value) })} sx={{ minWidth: 220 }}>
            {boardEntries.map(([key, board]) => <MenuItem key={key} value={key}>{board.boardSize} × {board.boardSize}</MenuItem>)}
          </AppTextInput>
          <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={addBoard} disabled={disabled}>Добавить доску</AppPillButton>
          <AppPillButton size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={removeActiveBoard} disabled={disabled || boardEntries.length <= 1}>Удалить доску</AppPillButton>
        </Stack>
      </RuleSection>

      {activeBoard ? (
        <BattleshipsBoardEditor activeBoard={activeBoard} currencies={currencies} disabled={disabled} onChange={updateActiveBoard} />
      ) : null}
    </Stack>
  );
}

interface BattleshipsBoardEditorProps {
  activeBoard: BattleshipsBoardRules;
  currencies: ProjectCurrency[];
  disabled: boolean;
  onChange: (patch: Partial<BattleshipsBoardRules>) => void;
}

function BattleshipsBoardEditor({ activeBoard, currencies, disabled, onChange }: BattleshipsBoardEditorProps) {
  const ships = Array.isArray(activeBoard.ships) ? activeBoard.ships : [];
  const prizes = activeBoard.prizes ?? { shoot: [], destroyBonus: {} };
  const destroyBonus = prizes.destroyBonus ?? {};

  return (
    <>
          <RuleSection title="Параметры доски">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <AppTextInput fullWidth type="number" label="Максимум выстрелов" value={activeBoard.maxShots ?? 0} disabled={disabled} inputProps={{ min: 0, step: 1 }} onChange={(event) => onChange({ maxShots: Number(event.target.value) })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <AppTextInput fullWidth label="Размер поля" value={`${activeBoard.boardSize ?? 0} × ${activeBoard.boardSize ?? 0}`} disabled helperText="Размер меняется добавлением отдельной доски." />
              </Grid>
            </Grid>
          </RuleSection>

          <RuleSection title="Флот" description="Размер корабля и количество кораблей этого размера.">
            <Stack spacing={1.5}>
              {ships.map((ship, index) => (
                <Stack key={`${ship.size}-${index}`} spacing={1.5} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                    <AppTextInput size="small" type="number" label="Палуб" value={ship.size ?? 0} disabled={disabled} inputProps={{ min: 1, step: 1 }} onChange={(event) => onChange({ ships: ships.map((currentShip, currentIndex) => currentIndex === index ? { ...currentShip, size: Number(event.target.value) } : currentShip) })} sx={{ minWidth: 150 }} />
                    <AppTextInput size="small" type="number" label="Количество" value={ship.amount ?? 0} disabled={disabled} inputProps={{ min: 1, step: 1 }} onChange={(event) => onChange({ ships: ships.map((currentShip, currentIndex) => currentIndex === index ? { ...currentShip, amount: Number(event.target.value) } : currentShip) })} sx={{ minWidth: 150 }} />
                    <IconButton aria-label="Удалить корабль" color="error" disabled={disabled} onClick={() => onChange({ ships: ships.filter((_ship, currentIndex) => currentIndex !== index) })}><DeleteOutlineRoundedIcon /></IconButton>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">Бонус за уничтожение корабля</Typography>
                  <CurrencyValuesEditor currencies={currencies} values={destroyBonus[ship.size] ?? []} onChange={(rewards) => onChange({ prizes: { ...prizes, destroyBonus: { ...destroyBonus, [ship.size]: rewards } } })} disabled={disabled} />
                </Stack>
              ))}
              <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => onChange({ ships: [...ships, { size: 1, amount: 1 }] })} disabled={disabled} sx={{ alignSelf: "flex-start" }}>Добавить корабль</AppPillButton>
            </Stack>
          </RuleSection>

          <RuleSection title="Награда за попадание">
            <CurrencyValuesEditor currencies={currencies} values={prizes.shoot ?? []} onChange={(shoot) => onChange({ prizes: { ...prizes, shoot } })} disabled={disabled} />
          </RuleSection>
    </>
  );
}
