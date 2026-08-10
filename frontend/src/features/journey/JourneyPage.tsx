import { Alert, Grid, Stack, Typography } from "@mui/material";
import AppConfirmDialog from "../../components/ui/AppConfirmDialog";
import GameConfigSelectField from "../../components/GameConfigSelectField";
import SavedGamesDialog from "../../components/SavedGamesDialog";
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
import JourneyStateCard from "./components/JourneyStateCard";
import { formatJourneyResourceAmounts } from "./journey-page.helpers";
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
    validPlayersCount,
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

  const savedGameItems = savedGames.map((savedGame) => ({
    id: savedGame.id,
    title: savedGame.configName,
    statusLabel: savedGame.status === "finished" ? journeyTexts.statuses.complete : journeyTexts.statuses.active,
    statusColor: savedGame.status === "finished" ? "success" as const : "info" as const,
    metadata: `Раундов: ${savedGame.roundsCount} · Ведущий: ${savedGame.djName || "Не указан"}`,
    createdAtLabel: new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(savedGame.createdAt)),
    updatedAtLabel: new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(savedGame.updatedAt)),
    details: (
      <Stack spacing={1}>
        {savedGame.players.map((player) => (
          <Stack key={player.id} spacing={0.25}>
            <Typography variant="body2" fontWeight={700}>{player.nickname}</Typography>
            <Typography variant="body2" color="text.secondary">
              Клетка: {player.position} · Баланс: {formatJourneyResourceAmounts(player.balanceEntries, savedGame.resources, { includeZero: true })}
            </Typography>
          </Stack>
        ))}
      </Stack>
    ),
  }));

  return (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <JourneyPageHeader
            pageStatusChips={pageStatusChips}
            isRefreshingGame={loading.isRefreshingGame}
            isLoadingSavedGames={loading.isLoadingSavedGames}
            actionsDisabled={headerActionsDisabled}
            canOpenRules={Boolean(journeyConfig && journeyAchievements)}
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
            <Alert severity="warning">{journeyTexts.alerts.setDjName}</Alert>
          </Grid>
        ) : null}

        {!game && !selectedGameConfigId && !gameConfigsError && !loading.isLoadingGameConfigs ? (
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
            {journeyConfig ? (
              <JourneyResultsCard
                gameIsOver={gameIsOver}
                finishedPlayers={finishedPlayers}
                results={results}
                resources={journeyConfig.resources}
              />
            ) : null}

            {game && journeyConfig ? (
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
                validPlayersCount={validPlayersCount}
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
            {journeyConfig && journeyAchievements ? (
              <>
                <JourneyMapCard game={game} journeyConfig={journeyConfig} />
                <JourneyStateCard
                  game={game}
                  playerTimelines={playerTimelines}
                  journeyAchievements={journeyAchievements}
                  journeyResources={journeyConfig.resources}
                  collectorTargets={collectorTargets}
                  achievementProgressByPlayerId={achievementProgressByPlayerId}
                  isAddingForumState={loading.isAddingForumState}
                  onGetForumState={actions.getForumState}
                />
              </>
            ) : null}
          </Stack>
        </Grid>
      </Grid>

      {journeyConfig && journeyAchievements ? (
        <JourneyRulesDialog
          open={rulesDialogOpen}
          onClose={() => actions.setRulesDialogOpen(false)}
          journeyConfig={journeyConfig}
          journeyAchievements={journeyAchievements}
        />
      ) : null}

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

      <SavedGamesDialog
        open={savedGamesDialogOpen}
        games={savedGameItems}
        currentGameId={storedGameId}
        loading={loading.isLoadingSavedGames}
        restoreLoading={loading.isRestoringGame}
        deletingGameId={loading.isDeletingSavedGame ? deletingSavedGame?.id ?? null : null}
        error={savedGamesError}
        onClose={() => actions.setSavedGamesDialogOpen(false)}
        onRestore={actions.restoreSavedGame}
        onDelete={(gameId) => {
          const savedGame = savedGames.find((gameItem) => gameItem.id === gameId);
          if (savedGame) {
            actions.requestDeleteSavedGame(savedGame);
          }
        }}
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
