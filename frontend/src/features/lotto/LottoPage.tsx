import { Alert, Grid, Stack } from "@mui/material";
import AppConfirmDialog from "../../components/ui/AppConfirmDialog";
import GameConfigSelectField from "../../components/GameConfigSelectField";
import { lottoTexts } from "../../texts/lottoTexts";
import type { Project } from "../projects/types";
import LottoCardsCard from "./components/LottoCardsCard";
import LottoLogCard from "./components/LottoLogCard";
import LottoPageHeader from "./components/LottoPageHeader";
import LottoResultsCard from "./components/LottoResultsCard";
import LottoRulesDialog from "./components/LottoRulesDialog";
import LottoSavedGamesDialog from "./components/LottoSavedGamesDialog";
import LottoSetupCard from "./components/LottoSetupCard";
import LottoStateCard from "./components/LottoStateCard";
import { useLottoGame } from "./hooks/useLottoGame";

const deleteSavedGameTexts = {
  title: "Удалить сохраненную игру",
  description: "Точно удалить сохраненную игру",
  confirm: "Удалить",
};

const removePlayerTexts = {
  title: "Исключить игрока из партии",
  description: "Точно исключить игрока из текущей партии",
  confirm: "Исключить игрока",
};

interface LottoPageProps {
  djName: string;
  selectedProject: Project | null;
}

export default function LottoPage({ djName, selectedProject }: LottoPageProps) {
  const {
    game,
    gameConfigs,
    selectedGameConfigId,
    players,
    playerErrors,
    savedGames,
    currentGameId,
    deletingSavedGame,
    playerPendingRemoval,
    savedGamesDialogOpen,
    rulesDialogOpen,
    savedGamesError,
    requestError,
    gameConfigsError,
    selectedLottoRules,
    resolvedRules,
    resolvedResources,
    canStartGame,
    headerActionsDisabled,
    boardActionsDisabled,
    setupActionsDisabled,
    pageStatusChips,
    loading,
    actions,
  } = useLottoGame({ djName, selectedProject });

  return (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <LottoPageHeader
            pageStatusChips={pageStatusChips}
            isRefreshingGame={loading.isRefreshingGame}
            isLoadingSavedGames={loading.isLoadingSavedGames}
            actionsDisabled={headerActionsDisabled}
            canRefreshGame={Boolean(game)}
            controls={
              <GameConfigSelectField
                gameConfigs={gameConfigs}
                selectedGameConfigId={selectedGameConfigId}
                onSelectedGameConfigChange={actions.selectGameConfig}
                loading={loading.isLoadingGameConfigs}
                hideHelperText
                sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "#fff" } }}
              />
            }
            onRefreshGame={actions.refreshGame}
            onOpenRules={() => actions.setRulesDialogOpen(true)}
            onOpenSavedGames={actions.openSavedGamesDialog}
            onRestartGame={actions.restartGame}
          />
        </Grid>

        {!djName.trim() ? (
          <Grid item xs={12}>
            <Alert severity="warning">{lottoTexts.alerts.setDjName}</Alert>
          </Grid>
        ) : null}

        {!game && !selectedLottoRules && !gameConfigsError && !loading.isLoadingGameConfigs ? (
          <Grid item xs={12}>
            <Alert severity="warning">{lottoTexts.alerts.missingConfig}</Alert>
          </Grid>
        ) : null}

        {requestError ? (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => actions.setRequestError(null)}>
              {requestError}
            </Alert>
          </Grid>
        ) : null}

        {!game && gameConfigsError ? (
          <Grid item xs={12}>
            <Alert severity="error">{gameConfigsError}</Alert>
          </Grid>
        ) : null}

        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {!game ? (
              <LottoSetupCard
                players={players}
                playerErrors={playerErrors}
                rules={resolvedRules}
                actionsDisabled={setupActionsDisabled}
                canStartGame={canStartGame}
                isStartingGame={loading.isStartingGame}
                onStartGame={actions.startGame}
                onPlayerNameChange={actions.changePlayerName}
                onPlayerNumbersChange={actions.changePlayerNumbers}
                onGenerateCard={actions.generatePlayerCard}
                onRemovePlayerField={actions.removePlayerField}
                onAddPlayerField={actions.addPlayerField}
              />
            ) : (
              <LottoStateCard
                game={game}
                canDrawNextNumber={!game.derived.gameIsOver}
                actionsDisabled={boardActionsDisabled}
                onDrawNextNumber={actions.drawNextNumber}
              />
            )}

            {game?.derived.gameIsOver ? <LottoResultsCard game={game} resources={resolvedResources} /> : null}
            <LottoLogCard events={game?.events} />
          </Stack>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            <LottoCardsCard
              game={game}
              actionsDisabled={boardActionsDisabled}
              onCopyNumbers={actions.copyPlayerCardNumbers}
              onRemovePlayer={actions.requestRemovePlayerFromGame}
            />
          </Stack>
        </Grid>
      </Grid>

      <LottoRulesDialog
        open={rulesDialogOpen}
        onClose={() => actions.setRulesDialogOpen(false)}
        rules={resolvedRules}
        resources={resolvedResources}
      />

      <LottoSavedGamesDialog
        open={savedGamesDialogOpen}
        games={savedGames}
        currentGameId={currentGameId}
        loading={loading.isLoadingSavedGames}
        restoreLoading={loading.isRestoringGame}
        deletingGameId={loading.isDeletingSavedGame ? (deletingSavedGame?.id ?? null) : null}
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
            ? `${deleteSavedGameTexts.description} "${deletingSavedGame.configName}"?`
            : deleteSavedGameTexts.description
        }
        confirmLabel={deleteSavedGameTexts.confirm}
        cancelLabel={lottoTexts.actions.cancel}
        confirmColor="error"
        loading={loading.isDeletingSavedGame}
        onClose={actions.cancelDeleteSavedGame}
        onConfirm={actions.confirmDeleteSavedGame}
      />

      <AppConfirmDialog
        open={Boolean(playerPendingRemoval)}
        title={removePlayerTexts.title}
        description={
          playerPendingRemoval
            ? `${removePlayerTexts.description} "${playerPendingRemoval.nickname}"?`
            : removePlayerTexts.description
        }
        confirmLabel={removePlayerTexts.confirm}
        cancelLabel={lottoTexts.actions.cancel}
        confirmColor="error"
        loading={Boolean(loading.removingPlayerId)}
        onClose={actions.cancelRemovePlayerFromGame}
        onConfirm={actions.confirmRemovePlayerFromGame}
      />
    </>
  );
}
