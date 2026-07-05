import { Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import { lottoTexts } from "../../../texts/lottoTexts";
import type { LottoRules } from "../types";

interface LottoRulesDialogProps {
  open: boolean;
  onClose: () => void;
  rules: LottoRules | null;
  currency: string;
}

export default function LottoRulesDialog({ open, onClose, rules, currency }: LottoRulesDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{lottoTexts.rulesDialogTitle}</DialogTitle>
      <DialogContent dividers>
        {!rules ? (
          <Typography variant="body2" color="text.secondary">
            Lotto-конфиг недоступен.
          </Typography>
        ) : (
          <Stack spacing={1.5} divider={<Divider flexItem />}>
            <Typography variant="body2" color="text.secondary">
              Диапазон чисел: {rules.min}-{rules.max}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Чисел в карточке: {rules.cardNumbersAmount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Приз за 1 место: {rules.firstPlacePrize} {currency}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Приз за 2 место: {rules.secondPlacePrize} {currency}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Режим распределения: {rules.rewardDistributionMode === "split_pool" ? "делить банк между победителями" : "полная выплата каждому победителю"}
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppPillButton color="inherit" onClick={onClose}>
          {lottoTexts.actions.close}
        </AppPillButton>
      </DialogActions>
    </Dialog>
  );
}
