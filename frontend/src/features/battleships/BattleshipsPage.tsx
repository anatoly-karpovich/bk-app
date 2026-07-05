import { Alert, Grid, Stack } from "@mui/material";
import AppConfirmDialog from "../../components/ui/AppConfirmDialog";
import { battleshipsTexts } from "../../texts/battleshipsTexts";
import type { AppConfig } from "../configs/types";
import BattleshipsBoardCard from "./components/BattleshipsBoardCard";
import BattleshipsLogCard from "./components/BattleshipsLogCard";
import BattleshipsPageHeader from "./components/BattleshipsPageHeader";
import BattleshipsRulesDialog from "./components/BattleshipsRulesDialog";
import BattleshipsSavedGamesDialog from "./components/BattleshipsSavedGamesDialog";
import BattleshipsSetupCard from "./components/BattleshipsSetupCard";
import BattleshipsStateCard from "./components/BattleshipsStateCard";
import { useBattleshipsGame } from "./hooks/useBattleshipsGame";

const deleteSavedGameTexts = {
  title: "Удалить сохраненную игру",
  description: "Точно удалить сохраненную игру",
  confirm: "Удалить",
};

interface BattleshipsPageProps {
  djName: string;
  selectedConfig: AppConfig | null;
}

export default function BattleshipsPage({ djName, selectedConfig }: BattleshipsPageProps) {
  const {
    game,
    playerName,
    savedGames,
    storedGameId,
    deletingSavedGame,
    savedGamesDialogOpen,
    rulesDialogOpen,
    savedGamesError,
    requestError,
    selectedBattleshipsRules,
    boardConfig,
    fleetSummary,
    canStartGame,
    canUndoShot,
    pageStatusChips,
    headerActionsDisabled,
    boardActionsDisabled,
    loading,
    actions,
  } = useBattleshipsGame({ djName, selectedConfig });

  return (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <BattleshipsPageHeader
            pageStatusChips={pageStatusChips}
            canStartGame={canStartGame}
            hasGame={Boolean(game)}
            isStartingGame={loading.isStartingGame}
            isLoadingSavedGames={loading.isLoadingSavedGames}
            isResettingGame={loading.isResettingGame}
            actionsDisabled={headerActionsDisabled}
            onOpenRules={() => actions.setRulesDialogOpen(true)}
            onStartGame={actions.startGame}
            onOpenSavedGames={actions.openSavedGamesDialog}
            onRestartGame={actions.restartGame}
          />
        </Grid>

        {!djName.trim() ? (
          <Grid item xs={12}>
            <Alert severity="warning">{battleshipsTexts.alerts.setDjName}</Alert>
          </Grid>
        ) : null}

        {!game && !selectedBattleshipsRules ? (
          <Grid item xs={12}>
            <Alert severity="warning">{battleshipsTexts.alerts.missingConfig}</Alert>
          </Grid>
        ) : null}

        {requestError ? (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => actions.setRequestError(null)}>
              {requestError}
            </Alert>
          </Grid>
        ) : null}

        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {game ? (
              <BattleshipsStateCard
                game={game}
                canUndoShot={canUndoShot}
                undoLoading={loading.isUndoingShot}
                boardActionsDisabled={boardActionsDisabled}
                onUndoShot={actions.undoShot}
              />
            ) : (
              <BattleshipsSetupCard
                playerName={playerName}
                boardConfig={boardConfig}
                fleetSummary={fleetSummary}
                actionsDisabled={loading.isStartingGame || loading.isResettingGame}
                onPlayerNameChange={actions.setPlayerName}
              />
            )}

            <BattleshipsLogCard shots={game?.shots ?? []} currency={boardConfig?.currency ?? ""} />
          </Stack>
        </Grid>

        <Grid item xs={12} lg={8}>
          <BattleshipsBoardCard game={game} actionsDisabled={boardActionsDisabled} onShoot={actions.fireShot} />
        </Grid>
      </Grid>

      <BattleshipsRulesDialog
        open={rulesDialogOpen}
        onClose={() => actions.setRulesDialogOpen(false)}
        boardConfig={boardConfig}
        fleetSummary={fleetSummary}
      />

      <BattleshipsSavedGamesDialog
        open={savedGamesDialogOpen}
        games={savedGames}
        currentGameId={storedGameId}
        loading={loading.isLoadingSavedGames}
        restoreLoading={loading.isRestoringGame}
        deletingGameId={loading.isDeletingSavedGame ? deletingSavedGame?.id ?? null : null}
        error={savedGamesError}
        onClose={() => actions.setSavedGamesDialogOpen(false)}
        onRestore={actions.restoreSavedGame}
        onDelete={actions.requestDeleteSavedGame}
      />

      <AppConfirmDialog
        open={Boolean(deletingSavedGame)}
        title={deleteSavedGameTexts.title}
        description={
          deletingSavedGame
            ? `${deleteSavedGameTexts.description} "${deletingSavedGame.playerName}"?`
            : deleteSavedGameTexts.description
        }
        confirmLabel={deleteSavedGameTexts.confirm}
        cancelLabel={battleshipsTexts.actions.cancel}
        confirmColor="error"
        loading={loading.isDeletingSavedGame}
        onClose={actions.cancelDeleteSavedGame}
        onConfirm={actions.confirmDeleteSavedGame}
      />
    </>
  );
}
