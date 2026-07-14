import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import AppConfirmDialog from "../../../components/ui/AppConfirmDialog";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import { validateConfigEditorState } from "../editorDraft";
import type { AppConfigEditorState, BattleshipsBoardEditorState } from "../types";

type EditorMode = "edit" | "duplicate";

interface ConfigEditorCardProps {
  mode: EditorMode;
  initialState: AppConfigEditorState;
  sourceConfigName: string;
  saveError: string | null;
  isSaving: boolean;
  isDeleting?: boolean;
  onCancel: () => void;
  onDelete?: () => void | Promise<void>;
  onSubmit: (draft: AppConfigEditorState) => void | Promise<void>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function parseIntegerInput(value: string, fallback = 0): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? Math.trunc(parsedValue) : fallback;
}

function parseNumberInput(value: string, fallback = 0): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function createDefaultJourneyCell(index: number) {
  return {
    id: `cell_${index + 1}`,
    kind: "bonus" as const,
    value: 1,
    count: 1,
  };
}

function createDefaultBattleshipsBoard(boardSize: number): BattleshipsBoardEditorState {
  return {
    boardSize,
    ships: [
      { size: 4, amount: 0 },
      { size: 3, amount: 1 },
      { size: 2, amount: 2 },
      { size: 1, amount: 4 },
    ],
    maxShots: 17,
    prizes: {
      shoot: 2,
      destroyBonus: [
        { size: 1, bonus: 1 },
        { size: 2, bonus: 1 },
        { size: 3, bonus: 2 },
        { size: 4, bonus: 2 },
      ],
    },
  };
}

export default function ConfigEditorCard({
  mode,
  initialState,
  sourceConfigName,
  saveError,
  isSaving,
  isDeleting = false,
  onCancel,
  onDelete,
  onSubmit,
}: ConfigEditorCardProps) {
  const [draft, setDraft] = useState<AppConfigEditorState>(() => clone(initialState));
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    setDraft(clone(initialState));
  }, [initialState]);

  const validationError = useMemo(() => validateConfigEditorState(draft), [draft]);
  const editorTitle = mode === "edit" ? `Редактирование: ${sourceConfigName}` : `Дубликат: ${sourceConfigName}`;

  function updateDraft(updater: (current: AppConfigEditorState) => AppConfigEditorState) {
    setDraft((current) => updater(clone(current)));
  }

  async function handleSubmit() {
    if (validationError) {
      return;
    }

    await onSubmit(draft);
  }

  return (
    <>
      <Card sx={{ border: "1px solid rgba(15, 23, 42, 0.08)" }}>
        <CardHeader
          title={editorTitle}
          subheader={
            mode === "edit"
              ? "Изменения применяются только к новым играм. Сохранённые партии останутся на своём snapshot-конфиге."
              : "Будет создан новый проект на основе выбранного конфига. После сохранения его можно сразу выбрать как активный."
          }
          action={
            <Stack direction="row" spacing={1} sx={{ pr: 2, pt: 2 }}>
              <Chip label={mode === "edit" ? "Режим: редактирование" : "Режим: дубликат"} color={mode === "edit" ? "info" : "secondary"} />
            </Stack>
          }
        />

        <CardContent sx={{ pt: 0 }}>
          <Stack spacing={3}>
            {validationError ? <Alert severity="warning">{validationError}</Alert> : null}
            {saveError ? <Alert severity="error">{saveError}</Alert> : null}

            <Box sx={{ p: 2, borderRadius: 3, backgroundColor: "rgba(15, 23, 42, 0.03)" }}>
              <Stack spacing={2}>
                <Typography variant="h6">Project</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <AppTextInput
                      label="Название проекта"
                      value={draft.name}
                      onChange={(event) => updateDraft((current) => ({ ...current, name: event.target.value }))}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <AppTextInput
                      label="Валюта"
                      value={draft.currency}
                      onChange={(event) => updateDraft((current) => ({ ...current, currency: event.target.value }))}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <AppTextInput
                      label="Описание"
                      value={draft.description}
                      onChange={(event) => updateDraft((current) => ({ ...current, description: event.target.value }))}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Stack>
            </Box>

            <Box sx={{ p: 2, borderRadius: 3, backgroundColor: "rgba(14, 165, 233, 0.05)" }}>
              <Stack spacing={2.5}>
                <Typography variant="h6">Journey</Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={2}>
                    <AppTextInput
                      label="Стартовый приз"
                      type="number"
                      value={draft.games.journey.initialPrize}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          games: {
                            ...current.games,
                            journey: {
                              ...current.games.journey,
                              initialPrize: parseIntegerInput(event.target.value),
                            },
                          },
                        }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <AppTextInput
                      label="Мин. кубик"
                      type="number"
                      value={draft.games.journey.minDice}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          games: {
                            ...current.games,
                            journey: {
                              ...current.games.journey,
                              minDice: parseIntegerInput(event.target.value, 1),
                            },
                          },
                        }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <AppTextInput
                      label="Макс. кубик"
                      type="number"
                      value={draft.games.journey.maxDice}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          games: {
                            ...current.games,
                            journey: {
                              ...current.games.journey,
                              maxDice: parseIntegerInput(event.target.value, 1),
                            },
                          },
                        }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <AppTextInput
                      label="Размер карты"
                      type="number"
                      value={draft.games.journey.mapSize}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          games: {
                            ...current.games,
                            journey: {
                              ...current.games.journey,
                              mapSize: parseIntegerInput(event.target.value, 1),
                            },
                          },
                        }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <AppTextInput
                      label="Сокровище: клеток"
                      type="number"
                      value={draft.games.journey.jackpot.count}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          games: {
                            ...current.games,
                            journey: {
                              ...current.games.journey,
                              jackpot: {
                                ...current.games.journey.jackpot,
                                count: parseIntegerInput(event.target.value, 1),
                              },
                            },
                          },
                        }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <AppTextInput
                      label="Сокровище: приз"
                      type="number"
                      value={draft.games.journey.jackpot.prize}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          games: {
                            ...current.games,
                            journey: {
                              ...current.games.journey,
                              jackpot: {
                                ...current.games.journey.jackpot,
                                prize: parseIntegerInput(event.target.value),
                              },
                            },
                          },
                        }))
                      }
                      fullWidth
                    />
                  </Grid>
                </Grid>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={draft.games.journey.maxPrize === null}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            games: {
                              ...current.games,
                              journey: {
                                ...current.games.journey,
                                maxPrize: event.target.checked ? null : 0,
                              },
                            },
                          }))
                        }
                      />
                    }
                    label="Без лимита приза"
                  />
                  <AppTextInput
                    label="Лимит приза"
                    type="number"
                    value={draft.games.journey.maxPrize ?? ""}
                    disabled={draft.games.journey.maxPrize === null}
                    onChange={(event) =>
                      updateDraft((current) => ({
                        ...current,
                        games: {
                          ...current.games,
                          journey: {
                            ...current.games.journey,
                            maxPrize: event.target.value === "" ? 0 : parseIntegerInput(event.target.value),
                          },
                        },
                      }))
                    }
                    sx={{ width: { xs: "100%", md: 220 } }}
                  />
                </Stack>

                <Divider />

                <Stack spacing={1.5}>
                  <Typography variant="subtitle1">Достижения</Typography>
                  <Grid container spacing={2}>
                    {(
                      [
                        ["unlucky", "Невезучий"],
                        ["careful", "Осторожный"],
                        ["collector", "Коллекционер"],
                        ["lucky", "Счастливчик"],
                      ] as const
                    ).map(([key, label]) => (
                      <Grid key={key} item xs={12} sm={6} md={3}>
                        <AppTextInput
                          label={label}
                          type="number"
                          value={draft.games.journey.achievements[key].prize}
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              games: {
                                ...current.games,
                                journey: {
                                  ...current.games.journey,
                                  achievements: {
                                    ...current.games.journey.achievements,
                                    [key]: {
                                      prize: parseIntegerInput(event.target.value),
                                    },
                                  },
                                },
                              },
                            }))
                          }
                          fullWidth
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Stack>

                <Divider />

                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1">Клетки карты</Typography>
                    <AppPillButton
                      variant="outlined"
                      startIcon={<AddRoundedIcon />}
                      onClick={() =>
                        updateDraft((current) => ({
                          ...current,
                          games: {
                            ...current.games,
                            journey: {
                              ...current.games.journey,
                              cells: [...current.games.journey.cells, createDefaultJourneyCell(current.games.journey.cells.length)],
                            },
                          },
                        }))
                      }
                    >
                      Добавить клетку
                    </AppPillButton>
                  </Stack>

                  <Stack spacing={1.5}>
                    {draft.games.journey.cells.map((cell, cellIndex) => (
                      <Box key={`${cell.id}-${cellIndex}`} sx={{ p: 2, borderRadius: 3, backgroundColor: "#fff" }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={3}>
                            <AppTextInput
                              label="ID клетки"
                              value={cell.id}
                              onChange={(event) =>
                                updateDraft((current) => {
                                  current.games.journey.cells[cellIndex].id = event.target.value;
                                  return current;
                                })
                              }
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <AppTextInput
                              select
                              label="Тип"
                              value={cell.kind}
                              onChange={(event) =>
                                updateDraft((current) => {
                                  current.games.journey.cells[cellIndex].kind = event.target.value as "bonus" | "trap";
                                  return current;
                                })
                              }
                              fullWidth
                            >
                              <MenuItem value="bonus">Бонус</MenuItem>
                              <MenuItem value="trap">Ловушка</MenuItem>
                            </AppTextInput>
                          </Grid>
                          <Grid item xs={12} md={2}>
                            <AppTextInput
                              label="Значение"
                              type="number"
                              value={cell.value}
                              onChange={(event) =>
                                updateDraft((current) => {
                                  current.games.journey.cells[cellIndex].value = parseIntegerInput(event.target.value);
                                  return current;
                                })
                              }
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={2}>
                            <AppTextInput
                              label="Количество"
                              type="number"
                              value={cell.count}
                              onChange={(event) =>
                                updateDraft((current) => {
                                  current.games.journey.cells[cellIndex].count = parseIntegerInput(event.target.value, 1);
                                  return current;
                                })
                              }
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={2} sx={{ display: "flex", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
                            <IconButton
                              color="error"
                              onClick={() =>
                                updateDraft((current) => ({
                                  ...current,
                                  games: {
                                    ...current.games,
                                    journey: {
                                      ...current.games.journey,
                                      cells: current.games.journey.cells.filter((_, index) => index !== cellIndex),
                                    },
                                  },
                                }))
                              }
                            >
                              <DeleteOutlineRoundedIcon />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </Stack>
            </Box>

            <Box sx={{ p: 2, borderRadius: 3, backgroundColor: "rgba(16, 185, 129, 0.05)" }}>
              <Stack spacing={2.5}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
                  <Typography variant="h6">Battleships</Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <AppTextInput
                      select
                      label="Активное поле"
                      value={String(draft.games.battleships.selectedBoardSize)}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          games: {
                            ...current.games,
                            battleships: {
                              ...current.games.battleships,
                              selectedBoardSize: parseIntegerInput(event.target.value, current.games.battleships.selectedBoardSize),
                            },
                          },
                        }))
                      }
                      sx={{ minWidth: 180 }}
                    >
                      {draft.games.battleships.boards.map((board) => (
                        <MenuItem key={board.boardSize} value={String(board.boardSize)}>
                          {board.boardSize}x{board.boardSize}
                        </MenuItem>
                      ))}
                    </AppTextInput>
                    <AppPillButton
                      variant="outlined"
                      startIcon={<AddRoundedIcon />}
                      onClick={() =>
                        updateDraft((current) => {
                          const nextBoardSize =
                            Math.max(...current.games.battleships.boards.map((board) => board.boardSize), 5) + 1;
                          return {
                            ...current,
                            games: {
                              ...current.games,
                              battleships: {
                                ...current.games.battleships,
                                boards: [...current.games.battleships.boards, createDefaultBattleshipsBoard(nextBoardSize)],
                              },
                            },
                          };
                        })
                      }
                    >
                      Добавить поле
                    </AppPillButton>
                  </Stack>
                </Stack>

                <Stack spacing={2}>
                  {draft.games.battleships.boards.map((board, boardIndex) => (
                    <Box key={`${board.boardSize}-${boardIndex}`} sx={{ p: 2, borderRadius: 3, backgroundColor: "#fff" }}>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1">Поле #{boardIndex + 1}</Typography>
                          <IconButton
                            color="error"
                            onClick={() =>
                              updateDraft((current) => {
                                const nextBoards = current.games.battleships.boards.filter((_, index) => index !== boardIndex);
                                const fallbackSelectedBoardSize =
                                  current.games.battleships.selectedBoardSize === board.boardSize
                                    ? nextBoards[0]?.boardSize ?? 0
                                    : current.games.battleships.selectedBoardSize;

                                return {
                                  ...current,
                                  games: {
                                    ...current.games,
                                    battleships: {
                                      ...current.games.battleships,
                                      boards: nextBoards,
                                      selectedBoardSize: fallbackSelectedBoardSize,
                                    },
                                  },
                                };
                              })
                            }
                          >
                            <DeleteOutlineRoundedIcon />
                          </IconButton>
                        </Stack>

                        <Grid container spacing={2}>
                          <Grid item xs={12} md={3}>
                            <AppTextInput
                              label="Размер поля"
                              type="number"
                              value={board.boardSize}
                              onChange={(event) =>
                                updateDraft((current) => {
                                  const previousBoardSize = current.games.battleships.boards[boardIndex].boardSize;
                                  const nextBoardSize = parseIntegerInput(event.target.value, previousBoardSize);
                                  current.games.battleships.boards[boardIndex].boardSize = nextBoardSize;

                                  if (current.games.battleships.selectedBoardSize === previousBoardSize) {
                                    current.games.battleships.selectedBoardSize = nextBoardSize;
                                  }

                                  return current;
                                })
                              }
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <AppTextInput
                              label="Макс. попыток"
                              type="number"
                              value={board.maxShots}
                              onChange={(event) =>
                                updateDraft((current) => {
                                  current.games.battleships.boards[boardIndex].maxShots = parseIntegerInput(event.target.value);
                                  return current;
                                })
                              }
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <AppTextInput
                              label="Приз за попадание"
                              type="number"
                              value={board.prizes.shoot}
                              inputProps={{ step: 0.1, min: 0 }}
                              onChange={(event) =>
                                updateDraft((current) => {
                                  current.games.battleships.boards[boardIndex].prizes.shoot = parseNumberInput(event.target.value);
                                  return current;
                                })
                              }
                              fullWidth
                            />
                          </Grid>
                        </Grid>

                        <Divider />

                        <Stack spacing={1.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2">Корабли</Typography>
                            <AppPillButton
                              size="small"
                              variant="outlined"
                              startIcon={<AddRoundedIcon />}
                              onClick={() =>
                                updateDraft((current) => {
                                  current.games.battleships.boards[boardIndex].ships.push({ size: 1, amount: 1 });
                                  return current;
                                })
                              }
                            >
                              Добавить корабль
                            </AppPillButton>
                          </Stack>

                          {board.ships.map((ship, shipIndex) => (
                            <Grid key={`${ship.size}-${shipIndex}`} container spacing={2} alignItems="center">
                              <Grid item xs={12} md={4}>
                                <AppTextInput
                                  label="Размер"
                                  type="number"
                                  value={ship.size}
                                  onChange={(event) =>
                                    updateDraft((current) => {
                                      current.games.battleships.boards[boardIndex].ships[shipIndex].size = parseIntegerInput(event.target.value, 1);
                                      return current;
                                    })
                                  }
                                  fullWidth
                                />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <AppTextInput
                                  label="Количество"
                                  type="number"
                                  value={ship.amount}
                                  onChange={(event) =>
                                    updateDraft((current) => {
                                      current.games.battleships.boards[boardIndex].ships[shipIndex].amount = parseIntegerInput(event.target.value);
                                      return current;
                                    })
                                  }
                                  fullWidth
                                />
                              </Grid>
                              <Grid item xs={12} md={4} sx={{ display: "flex", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
                                <IconButton
                                  color="error"
                                  onClick={() =>
                                    updateDraft((current) => {
                                      current.games.battleships.boards[boardIndex].ships = current.games.battleships.boards[
                                        boardIndex
                                      ].ships.filter((_, index) => index !== shipIndex);
                                      return current;
                                    })
                                  }
                                >
                                  <DeleteOutlineRoundedIcon />
                                </IconButton>
                              </Grid>
                            </Grid>
                          ))}
                        </Stack>

                        <Divider />

                        <Stack spacing={1.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2">Бонус за добивание</Typography>
                            <AppPillButton
                              size="small"
                              variant="outlined"
                              startIcon={<AddRoundedIcon />}
                              onClick={() =>
                                updateDraft((current) => {
                                  const bonusRows = current.games.battleships.boards[boardIndex].prizes.destroyBonus;
                                  const nextSize = Math.max(...bonusRows.map((bonus) => bonus.size), 0) + 1;
                                  bonusRows.push({ size: nextSize, bonus: 0 });
                                  return current;
                                })
                              }
                            >
                              Добавить бонус
                            </AppPillButton>
                          </Stack>

                          {board.prizes.destroyBonus.map((bonusItem, bonusIndex) => (
                            <Grid key={`${bonusItem.size}-${bonusIndex}`} container spacing={2} alignItems="center">
                              <Grid item xs={12} md={4}>
                                <AppTextInput
                                  label="Размер корабля"
                                  type="number"
                                  value={bonusItem.size}
                                  onChange={(event) =>
                                    updateDraft((current) => {
                                      current.games.battleships.boards[boardIndex].prizes.destroyBonus[bonusIndex].size = parseIntegerInput(event.target.value, 1);
                                      return current;
                                    })
                                  }
                                  fullWidth
                                />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <AppTextInput
                                  label="Бонус"
                                  type="number"
                                  value={bonusItem.bonus}
                                  inputProps={{ step: 0.5, min: 0 }}
                                  onChange={(event) =>
                                    updateDraft((current) => {
                                      current.games.battleships.boards[boardIndex].prizes.destroyBonus[bonusIndex].bonus = parseNumberInput(event.target.value);
                                      return current;
                                    })
                                  }
                                  fullWidth
                                />
                              </Grid>
                              <Grid item xs={12} md={4} sx={{ display: "flex", justifyContent: { xs: "flex-start", md: "flex-end" } }}>
                                <IconButton
                                  color="error"
                                  onClick={() =>
                                    updateDraft((current) => {
                                      current.games.battleships.boards[boardIndex].prizes.destroyBonus = current.games.battleships.boards[
                                        boardIndex
                                      ].prizes.destroyBonus.filter((_, index) => index !== bonusIndex);
                                      return current;
                                    })
                                  }
                                >
                                  <DeleteOutlineRoundedIcon />
                                </IconButton>
                              </Grid>
                            </Grid>
                          ))}
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </Box>

            <Box sx={{ p: 2, borderRadius: 3, backgroundColor: "rgba(245, 158, 11, 0.07)" }}>
              <Stack spacing={2.5}>
                <Typography variant="h6">Lotto</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={2}>
                    <AppTextInput
                      label="Мин. число"
                      type="number"
                      value={draft.games.lotto.min}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          games: {
                            ...current.games,
                            lotto: {
                              ...current.games.lotto,
                              min: parseIntegerInput(event.target.value),
                            },
                          },
                        }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <AppTextInput
                      label="Макс. число"
                      type="number"
                      value={draft.games.lotto.max}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          games: {
                            ...current.games,
                            lotto: {
                              ...current.games.lotto,
                              max: parseIntegerInput(event.target.value),
                            },
                          },
                        }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <AppTextInput
                      label="Чисел в карточке"
                      type="number"
                      value={draft.games.lotto.cardNumbersAmount}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          games: {
                            ...current.games,
                            lotto: {
                              ...current.games.lotto,
                              cardNumbersAmount: parseIntegerInput(event.target.value, 1),
                            },
                          },
                        }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <AppTextInput
                      label="Приз за 1 место"
                      type="number"
                      value={draft.games.lotto.firstPlacePrize}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          games: {
                            ...current.games,
                            lotto: {
                              ...current.games.lotto,
                              firstPlacePrize: parseIntegerInput(event.target.value),
                            },
                          },
                        }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <AppTextInput
                      label="Приз за 2 место"
                      type="number"
                      value={draft.games.lotto.secondPlacePrize}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          games: {
                            ...current.games,
                            lotto: {
                              ...current.games.lotto,
                              secondPlacePrize: parseIntegerInput(event.target.value),
                            },
                          },
                        }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <AppTextInput
                      label="Приз остальным"
                      type="number"
                      value={draft.games.lotto.otherActivePlayersPrize}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          games: {
                            ...current.games,
                            lotto: {
                              ...current.games.lotto,
                              otherActivePlayersPrize: parseIntegerInput(event.target.value),
                            },
                          },
                        }))
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <AppTextInput
                      select
                      label="Режим выплат"
                      value={draft.games.lotto.rewardDistributionMode}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          games: {
                            ...current.games,
                            lotto: {
                              ...current.games.lotto,
                              rewardDistributionMode: event.target.value as "full_per_winner" | "split_pool",
                            },
                          },
                        }))
                      }
                      fullWidth
                    >
                      <MenuItem value="full_per_winner">Полный приз каждому</MenuItem>
                      <MenuItem value="split_pool">Делить банк</MenuItem>
                    </AppTextInput>
                  </Grid>
                </Grid>
              </Stack>
            </Box>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between">
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                {mode === "edit" && onDelete ? (
                  <AppPillButton
                    color="error"
                    variant="outlined"
                    startIcon={<DeleteOutlineRoundedIcon />}
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    Удалить проект
                  </AppPillButton>
                ) : null}
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <AppPillButton color="inherit" onClick={onCancel}>
                  Закрыть
                </AppPillButton>
                <AppPillButton variant="contained" loading={isSaving} onClick={() => void handleSubmit()}>
                  {mode === "edit" ? "Сохранить изменения" : "Создать дубликат"}
                </AppPillButton>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {onDelete ? (
        <AppConfirmDialog
          open={deleteConfirmOpen}
          title="Удалить проект"
          description={`Проект "${sourceConfigName}" будет удалён. Сохранённые игры останутся в базе, но новые партии по этому конфигу запустить уже не получится.`}
          confirmLabel="Удалить"
          cancelLabel="Отмена"
          confirmColor="error"
          loading={isDeleting}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={async () => {
            await onDelete();
            setDeleteConfirmOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
