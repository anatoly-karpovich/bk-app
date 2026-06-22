import { Alert, Grid, Stack } from "@mui/material";
import type { AppConfig } from "../configs/types";
import JourneyImportDialog from "./components/JourneyImportDialog";
import JourneyLogCard from "./components/JourneyLogCard";
import JourneyMapCard from "./components/JourneyMapCard";
import JourneyPageHeader from "./components/JourneyPageHeader";
import JourneyPlayersSetupCard from "./components/JourneyPlayersSetupCard";
import JourneyResultsCard from "./components/JourneyResultsCard";
import JourneyRoundControlsCard from "./components/JourneyRoundControlsCard";
import JourneyRulesDialog from "./components/JourneyRulesDialog";
import JourneyStateCard from "./components/JourneyStateCard";
import { useJourneyGame } from "./hooks/useJourneyGame";
import { journeyTexts } from "../../texts/journeyTexts";

interface JourneyPageProps {
  djName: string;
  selectedConfig: AppConfig | null;
}

export default function JourneyPage({ djName, selectedConfig }: JourneyPageProps) {
  const {
    game,
    playerNames,
    playerNameErrors,
    playersImportText,
    movesImportText,
    moveInputs,
    skippedPlayers,
    savedGameAvailable,
    playersImportOpen,
    movesImportOpen,
    rulesDialogOpen,
    requestError,
    selectedJourneyRules,
    journeyConfig,
    journeyAchievements,
    nonJackpotPrizes,
    canStartGame,
    activePlayers,
    finishedPlayers,
    results,
    receipts,
    gameIsOver,
    headerActionsDisabled,
    setupActionsDisabled,
    roundActionsDisabled,
    canSubmitRound,
    playerTimelines,
    pageStatusChips,
    loading,
    actions,
  } = useJourneyGame({ djName, selectedConfig });

  return (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <JourneyPageHeader
            pageStatusChips={pageStatusChips}
            canStartGame={canStartGame}
            hasGame={Boolean(game)}
            savedGameAvailable={savedGameAvailable}
            isStartingGame={loading.isStartingGame}
            isRestoringGame={loading.isRestoringGame}
            isResettingGame={loading.isResettingGame}
            actionsDisabled={headerActionsDisabled}
            onOpenRules={() => actions.setRulesDialogOpen(true)}
            onStartGame={actions.startGame}
            onRestoreGame={actions.restoreGame}
            onRestartGame={actions.restartGame}
          />
        </Grid>

        {!djName.trim() ? (
          <Grid item xs={12}>
            <Alert severity="warning">{journeyTexts.alerts.setDjName}</Alert>
          </Grid>
        ) : null}

        {!game && !selectedJourneyRules ? (
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

        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <JourneyResultsCard
              gameIsOver={gameIsOver}
              finishedPlayers={finishedPlayers}
              results={results}
              receipts={receipts}
              currency={journeyConfig.currency}
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
                isSubmittingRound={loading.isSubmittingRound}
                removingPlayerId={loading.removingPlayerId}
                onMoveInputChange={actions.changeMoveInput}
                onSkipToggle={actions.toggleSkip}
                onRemovePlayer={actions.removePlayerFromGame}
                onOpenImport={() => actions.setMovesImportOpen(true)}
                onSubmitRound={actions.submitRound}
              />
            ) : (
              <JourneyPlayersSetupCard
                playerNames={playerNames}
                playerNameErrors={playerNameErrors}
                actionsDisabled={setupActionsDisabled}
                onPlayerNameChange={actions.changePlayerName}
                onRemovePlayerField={actions.removePlayerField}
                onAddPlayerField={actions.addPlayerField}
                onOpenImport={() => actions.setPlayersImportOpen(true)}
              />
            )}

            <JourneyLogCard comments={game?.comments} />
          </Stack>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            <JourneyMapCard game={game} journeyConfig={journeyConfig} />
            <JourneyStateCard
              game={game}
              playerTimelines={playerTimelines}
              journeyAchievements={journeyAchievements}
              nonJackpotPrizes={nonJackpotPrizes}
              finishPosition={journeyConfig.finishPosition}
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
    </>
  );
}
