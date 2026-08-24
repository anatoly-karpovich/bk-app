import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import CasinoRoundedIcon from "@mui/icons-material/CasinoRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Box, Card, CardContent, CardHeader, IconButton, Stack, Typography } from "@mui/material";
import AddPlayerButton from "../../../components/AddPlayerButton";
import GameStartButton from "../../../components/GameStartButton";
import ProjectPlayerAutocomplete from "../../../components/players/ProjectPlayerAutocomplete";
import AppTextInput from "../../../components/ui/AppTextInput";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import { lottoTexts } from "../../../texts/lottoTexts";
import type { PlayerReferenceInput, ProjectPlayer } from "../../players/types";
import { getLottoCardPlaceholder } from "../mappers/lotto.mapper";
import type { LottoRules, LottoSetupPlayerInput, LottoSetupPlayerInputError } from "../types";

interface LottoSetupCardProps {
  players: LottoSetupPlayerInput[];
  projectPlayers: ProjectPlayer[];
  projectPlayersError: string | null;
  projectPlayersLoading: boolean;
  playerErrors: LottoSetupPlayerInputError[];
  rules: LottoRules | null;
  actionsDisabled: boolean;
  canStartGame: boolean;
  isStartingGame: boolean;
  onStartGame: () => void;
  onPlayerChange: (index: number, value: PlayerReferenceInput) => void;
  onPlayerNumbersChange: (index: number, value: string) => void;
  onGenerateCard: (index: number) => void;
  onRemovePlayerField: (index: number) => void;
  onAddPlayerField: () => void;
}

export default function LottoSetupCard({
  players,
  projectPlayers,
  projectPlayersError,
  projectPlayersLoading,
  playerErrors,
  rules,
  actionsDisabled,
  canStartGame,
  isStartingGame,
  onStartGame,
  onPlayerChange,
  onPlayerNumbersChange,
  onGenerateCard,
  onRemovePlayerField,
  onAddPlayerField,
}: LottoSetupCardProps) {
  return (
    <Card>
      <CardHeader
        title={lottoTexts.cards.setupTitle}
        subheader={lottoTexts.cards.setupSubtitle}
        sx={{ "& .MuiCardHeader-action": { mr: 0, mt: 0.5 } }}
        action={
          <GameStartButton
            label={lottoTexts.actions.newGame}
            startIcon={<CasinoRoundedIcon />}
            onClick={onStartGame}
            disabled={actionsDisabled || !canStartGame}
            loading={isStartingGame}
          />
        }
      />
      <CardContent>
        <Stack spacing={2.5}>
          {rules ? (
            <Typography variant="body2" color="text.secondary">
              Диапазон: {rules.min}-{rules.max}. Чисел в карточке: {rules.cardNumbersAmount}.
            </Typography>
          ) : null}

          <AppResponsiveGrid columns={{ xs: 1 }}>
            {players.map((player, index) => {
              const errors = playerErrors[index];
              const shouldShowGenerate = Boolean(errors?.cardNumbers);

              return (
                <Stack
                  key={player.id}
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
                    <ProjectPlayerAutocomplete
                      label="Игрок"
                      value={{ nickname: player.nickname, playerRefId: player.playerRefId }}
                      players={projectPlayers}
                      loading={projectPlayersLoading}
                      loadError={projectPlayersError}
                      errorText={errors?.nickname ?? null}
                      onChange={(nextValue) => onPlayerChange(index, nextValue)}
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
              );
            })}
          </AppResponsiveGrid>

          <Box sx={{ alignSelf: "flex-start" }}>
            <AddPlayerButton onClick={onAddPlayerField} disabled={actionsDisabled} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
