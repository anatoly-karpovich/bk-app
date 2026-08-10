import { Divider, Stack, Typography } from "@mui/material";
import GameRulesDialog from "../../../components/GameRulesDialog";
import AppInfoAlert from "../../../components/ui/AppInfoAlert";
import { formatRewardPool } from "../../rewards/resourceAmounts";
import type { ResourceDefinition } from "../../rewards/types";
import type { LottoBingoRules } from "../types";

interface LottoBingoRulesDialogProps {
  open: boolean;
  rules: LottoBingoRules | null;
  resources: ResourceDefinition[];
  onClose: () => void;
}

export default function LottoBingoRulesDialog({ open, rules, resources, onClose }: LottoBingoRulesDialogProps) {
  return (
    <GameRulesDialog open={open} title="Правила Лото Бинго" onClose={onClose} maxWidth="sm">
      {!rules ? (
        <AppInfoAlert>Конфигурация Лото Бинго пока недоступна.</AppInfoAlert>
      ) : (
        <Stack spacing={1.5} divider={<Divider flexItem />}>
          <Typography variant="body2" color="text.secondary">
            Бочонков в тираже: {rules.barrelsToDraw}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Награда первого раунда: {formatRewardPool(rules.rewards.round1, resources)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Награда второго раунда: {formatRewardPool(rules.rewards.round2, resources)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Награда третьего раунда: {formatRewardPool(rules.rewards.round3, resources)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Награда за закрытый билет: {formatRewardPool(rules.rewards.completedCard, resources)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Поощрительная награда: {formatRewardPool(rules.rewards.consolation, resources)}
          </Typography>
        </Stack>
      )}
    </GameRulesDialog>
  );
}
