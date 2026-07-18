import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";
import AppConfirmDialog from "../../components/ui/AppConfirmDialog";
import { createConfigRequest, deleteConfigRequest, updateConfigRequest } from "./api/config.client";
import ConfigEditorCard from "./components/ConfigEditorCard";
import {
  buildConfigMutationPayload,
  createConfigEditorState,
  createDuplicateConfigEditorState,
} from "./editorDraft";
import type { AppConfig, AppConfigEditorState } from "./types";

type EditorMode = "edit" | "duplicate";

interface ConfigEditorState {
  mode: EditorMode;
  sourceConfigId: string;
  sourceConfigName: string;
  initialState: AppConfigEditorState;
}

interface PendingDeleteConfigState {
  id: string;
  name: string;
}

function formatConfigCurrencies(config: AppConfig): string {
  return config.currencies.map((currency) => currency.label).join(", ");
}

interface ConfigsPageProps {
  configs: AppConfig[];
  selectedConfigId: string;
  onSelectConfig: (configId: string) => void;
  onReload: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Config request failed";
}

export default function ConfigsPage({
  configs,
  selectedConfigId,
  onSelectConfig,
  onReload,
  isLoading,
  error,
}: ConfigsPageProps) {
  const [editor, setEditor] = useState<ConfigEditorState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDeleteConfig, setPendingDeleteConfig] = useState<PendingDeleteConfigState | null>(null);

  function openEditor(config: AppConfig) {
    setSaveError(null);
    setEditor({
      mode: "edit",
      sourceConfigId: config.id,
      sourceConfigName: config.name,
      initialState: createConfigEditorState(config),
    });
  }

  function openDuplicateEditor(config: AppConfig) {
    setSaveError(null);
    setEditor({
      mode: "duplicate",
      sourceConfigId: config.id,
      sourceConfigName: config.name,
      initialState: createDuplicateConfigEditorState(config),
    });
  }

  async function handleSubmit(draft: AppConfigEditorState) {
    if (!editor) {
      return;
    }

    setSaveError(null);
    setIsSaving(true);

    try {
      const payload = buildConfigMutationPayload(draft);
      const savedConfig =
        editor.mode === "edit"
          ? await updateConfigRequest(editor.sourceConfigId, payload)
          : await createConfigRequest(payload);

      onSelectConfig(savedConfig.id);
      await onReload();
      setEditor({
        mode: "edit",
        sourceConfigId: savedConfig.id,
        sourceConfigName: savedConfig.name,
        initialState: createConfigEditorState(savedConfig),
      });
    } catch (nextError) {
      setSaveError(getErrorMessage(nextError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!editor || editor.mode !== "edit") {
      return;
    }

    await handleDeleteById(editor.sourceConfigId);
  }

  async function handleDeleteById(configId: string) {
    setSaveError(null);
    setIsDeleting(true);

    try {
      await deleteConfigRequest(configId);
      await onReload();

      if (editor?.sourceConfigId === configId) {
        setEditor(null);
      }
    } catch (nextError) {
      setSaveError(getErrorMessage(nextError));
    } finally {
      setIsDeleting(false);
      setPendingDeleteConfig(null);
    }
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={1.5}>
            <Typography variant="h4">Глобальные конфиги</Typography>
            <Typography variant="body1" color="text.secondary">
              Выбор активного проекта влияет только на новые партии в текущем браузере. Через редактор ниже можно
              менять правила Journey, Battleships и Lotto или быстро делать дубликат проекта под другой набор правил.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Alert icon={<SettingsRoundedIcon fontSize="inherit" />} severity="info">
        Новые партии стартуют по выбранному проекту, а уже сохранённые игры продолжают жить на своём snapshot-конфиге.
      </Alert>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {!isLoading && !configs.length ? <Alert severity="warning">Конфиги не найдены.</Alert> : null}

      <Grid container spacing={3}>
        {configs.map((config) => {
          const isSelected = config.id === selectedConfigId;
          const { journeySummary, battleshipsSummary, lottoSummary } = config;
          const editorIsOpenForConfig = editor?.sourceConfigId === config.id;

          return (
            <Grid key={config.id} item xs={12} xl={6}>
              <Card sx={{ height: "100%", border: editorIsOpenForConfig ? "1px solid rgba(14, 165, 233, 0.35)" : undefined }}>
                <CardHeader
                  title={config.name}
                  subheader={config.description || "Без описания"}
                  action={
                    <Stack alignItems="flex-end" spacing={1} sx={{ pr: 2, pt: 2 }}>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                        {isSelected ? <Chip color="success" label="Выбран" /> : null}
                        <Chip label={`Валюты: ${formatConfigCurrencies(config)}`} />
                        <Chip variant="outlined" label="Journey" />
                        <Chip variant="outlined" label="Battleships" />
                        <Chip variant="outlined" label="Lotto" />
                      </Stack>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Редактировать">
                          <IconButton color={editorIsOpenForConfig && editor?.mode === "edit" ? "primary" : "default"} onClick={() => openEditor(config)}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Сделать дубликат">
                          <IconButton
                            color={editorIsOpenForConfig && editor?.mode === "duplicate" ? "secondary" : "default"}
                            onClick={() => openDuplicateEditor(config)}
                          >
                            <ContentCopyRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить">
                          <IconButton color="error" onClick={() => setPendingDeleteConfig({ id: config.id, name: config.name })}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  }
                />
                <CardContent>
                  <Stack spacing={2.5}>
                    <Stack spacing={1}>
                      <Typography variant="subtitle2">Journey</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={`Карта: ${journeySummary?.mapSize ?? "-"}`} />
                        <Chip label={`Ход: ${journeySummary?.diceRange ?? "-"}`} />
                        <Chip label={`Сокровище: ${journeySummary?.jackpot ?? "-"}`} color="warning" />
                        <Chip label={`Бонусы: ${journeySummary?.bonusKinds ?? "-"}`} color="success" />
                        <Chip label={`Ловушки: ${journeySummary?.trapKinds ?? "-"}`} color="error" />
                      </Stack>
                    </Stack>

                    <Stack spacing={1}>
                      <Typography variant="subtitle2">Battleships</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={`Поле: ${battleshipsSummary?.boardSize ?? "-"}x${battleshipsSummary?.boardSize ?? "-"}`} />
                        <Chip label={`Попытки: ${battleshipsSummary?.maxShots ?? "-"}`} />
                        <Chip
                          label={`Попадание: ${battleshipsSummary?.hitPrizeLabel ?? "-"}`}
                          color="success"
                        />
                        {(battleshipsSummary?.fleet ?? []).map((ship) => (
                          <Chip key={ship} label={ship} variant="outlined" />
                        ))}
                      </Stack>
                    </Stack>

                    <Stack spacing={1}>
                      <Typography variant="subtitle2">Lotto</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={`Диапазон: ${lottoSummary?.range ?? "-"}`} />
                        <Chip label={`Чисел в карточке: ${lottoSummary?.cardNumbersAmount ?? "-"}`} />
                        <Chip label={`1 место: ${lottoSummary?.firstPlacePrizeLabel ?? "-"}`} color="success" />
                        <Chip label={`2 место: ${lottoSummary?.secondPlacePrizeLabel ?? "-"}`} color="info" />
                        <Chip label={`Остальные: ${lottoSummary?.otherActivePlayersPrizeLabel ?? "-"}`} variant="outlined" />
                        <Chip
                          label={
                            lottoSummary?.rewardDistributionMode === "split_pool"
                              ? "Выплаты: делить банк"
                              : "Выплаты: полный приз каждому"
                          }
                        />
                      </Stack>
                    </Stack>

                    <Button
                      variant={isSelected ? "contained" : "outlined"}
                      color={isSelected ? "success" : "primary"}
                      startIcon={<CheckCircleRoundedIcon />}
                      disabled={isSelected}
                      onClick={() => onSelectConfig(config.id)}
                    >
                      {isSelected ? "Текущий проект" : "Выбрать проект"}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {editor ? (
        <ConfigEditorCard
          mode={editor.mode}
          initialState={editor.initialState}
          sourceConfigName={editor.sourceConfigName}
          saveError={saveError}
          isSaving={isSaving}
          isDeleting={isDeleting}
          onCancel={() => {
            setSaveError(null);
            setEditor(null);
          }}
          onDelete={editor.mode === "edit" ? handleDelete : undefined}
          onSubmit={handleSubmit}
        />
      ) : null}

      {pendingDeleteConfig ? (
        <AppConfirmDialog
          open
          title="Удалить проект"
          description={`Проект "${pendingDeleteConfig.name}" будет удалён. Сохранённые игры останутся в базе, но новые партии по этому конфигу запустить уже не получится.`}
          confirmLabel="Удалить"
          cancelLabel="Отмена"
          confirmColor="error"
          loading={isDeleting}
          onClose={() => {
            if (!isDeleting) {
              setPendingDeleteConfig(null);
            }
          }}
          onConfirm={async () => {
            await handleDeleteById(pendingDeleteConfig.id);
          }}
        />
      ) : null}
    </Stack>
  );
}
