import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Card, CardContent, CardHeader, Grid, IconButton, Stack, Typography } from "@mui/material";
import GamePlayerNameInput from "../../../components/players/GamePlayerNameInput";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import { lottoTexts } from "../../../texts/lottoTexts";
import { getLottoCardPlaceholder } from "../mappers/lotto.mapper";
import type { LottoRules, LottoSetupPlayerInput, LottoSetupPlayerInputError } from "../types";

interface LottoSetupCardProps {
  players: LottoSetupPlayerInput[];
  playerErrors: LottoSetupPlayerInputError[];
  rules: LottoRules | null;
  actionsDisabled: boolean;
  onPlayerNameChange: (index: number, value: string) => void;
  onPlayerNumbersChange: (index: number, value: string) => void;
  onGenerateCard: (index: number) => void;
  onRemovePlayerField: (index: number) => void;
  onAddPlayerField: () => void;
}

export default function LottoSetupCard({
  players,
  playerErrors,
  rules,
  actionsDisabled,
  onPlayerNameChange,
  onPlayerNumbersChange,
  onGenerateCard,
  onRemovePlayerField,
  onAddPlayerField,
}: LottoSetupCardProps) {
  return (
    <Card>
      <CardHeader title={lottoTexts.cards.setupTitle} subheader={lottoTexts.cards.setupSubtitle} />
      <CardContent>
        <Stack spacing={2.5}>
          {rules ? (
            <Typography variant="body2" color="text.secondary">
              Диапазон: {rules.min}-{rules.max}. Чисел в карточке: {rules.cardNumbersAmount}.
            </Typography>
          ) : null}

          <Grid container spacing={2}>
            {players.map((player, index) => {
              const errors = playerErrors[index];
              const shouldShowGenerate = Boolean(errors?.cardNumbers);

              return (
                <Grid key={player.id} item xs={12}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.5}
                    alignItems={{ md: "flex-start" }}
                    sx={{
                      p: 2,
                      borderRadius: (theme) => theme.customRadii.md,
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                      backgroundColor: "rgba(248, 250, 252, 0.92)",
                    }}
                  >
                    <GamePlayerNameInput
                      label="Игрок"
                      value={player.nickname}
                      onChange={(nextValue) => onPlayerNameChange(index, nextValue)}
                      errorText={errors?.nickname ?? null}
                      helperTextMode="hidden"
                      disabled={actionsDisabled}
                    />

                    <AppTextInput
                      label="Карточка"
                      value={player.cardNumbers}
                      onChange={(event) => onPlayerNumbersChange(index, event.target.value)}
                      placeholder={getLottoCardPlaceholder(rules)}
                      error={Boolean(errors?.cardNumbers)}
                      helperText={errors?.cardNumbers ?? " "}
                      fullWidth
                      disabled={actionsDisabled}
                    />

                    <Stack direction="row" spacing={0.5} sx={{ pt: { md: 1 } }}>
                      <span>
                        <IconButton
                          color="primary"
                          onClick={() => onGenerateCard(index)}
                          disabled={actionsDisabled || !rules || !shouldShowGenerate}
                        >
                          <AutoFixHighRoundedIcon />
                        </IconButton>
                      </span>
                      <span>
                        <IconButton
                          color="error"
                          onClick={() => onRemovePlayerField(index)}
                          disabled={actionsDisabled || players.length === 1}
                        >
                          <DeleteOutlineRoundedIcon />
                        </IconButton>
                      </span>
                    </Stack>
                  </Stack>
                </Grid>
              );
            })}
          </Grid>

          <AppPillButton
            variant="outlined"
            startIcon={<AddRoundedIcon />}
            onClick={onAddPlayerField}
            disabled={actionsDisabled}
            sx={{ alignSelf: "flex-start" }}
          >
            {lottoTexts.actions.addPlayer}
          </AppPillButton>
        </Stack>
      </CardContent>
    </Card>
  );
}
