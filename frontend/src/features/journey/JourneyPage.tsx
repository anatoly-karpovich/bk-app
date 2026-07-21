import { Alert, Grid, Stack } from "@mui/material";
import AppConfirmDialog from "../../components/ui/AppConfirmDialog";
import GameConfigSelectField from "../../components/GameConfigSelectField";
import type { Project } from "../projects/types";
import { journeyTexts } from "../../texts/journeyTexts";
import JourneyImportDialog from "./components/JourneyImportDialog";
import JourneyForumMovesPreviewDialog from "./components/JourneyForumMovesPreviewDialog";
import JourneyForumStateDialog from "./components/JourneyForumStateDialog";
import JourneyLogCard from "./components/JourneyLogCard";
import JourneyMapCard from "./components/JourneyMapCard";
import JourneyPageHeader from "./components/JourneyPageHeader";
import JourneyPlayersSetupCard from "./components/JourneyPlayersSetupCard";
import JourneyResultsCard from "./components/JourneyResultsCard";
import JourneyRoundControlsCard from "./components/JourneyRoundControlsCard";
import JourneyRulesDialog from "./components/JourneyRulesDialog";
import JourneySavedGamesDialog from "./components/JourneySavedGamesDialog";
import JourneyStateCard from "./components/JourneyStateCard";
import { useJourneyGame } from "./hooks/useJourneyGame";

const deleteSavedGameTexts = {
  title: "Удалить сохраненную игру",
  description: "Точно удалить сохраненную игру",
  confirm: "Удалить",
};

const removePlayerTexts = {
  title: "Удалить игрока из партии",
  description: "Точно удалить игрока из текущей партии",
  confirm: "Удалить игрока",
};

interface JourneyPageProps {
  djName: string;
  selectedProject: Project | null;
}

export default function JourneyPage({ djName, selectedProject }: JourneyPageProps) {
  const {
    game,
    gameConfigs,
    selectedGameConfigId,
    playerNames,
    playerNameErrors,
    forumTopicId,
    canImportPlayersFromForum,
    playersImportText,
    movesImportText,
    moveInputs,
    skippedPlayers,
    playerPendingRemoval,
    savedGames,
    storedGameId,
    deletingSavedGame,
    savedGamesDialogOpen,
    savedGamesError,
    playersImportOpen,
    movesImportOpen,
    forumMovesPreview,
    forumMovesPreviewOpen,
    forumState,
    forumStateDialogOpen,
    rulesDialogOpen,
    requestError,
    gameConfigsError,
    selectedJourneyRules,
    journeyConfig,
    journeyAchievements,
    collectorTargets,
    achievementProgressByPlayerId,
    canStartGame,
    activePlayers,
    finishedPlayers,
    results,
    gameIsOver,
    headerActionsDisabled,
    setupActionsDisabled,
    roundActionsDisabled,
    canSubmitRound,
    playerTimelines,
    forumLogEntries,
    pageStatusChips,
    loading,
    actions,
  } = useJourneyGame({ djName, selectedProject });

  return (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <JourneyPageHeader
            pageStatusChips={pageStatusChips}
            isLoadingSavedGames={loading.isLoadingSavedGames}
            isResettingGame={loading.isResettingGame}
            actionsDisabled={headerActionsDisabled}
            controls={
              <GameConfigSelectField
                label="Пресет Journey"
                gameConfigs={gameConfigs}
                selectedGameConfigId={selectedGameConfigId}
                onSelectedGameConfigChange={actions.selectGameConfig}
                loading={loading.isLoadingGameConfigs}
                hideHelperText
                sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "#fff" } }}
              />
            }
            onOpenRules={() => actions.setRulesDialogOpen(true)}
            onOpenSavedGames={actions.openSavedGamesDialog}
            onRestartGame={actions.restartGame}
          />
        </Grid>

        {!djName.trim() ? (
          <Grid item xs={12}>
            <Alert severity="warning">{journeyTexts.alerts.setDjName}</Alert>
          </Grid>
        ) : null}

        {!game && !selectedJourneyRules && !gameConfigsError && !loading.isLoadingGameConfigs ? (
          <Grid item xs={12}>
            <Alert severity="warning">У выбранного проекта нет Journey-конфига. Запуск новой игры недоступен.</Alert>
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
            <JourneyResultsCard
              gameIsOver={gameIsOver}
              finishedPlayers={finishedPlayers}
              results={results}
              currencies={journeyConfig.currencies}
            />

            {game ? (
              <JourneyRoundControlsCard
                activePlayers={activePlayers}
                moveInputs={moveInputs}
                skippedPlayers={skippedPlayers}
                journeyConfig={journeyConfig}
                canSubmitRound={canSubmitRound}
                actionsDisabled={roundActionsDisabled}
                isImportingMoves={loading.isImportingMoves}
                isPreviewingForumMoves={loading.isPreviewingForumMoves}
                canImportMovesFromForum={Boolean(game.forumTopicId)}
                isSubmittingRound={loading.isSubmittingRound}
                removingPlayerId={loading.removingPlayerId}
                onMoveInputChange={actions.changeMoveInput}
                onSkipToggle={actions.toggleSkip}
                onRemovePlayer={actions.requestRemovePlayerFromGame}
                onOpenImport={() => actions.setMovesImportOpen(true)}
                onPreviewForumMoves={actions.previewForumMoves}
                onSubmitRound={actions.submitRound}
              />
            ) : (
              <JourneyPlayersSetupCard
                playerNames={playerNames}
                playerNameErrors={playerNameErrors}
                forumTopicId={forumTopicId}
                actionsDisabled={setupActionsDisabled}
                canStartGame={canStartGame}
                canImportPlayersFromForum={canImportPlayersFromForum}
                isStartingGame={loading.isStartingGame}
                isImportingPlayersFromForum={loading.isImportingPlayersFromForum}
                onStartGame={actions.startGame}
                onForumTopicIdChange={actions.changeForumTopicId}
                onPlayerNameChange={actions.changePlayerName}
                onRemovePlayerField={actions.removePlayerField}
                onAddPlayerField={actions.addPlayerField}
                onOpenImport={() => actions.setPlayersImportOpen(true)}
                onImportPlayersFromForum={actions.importPlayersFromForum}
              />
            )}

            <JourneyLogCard comments={forumLogEntries} />
          </Stack>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            <JourneyMapCard game={game} journeyConfig={journeyConfig} />
            <JourneyStateCard
              game={game}
              playerTimelines={playerTimelines}
              journeyAchievements={journeyAchievements}
              journeyCurrencies={journeyConfig.currencies}
              collectorTargets={collectorTargets}
              achievementProgressByPlayerId={achievementProgressByPlayerId}
              isAddingForumState={loading.isAddingForumState}
              onGetForumState={actions.getForumState}
            />
          </Stack>
        </Grid>
      </Grid>

      <JourneyRulesDialog
        open={rulesDialogOpen}
        onClose={() => actions.setRulesDialogOpen(false)}
        journeyConfig={journeyConfig}
        journeyAchievements={journeyAchievements}
      />

      <JourneyImportDialog
        open={playersImportOpen}
        onClose={() => actions.setPlayersImportOpen(false)}
        onApply={actions.importPlayers}
        title={journeyTexts.dialogTitles.playersImport}
        value={playersImportText}
        onChange={actions.setPlayersImportText}
        helperText={journeyTexts.helperText.playersImport}
        minRows={10}
        loading={loading.isImportingPlayers}
      />

      <JourneyForumMovesPreviewDialog
        open={forumMovesPreviewOpen}
        preview={forumMovesPreview}
        onClose={actions.closeForumMovesPreview}
        onApply={actions.applyForumMovesPreview}
      />

      <JourneyForumStateDialog
        open={forumStateDialogOpen}
        forumState={forumState}
        onClose={() => actions.setForumStateDialogOpen(false)}
      />

      <JourneyImportDialog
        open={movesImportOpen}
        onClose={() => actions.setMovesImportOpen(false)}
        onApply={actions.importMoves}
        title={journeyTexts.dialogTitles.movesImport}
        value={movesImportText}
        onChange={actions.setMovesImportText}
        helperText={journeyTexts.helperText.movesImport}
        minRows={8}
        loading={loading.isImportingMoves}
      />

      <JourneySavedGamesDialog
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
            ? `${deleteSavedGameTexts.description} "${deletingSavedGame.configName}"?`
            : deleteSavedGameTexts.description
        }
        confirmLabel={deleteSavedGameTexts.confirm}
        cancelLabel={journeyTexts.actions.cancel}
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
        cancelLabel={journeyTexts.actions.cancel}
        confirmColor="error"
        loading={Boolean(loading.removingPlayerId)}
        onClose={actions.cancelRemovePlayerFromGame}
        onConfirm={actions.confirmRemovePlayerFromGame}
      />
    </>
  );
}
