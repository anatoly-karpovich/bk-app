import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Box, Card, CardContent, CardHeader, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import AddPlayerButton from "../../../components/AddPlayerButton";
import ProjectPlayerAutocomplete from "../../../components/players/ProjectPlayerAutocomplete";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import AppResponsiveGrid from "../../../components/ui/AppResponsiveGrid";
import type { ProjectPlayer } from "../../players/types";
import type { ActivityParticipantDraft, ActivityResourceAmountDraft } from "../types";

type RewardCategory = "regular" | "bonus";

interface ActivityResourceOption {
  id: string;
  label: string;
  type: "currency" | "item";
}

interface ActivityParticipantEditorProps {
  participants: ActivityParticipantDraft[];
  resources: ActivityResourceOption[];
  projectPlayers: ProjectPlayer[];
  projectPlayersLoading: boolean;
  projectPlayersError: string | null;
  disabled: boolean;
  onChange: (participants: ActivityParticipantDraft[]) => void;
}

function duplicatePlayerError(participant: ActivityParticipantDraft, participants: ActivityParticipantDraft[]): string | null {
  const key = participant.playerRefId ?? participant.nickname.trim().toLocaleLowerCase("ru");
  if (!key) return "Выберите игрока или введите новый ник.";
  return participants.filter((candidate) => (candidate.playerRefId ?? candidate.nickname.trim().toLocaleLowerCase("ru")) === key).length > 1
    ? "Этот игрок уже добавлен."
    : null;
}

function amountError(amount: ActivityResourceAmountDraft, amounts: ActivityResourceAmountDraft[]): string | null {
  if (!amount.resourceId) return "Выберите ресурс.";
  if (!Number.isFinite(amount.amount) || amount.amount <= 0) return "Укажите положительную сумму.";
  return amounts.filter((candidate) => candidate.resourceId === amount.resourceId).length > 1 ? "Ресурс повторяется." : null;
}

function RewardAmountsEditor({
  title,
  category,
  amounts,
  resources,
  disabled,
  onChange,
}: {
  title: string;
  category: RewardCategory;
  amounts: ActivityResourceAmountDraft[];
  resources: ActivityResourceOption[];
  disabled: boolean;
  onChange: (amounts: ActivityResourceAmountDraft[]) => void;
}) {
  const addAmount = () => onChange([...amounts, { resourceId: resources[0]?.id ?? "", amount: 0 }]);

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography variant="subtitle2">{title}</Typography>
        <AppPillButton size="small" variant="text" startIcon={<AddRoundedIcon />} disabled={disabled || !resources.length} onClick={addAmount}>
          Добавить
        </AppPillButton>
      </Stack>
      {amounts.length ? amounts.map((amount, index) => {
        const error = amountError(amount, amounts);
        return (
          <Stack key={`${category}-${index}`} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "flex-start" }}>
            <FormControl fullWidth size="small" error={Boolean(error)} disabled={disabled}>
              <InputLabel id={`${category}-${index}-resource-label`}>Ресурс</InputLabel>
              <Select
                labelId={`${category}-${index}-resource-label`}
                label="Ресурс"
                value={amount.resourceId}
                onChange={(event) => onChange(amounts.map((item, itemIndex) => itemIndex === index ? { ...item, resourceId: event.target.value } : item))}
              >
                {resources.map((resource) => <MenuItem key={resource.id} value={resource.id}>{resource.label}</MenuItem>)}
              </Select>
            </FormControl>
            <AppTextInput
              label="Сумма"
              type="number"
              size="small"
              value={amount.amount || ""}
              onChange={(event) => onChange(amounts.map((item, itemIndex) => itemIndex === index ? { ...item, amount: Number(event.target.value) } : item))}
              error={Boolean(error)}
              helperText={error ?? " "}
              inputProps={{ min: 0, step: "any" }}
              disabled={disabled}
              sx={{ width: { xs: "100%", sm: 156 }, flexShrink: 0 }}
            />
            <IconButton aria-label={`Удалить награду ${title.toLowerCase()}`} color="error" disabled={disabled} onClick={() => onChange(amounts.filter((_item, itemIndex) => itemIndex !== index))} sx={{ mt: { sm: 0.25 }, alignSelf: { xs: "flex-end", sm: "auto" } }}>
              <DeleteOutlineRoundedIcon />
            </IconButton>
          </Stack>
        );
      }) : <Typography variant="body2" color="text.secondary">Награды этой категории пока не добавлены.</Typography>}
    </Stack>
  );
}

export default function ActivityParticipantEditor({
  participants,
  resources,
  projectPlayers,
  projectPlayersLoading,
  projectPlayersError,
  disabled,
  onChange,
}: ActivityParticipantEditorProps) {
  const updateParticipant = (index: number, patch: Partial<ActivityParticipantDraft>) => {
    onChange(participants.map((participant, participantIndex) => participantIndex === index ? { ...participant, ...patch } : participant));
  };
  const updateRewards = (index: number, category: RewardCategory, amounts: ActivityResourceAmountDraft[]) => {
    const participant = participants[index]!;
    updateParticipant(index, { rewards: { ...participant.rewards, [category]: amounts } });
  };

  return (
    <Card>
      <CardHeader
        title="Получатели и награды"
        subheader="Добавляйте только награждённых игроков. Regular и bonus сохраняются отдельно."
      />
      <CardContent>
        <Stack spacing={2}>
          {participants.length ? (
            <AppResponsiveGrid columns={{ xs: 1 }}>
              {participants.map((participant, index) => (
                <Box key={participant.id} sx={{ p: 2, borderRadius: (theme) => theme.customRadii.md, border: "1px solid", borderColor: "divider", bgcolor: "rgba(248, 250, 252, 0.7)" }}>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                      <Typography variant="subtitle1" fontWeight={800}>Получатель {index + 1}</Typography>
                      <IconButton aria-label={`Удалить получателя ${index + 1}`} color="error" disabled={disabled} onClick={() => onChange(participants.filter((_item, itemIndex) => itemIndex !== index))}>
                        <DeleteOutlineRoundedIcon />
                      </IconButton>
                    </Stack>
                    <ProjectPlayerAutocomplete
                      label="Игрок"
                      value={{ nickname: participant.nickname, playerRefId: participant.playerRefId }}
                      players={projectPlayers}
                      loading={projectPlayersLoading}
                      loadError={projectPlayersError}
                      errorText={duplicatePlayerError(participant, participants)}
                      disabled={disabled}
                      onChange={(value) => updateParticipant(index, value)}
                    />
                    <AppResponsiveGrid columns={{ xs: 1, lg: 2 }}>
                      <RewardAmountsEditor title="Обычные награды" category="regular" amounts={participant.rewards.regular} resources={resources} disabled={disabled} onChange={(amounts) => updateRewards(index, "regular", amounts)} />
                      <RewardAmountsEditor title="Бонусные награды" category="bonus" amounts={participant.rewards.bonus} resources={resources} disabled={disabled} onChange={(amounts) => updateRewards(index, "bonus", amounts)} />
                    </AppResponsiveGrid>
                  </Stack>
                </Box>
              ))}
            </AppResponsiveGrid>
          ) : <Typography variant="body2" color="text.secondary">Получателей пока нет. Добавьте игрока и его итоговую награду.</Typography>}
          <Box sx={{ alignSelf: "flex-start" }}><AddPlayerButton onClick={() => onChange([...participants, { id: `participant-${Date.now()}-${Math.random().toString(36).slice(2)}`, nickname: "", playerRefId: null, rewards: { regular: [], bonus: [] } }])} disabled={disabled} /></Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
