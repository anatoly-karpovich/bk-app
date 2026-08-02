import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { FormControl, IconButton, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import AppPillButton from "../../../components/ui/AppPillButton";
import AppTextInput from "../../../components/ui/AppTextInput";
import type { Project } from "../../projects/types";
import type { UserProjectProfile, UserRole } from "../../auth/types";
import type { CreateUserInput, UserMutationInput } from "../types";

export type UserFormValue = UserMutationInput & { login: string; password: string; confirmation: string };

interface UserFormProps {
  value: UserFormValue;
  projects: Project[];
  disabled: boolean;
  isCreate: boolean;
  isEditingSelf: boolean;
  onChange: (next: UserFormValue) => void;
}

function replaceProfile(profiles: UserProjectProfile[], index: number, patch: Partial<UserProjectProfile>) {
  return profiles.map((profile, profileIndex) => profileIndex === index ? { ...profile, ...patch } : profile);
}

export function createEmptyUserForm(): UserFormValue {
  return { login: "", displayName: "", password: "", confirmation: "", role: "host", projectProfiles: [] };
}

export function toUserForm(user: UserMutationInput & { login: string }): UserFormValue {
  return { login: user.login, displayName: user.displayName, role: user.role, projectProfiles: user.projectProfiles, password: "", confirmation: "" };
}

export function toUserMutationInput(value: UserFormValue): UserMutationInput {
  return { displayName: value.displayName.trim(), role: value.role, projectProfiles: value.projectProfiles.map((profile) => ({ ...profile, nickname: profile.nickname.trim() })) };
}

export function toCreateUserInput(value: UserFormValue): CreateUserInput {
  return { ...toUserMutationInput(value), login: value.login.trim(), password: value.password };
}

export default function UserForm({ value, projects, disabled, isCreate, isEditingSelf, onChange }: UserFormProps) {
  function update(patch: Partial<UserFormValue>) { onChange({ ...value, ...patch }); }
  const availableProjects = projects.filter((project) => !value.projectProfiles.some((profile) => profile.projectId === project.id));

  return (
    <Stack spacing={2}>
      <AppTextInput label="Логин" value={value.login} disabled={disabled || !isCreate} onChange={(event) => update({ login: event.target.value })} helperText={isCreate ? "3–40 символов: латинские буквы, цифры, . _ -" : "Логин нельзя изменить после создания."} />
      <AppTextInput label="Отображаемое имя" value={value.displayName} disabled={disabled} onChange={(event) => update({ displayName: event.target.value })} />
      <FormControl fullWidth disabled={disabled || isEditingSelf}>
        <InputLabel id="user-role-label">Роль</InputLabel>
        <Select labelId="user-role-label" label="Роль" value={value.role} onChange={(event) => update({ role: event.target.value as UserRole })}>
          <MenuItem value="host">Ведущий</MenuItem>
          <MenuItem value="admin">Администратор</MenuItem>
        </Select>
      </FormControl>

      {isCreate ? (
        <Stack spacing={1.5}>
          <AppTextInput label="Пароль" type="password" autoComplete="new-password" value={value.password} disabled={disabled} onChange={(event) => update({ password: event.target.value })} helperText="От 10 до 128 символов" />
          <AppTextInput label="Повторите пароль" type="password" autoComplete="new-password" value={value.confirmation} disabled={disabled} onChange={(event) => update({ confirmation: event.target.value })} />
        </Stack>
      ) : null}

      <Stack spacing={1}>
        <Typography variant="h6">Профили проектов</Typography>
        <Typography variant="body2" color="text.secondary">У пользователя должен быть хотя бы один профиль. Никнейм используется при создании игр в выбранном проекте.</Typography>
        {value.projectProfiles.map((profile, index) => (
          <Stack key={`${profile.projectId}-${index}`} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <FormControl fullWidth disabled={disabled}>
              <InputLabel id={`profile-project-${index}`}>Проект</InputLabel>
              <Select labelId={`profile-project-${index}`} label="Проект" value={profile.projectId} onChange={(event) => update({ projectProfiles: replaceProfile(value.projectProfiles, index, { projectId: event.target.value }) })}>
                {projects.filter((project) => project.id === profile.projectId || !value.projectProfiles.some((item, itemIndex) => itemIndex !== index && item.projectId === project.id)).map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}
              </Select>
            </FormControl>
            <AppTextInput label="Никнейм" value={profile.nickname} disabled={disabled} onChange={(event) => update({ projectProfiles: replaceProfile(value.projectProfiles, index, { nickname: event.target.value }) })} sx={{ width: { xs: "100%", sm: 280 } }} />
            <IconButton aria-label="Удалить профиль проекта" disabled={disabled || value.projectProfiles.length === 1} onClick={() => update({ projectProfiles: value.projectProfiles.filter((_, profileIndex) => profileIndex !== index) })}><DeleteOutlineRoundedIcon /></IconButton>
          </Stack>
        ))}
        <AppPillButton startIcon={<AddRoundedIcon />} disabled={disabled || !availableProjects.length} onClick={() => update({ projectProfiles: [...value.projectProfiles, { projectId: availableProjects[0].id, nickname: "" }] })}>Добавить профиль</AppPillButton>
      </Stack>
    </Stack>
  );
}
