import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import { Box, Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import AppChip from "../../../components/ui/AppChip";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import AppSelectableListItem from "../../../components/ui/AppSelectableListItem";
import AppTextInput from "../../../components/ui/AppTextInput";
import BattleshipsShipPreview from "../../battleships/components/BattleshipsShipPreview";
import type { BattleshipsBoardRules, BattleshipsRules } from "../../battleships/types";
import type { ProjectResource } from "../../projects/types";
import type { RewardPool } from "../../rewards/types";
import RewardPoolSummaryChip from "../../rewards/components/RewardPoolSummaryChip";
import { battleshipsConfigTexts } from "../../../texts/battleshipsConfigTexts";
import ConfigContextChip from "./ConfigContextChip";
import RewardPoolEditor from "./RewardPoolEditor";
import RuleSection from "./RuleSection";

const FIXED_SHIP_SIZES = [4, 3, 2, 1] as const;

function getBoard(rules: BattleshipsRules): BattleshipsBoardRules | null {
  return rules.boards["6"] ?? rules.boards[String(rules.selectedBoardSize)] ?? Object.values(rules.boards)[0] ?? null;
}

function getShipAmount(board: BattleshipsBoardRules, size: number): number {
  return board.ships.find((ship) => ship.size === size)?.amount ?? 0;
}

function getDestroyPool(board: BattleshipsBoardRules, size: number): RewardPool | undefined {
  return board.rewards.destroyBonusByShipSize[size];
}

export function BattleshipsBoardSelectionSection({ rules }: { rules: BattleshipsRules }) {
  const board = getBoard(rules);
  if (!board) return null;

  const shipsCount = board.ships.reduce((count, ship) => count + ship.amount, 0);

  return (
    <RuleSection title={battleshipsConfigTexts.boards.title} description={battleshipsConfigTexts.boards.description}>
      <Stack spacing={2}>
        <AppSelectableListItem
          primaryText={battleshipsConfigTexts.boards.boardLabel}
          secondaryText={battleshipsConfigTexts.boards.boardDescription(board.maxShots, shipsCount)}
          icon={<GridViewRoundedIcon fontSize="small" />}
          selected
          disabled
          onClick={() => undefined}
          trailing={<AppChip size="small" label="Активная" color="primary" />}
        />
        <AppInfoAlert>{battleshipsConfigTexts.boards.fixedNotice}</AppInfoAlert>
      </Stack>
    </RuleSection>
  );
}

export function BattleshipsBoardRulesSection({
  rules,
  sourceRules,
  disabled,
  onChange,
}: {
  rules: BattleshipsRules;
  sourceRules: BattleshipsRules;
  disabled: boolean;
  onChange: (rules: BattleshipsRules) => void;
}) {
  const board = getBoard(rules);
  const sourceBoard = getBoard(sourceRules);
  if (!board) return null;

  return (
    <RuleSection title={battleshipsConfigTexts.board.title} description={battleshipsConfigTexts.board.description}>
      <Grid container spacing={3} alignItems="center">
        <Grid item xs={12} md={5}>
          <Stack spacing={2}>
            <AppTextInput fullWidth label={battleshipsConfigTexts.board.size} value="6 × 6" disabled />
            <AppTextInput
              fullWidth
              type="number"
              label={battleshipsConfigTexts.board.maxShots}
              value={board.maxShots}
              changed={board.maxShots !== sourceBoard?.maxShots}
              disabled={disabled}
              inputProps={{ min: 0, step: 1 }}
              onChange={(event) =>
                onChange({
                  ...rules,
                  boards: { ...rules.boards, [String(board.boardSize)]: { ...board, maxShots: Number(event.target.value) } },
                })
              }
            />
          </Stack>
        </Grid>
        <Grid item xs={12} md={7}>
          <BattleshipsBoardPreview />
        </Grid>
      </Grid>
    </RuleSection>
  );
}

function BattleshipsBoardPreview() {
  return (
    <Stack spacing={1} alignItems="center">
      <ConfigContextChip label={battleshipsConfigTexts.board.previewTitle} icon={<GridViewRoundedIcon fontSize="small" />} />
      <Box
        aria-label={battleshipsConfigTexts.board.previewTitle}
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(28px, 42px))",
          gap: 0.75,
          width: "100%",
          maxWidth: 280,
        }}
      >
        {Array.from({ length: 36 }, (_, index) => (
          <Box
            key={index}
            sx={{ aspectRatio: "1", borderRadius: 1.25, border: "1px solid", borderColor: "secondary.light", bgcolor: "rgba(219, 234, 254, 0.72)" }}
          />
        ))}
      </Box>
    </Stack>
  );
}

export function BattleshipsFleetSection({ rules }: { rules: BattleshipsRules }) {
  const board = getBoard(rules);
  if (!board) return null;

  const shipsCount = board.ships.reduce((count, ship) => count + ship.amount, 0);
  const occupiedDecks = board.ships.reduce((count, ship) => count + ship.size * ship.amount, 0);
  const density = Math.round((occupiedDecks / 36) * 100);

  return (
    <RuleSection title={battleshipsConfigTexts.fleet.title} description={battleshipsConfigTexts.fleet.description}>
      <Stack spacing={2.25}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap gap={1}>
          <AppChip label={battleshipsConfigTexts.fleet.total(shipsCount)} color="primary" />
          <Typography variant="body2" color="text.secondary">
            {battleshipsConfigTexts.fleet.occupied}: <strong>{occupiedDecks}</strong> · {battleshipsConfigTexts.fleet.density}: <strong>{density}%</strong>
          </Typography>
        </Stack>
        <Grid container spacing={2}>
          {FIXED_SHIP_SIZES.map((size) => {
            const amount = getShipAmount(board, size);
            return (
              <Grid key={size} item xs={12} sm={6} xl={3}>
                <Card variant="outlined" sx={{ height: "100%", boxShadow: "none", bgcolor: amount ? "background.paper" : "rgba(248, 250, 252, 0.8)" }}>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <BattleshipsShipPreview size={size} muted={!amount} />
                      <Typography variant="subtitle1" fontWeight={700}>{battleshipsConfigTexts.rewards.shipTitle(size)}</Typography>
                      <AppTextInput fullWidth type="number" label={battleshipsConfigTexts.fleet.amount} value={amount} disabled />
                      <Typography variant="caption" color="text.secondary">
                        {amount ? `Занимает ${size} ${size === 1 ? "клетку" : size < 5 ? "клетки" : "клеток"} поля.` : battleshipsConfigTexts.fleet.absent}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
        <AppInfoAlert>{battleshipsConfigTexts.fleet.fixedNotice}</AppInfoAlert>
      </Stack>
    </RuleSection>
  );
}

interface BattleshipsRewardEditorCardProps {
  title: string;
  description: string;
  pool: RewardPool | undefined;
  sourcePool: RewardPool | undefined;
  resources: ProjectResource[];
  disabled: boolean;
  shipSize?: number;
  shipsAmount?: number;
  onChange: (pool: RewardPool) => void;
}

function BattleshipsRewardEditorCard({
  title,
  description,
  pool,
  sourcePool,
  resources,
  disabled,
  shipSize,
  shipsAmount,
  onChange,
}: BattleshipsRewardEditorCardProps) {
  return (
    <Card variant="outlined" sx={{ height: "100%", boxShadow: "none" }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="flex-start">
            <Stack spacing={0.75}>
              {shipSize ? <BattleshipsShipPreview size={shipSize} compact muted={!shipsAmount} /> : null}
              <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
              <Typography variant="body2" color="text.secondary">{description}</Typography>
              {shipSize !== undefined && shipsAmount !== undefined ? (
                <Typography variant="caption" color="text.secondary">{battleshipsConfigTexts.rewards.shipsInFleet(shipsAmount)}</Typography>
              ) : null}
            </Stack>
            <RewardPoolSummaryChip pool={pool} resources={resources} color="primary" />
          </Stack>
          <RewardPoolEditor
            pool={pool}
            sourcePool={sourcePool}
            resources={resources}
            disabled={disabled}
            emptyLabel={battleshipsConfigTexts.rewards.emptyReward}
            onChange={onChange}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

export function BattleshipsRewardsSection({
  rules,
  sourceRules,
  resources,
  disabled,
  onChange,
}: {
  rules: BattleshipsRules;
  sourceRules: BattleshipsRules;
  resources: ProjectResource[];
  disabled: boolean;
  onChange: (rules: BattleshipsRules) => void;
}) {
  const board = getBoard(rules);
  const sourceBoard = getBoard(sourceRules);
  if (!board) return null;

  const updateRewards = (patch: Partial<BattleshipsBoardRules["rewards"]>) => {
    onChange({
      ...rules,
      boards: {
        ...rules.boards,
        [String(board.boardSize)]: { ...board, rewards: { ...board.rewards, ...patch } },
      },
    });
  };

  return (
    <Stack spacing={2.25}>
      <RuleSection title={battleshipsConfigTexts.rewards.hitTitle} description={battleshipsConfigTexts.rewards.hitDescription}>
        <BattleshipsRewardEditorCard
          title={battleshipsConfigTexts.rewards.hitTitle}
          description={battleshipsConfigTexts.rewards.hitDescription}
          pool={board.rewards.hit}
          sourcePool={sourceBoard?.rewards.hit}
          resources={resources}
          disabled={disabled}
          onChange={(hit) => updateRewards({ hit })}
        />
      </RuleSection>

      <RuleSection title={battleshipsConfigTexts.rewards.destroyTitle} description={battleshipsConfigTexts.rewards.destroyDescription}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
            gap: 2,
          }}
        >
          {FIXED_SHIP_SIZES.map((size) => (
            <Box key={size}>
              <BattleshipsRewardEditorCard
                title={battleshipsConfigTexts.rewards.shipTitle(size)}
                description={battleshipsConfigTexts.rewards.destroyDescription}
                pool={getDestroyPool(board, size)}
                sourcePool={sourceBoard ? getDestroyPool(sourceBoard, size) : undefined}
                resources={resources}
                disabled={disabled}
                shipSize={size}
                shipsAmount={getShipAmount(board, size)}
                onChange={(pool) =>
                  updateRewards({
                    destroyBonusByShipSize: { ...board.rewards.destroyBonusByShipSize, [size]: pool },
                  })
                }
              />
            </Box>
          ))}
        </Box>
      </RuleSection>
    </Stack>
  );
}

export function getBattleshipsConfigBoard(rules: BattleshipsRules): BattleshipsBoardRules | null {
  return getBoard(rules);
}
