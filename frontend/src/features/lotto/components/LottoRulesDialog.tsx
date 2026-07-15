import { Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import { formatCurrencyValues, type CurrencyDefinition } from "../../../lib/currencyValues";
import { lottoTexts } from "../../../texts/lottoTexts";
import type { LottoRules } from "../types";

interface LottoRulesDialogProps {
  open: boolean;
  onClose: () => void;
  rules: LottoRules | null;
  currencies: CurrencyDefinition[];
}

export default function LottoRulesDialog({ open, onClose, rules, currencies }: LottoRulesDialogProps) {
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
              Приз за 1 место: {formatCurrencyValues(rules.firstPlacePrize, currencies, { includeZero: false }) || "0"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Приз за 2 место: {formatCurrencyValues(rules.secondPlacePrize, currencies, { includeZero: false }) || "0"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Приз остальным активным игрокам: {formatCurrencyValues(rules.otherActivePlayersPrize, currencies, { includeZero: false }) || "0"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Режим распределения:{" "}
              {rules.rewardDistributionMode === "split_pool"
                ? "делить банк между победителями группы"
                : "полная выплата каждому победителю"}
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
