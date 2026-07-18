import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle, Divider, List, ListItem, Stack, Typography } from "@mui/material";
import AppChip from "../../../components/ui/AppChip";
import AppPillButton from "../../../components/ui/AppPillButton";
import { formatCurrencyValues, type CurrencyDefinition } from "../../../lib/currencyValues";
import { battleshipsTexts } from "../../../texts/battleshipsTexts";
import type { BattleshipsBoardRules } from "../types";

interface BattleshipsRulesDialogProps {
  open: boolean;
  onClose: () => void;
  boardConfig: BattleshipsBoardRules | null;
  currencies: CurrencyDefinition[];
  fleetSummary: string[];
}

export default function BattleshipsRulesDialog({
  open,
  onClose,
  boardConfig,
  currencies,
  fleetSummary,
}: BattleshipsRulesDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{battleshipsTexts.rulesDialogTitle}</DialogTitle>
      <DialogContent dividers>
        {boardConfig ? (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <AppChip label={`Поле: ${boardConfig.boardSize}x${boardConfig.boardSize}`} color="secondary" />
              <AppChip label={`Попытки: ${boardConfig.maxShots}`} color="info" />
              <AppChip
                label={`Попадание: ${formatCurrencyValues(boardConfig.prizes.shoot, currencies, { showPlus: true, includeZero: false }) || "0"}`}
                color="success"
              />
            </Stack>

            <Divider />

            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Состав флота
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {fleetSummary.map((item) => (
                  <AppChip key={item} variant="outlined" label={item} />
                ))}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Формула начисления
              </Typography>
              <List disablePadding>
                <ListItem disableGutters>
                  <Typography>Мимо: +0</Typography>
                </ListItem>
                <ListItem disableGutters>
                  <Typography>Ранен: {formatCurrencyValues(boardConfig.prizes.shoot, currencies, { showPlus: true, includeZero: false }) || "0"}</Typography>
                </ListItem>
                <ListItem disableGutters>
                  <Typography>
                    Убит: {formatCurrencyValues(boardConfig.prizes.shoot, currencies, { showPlus: true, includeZero: false }) || "0"} за попадание и бонус за добитый корабль:
                  </Typography>
                </ListItem>
                {Object.entries(boardConfig.prizes.destroyBonus)
                  .sort((left, right) => Number(right[0]) - Number(left[0]))
                  .map(([shipSize, rewards]) => (
                    <ListItem key={shipSize} disableGutters sx={{ pl: 2 }}>
                      <Typography>
                        {shipSize}-палубный: {formatCurrencyValues(rewards, currencies, { showPlus: true, includeZero: false }) || "0"}
                      </Typography>
                    </ListItem>
                  ))}
              </List>
            </Box>
          </Stack>
        ) : (
          <Alert severity="info" icon={<MenuBookRoundedIcon fontSize="inherit" />}>
            Battleships-конфиг пока не загружен.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppPillButton color="inherit" onClick={onClose}>
          {battleshipsTexts.actions.close}
        </AppPillButton>
      </DialogActions>
    </Dialog>
  );
}
