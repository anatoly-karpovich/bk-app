import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Grid, IconButton, MenuItem, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import type { BattleshipsBoardRules, BattleshipsRules, BattleshipsShipConfig } from "../../battleships/types";
import type { ProjectResource } from "../../projects/types";
import RewardPoolEditor, { createRewardPool } from "./RewardPoolEditor";
import RuleSection from "./RuleSection";

interface BattleshipsConfigEditorProps { rules: BattleshipsRules; resources: ProjectResource[]; disabled: boolean; onChange: (rules: BattleshipsRules) => void; }
function getActiveBoard(rules: BattleshipsRules): BattleshipsBoardRules | null { return rules.boards[String(rules.selectedBoardSize)] ?? Object.values(rules.boards)[0] ?? null; }

export default function BattleshipsConfigEditor({ rules, resources, disabled, onChange }: BattleshipsConfigEditorProps) {
  const boards = rules.boards ?? {};
  const activeBoard = getActiveBoard(rules);
  const boardEntries = Object.entries(boards).sort(([left], [right]) => Number(left) - Number(right));
  const updateActiveBoard = (patch: Partial<BattleshipsBoardRules>) => {
    if (!activeBoard) return;
    onChange({ ...rules, selectedBoardSize: activeBoard.boardSize, boards: { ...boards, [String(activeBoard.boardSize)]: { ...activeBoard, ...patch } } });
  };
  const addBoard = () => {
    const nextSize = Math.max(1, ...Object.keys(boards).map(Number)) + 1;
    const board = activeBoard ? { ...structuredClone(activeBoard), boardSize: nextSize } : { boardSize: nextSize, maxShots: 1, ships: [], rewards: { hit: createRewardPool("all", resources), destroyBonusByShipSize: {} } };
    onChange({ ...rules, selectedBoardSize: nextSize, boards: { ...boards, [String(nextSize)]: board } });
  };
  const removeActiveBoard = () => {
    if (!activeBoard || boardEntries.length <= 1) return;
    const nextEntries = boardEntries.filter(([key]) => key !== String(activeBoard.boardSize));
    onChange({ ...rules, selectedBoardSize: Number(nextEntries[0][0]), boards: Object.fromEntries(nextEntries) });
  };
  return <Stack spacing={2.5}>
    <RuleSection title="Доски" description="Конфиг может содержать несколько размеров доски.">
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
        <AppTextInput select size="small" label="Выбранная доска" value={String(activeBoard?.boardSize ?? "")} disabled={disabled || !activeBoard} onChange={(event) => onChange({ ...rules, selectedBoardSize: Number(event.target.value) })} sx={{ minWidth: 220 }}>
          {boardEntries.map(([key, board]) => <MenuItem key={key} value={key}>{board.boardSize} × {board.boardSize}</MenuItem>)}
        </AppTextInput>
        <AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={addBoard} disabled={disabled}>Добавить доску</AppPillButton>
        <AppPillButton size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={removeActiveBoard} disabled={disabled || boardEntries.length <= 1}>Удалить доску</AppPillButton>
      </Stack>
    </RuleSection>
    {activeBoard ? <BattleshipsBoardEditor activeBoard={activeBoard} resources={resources} disabled={disabled} onChange={updateActiveBoard} /> : null}
  </Stack>;
}

function BattleshipsBoardEditor({ activeBoard, resources, disabled, onChange }: { activeBoard: BattleshipsBoardRules; resources: ProjectResource[]; disabled: boolean; onChange: (patch: Partial<BattleshipsBoardRules>) => void; }) {
  const ships = activeBoard.ships ?? [];
  const updateShip = (index: number, patch: Partial<BattleshipsShipConfig>) => onChange({ ships: ships.map((ship, currentIndex) => currentIndex === index ? { ...ship, ...patch } : ship) });
  return <>
    <RuleSection title="Параметры доски"><Grid container spacing={2}><Grid item xs={12} sm={6}><AppTextInput fullWidth type="number" label="Максимум выстрелов" value={activeBoard.maxShots} disabled={disabled} inputProps={{ min: 0, step: 1 }} onChange={(event) => onChange({ maxShots: Number(event.target.value) })} /></Grid></Grid></RuleSection>
    <RuleSection title="Флот"><Stack spacing={1.5}>{ships.map((ship, index) => <Stack key={`${ship.size}-${index}`} spacing={1.5} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}><Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}><AppTextInput size="small" type="number" label="Палуб" value={ship.size} disabled={disabled} inputProps={{ min: 1, step: 1 }} onChange={(event) => updateShip(index, { size: Number(event.target.value) })} /><AppTextInput size="small" type="number" label="Количество" value={ship.amount} disabled={disabled} inputProps={{ min: 1, step: 1 }} onChange={(event) => updateShip(index, { amount: Number(event.target.value) })} /><IconButton color="error" disabled={disabled} onClick={() => onChange({ ships: ships.filter((_ship, currentIndex) => currentIndex !== index) })}><DeleteOutlineRoundedIcon /></IconButton></Stack><Typography variant="body2" color="text.secondary">Бонус за уничтожение корабля</Typography><RewardPoolEditor pool={activeBoard.rewards.destroyBonusByShipSize[ship.size] ?? createRewardPool("all", resources)} resources={resources} disabled={disabled} onChange={(pool) => onChange({ rewards: { ...activeBoard.rewards, destroyBonusByShipSize: { ...activeBoard.rewards.destroyBonusByShipSize, [ship.size]: pool } } })} /></Stack>)}<AppPillButton size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => onChange({ ships: [...ships, { size: 1, amount: 1 }] })} disabled={disabled} sx={{ alignSelf: "flex-start" }}>Добавить корабль</AppPillButton></Stack></RuleSection>
    <RuleSection title="Награда за попадание"><RewardPoolEditor pool={activeBoard.rewards.hit} resources={resources} disabled={disabled} onChange={(hit) => onChange({ rewards: { ...activeBoard.rewards, hit } })} /></RuleSection>
  </>;
}
