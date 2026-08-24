import { Autocomplete, CircularProgress, ListItemText, Typography } from "@mui/material";
import type { SyntheticEvent } from "react";
import { playerTexts } from "../../texts/playerTexts";
import type { PlayerReferenceInput, ProjectPlayer } from "../../features/players/types";
import AppTextInput from "../ui/AppTextInput";

interface CreatePlayerOption {
  type: "create";
  nickname: string;
}

type PlayerOption = ProjectPlayer | CreatePlayerOption;

interface ProjectPlayerAutocompleteProps {
  label: string;
  value: PlayerReferenceInput;
  players: ProjectPlayer[];
  loading?: boolean;
  loadError?: string | null;
  errorText?: string | null;
  disabled?: boolean;
  onChange: (nextValue: PlayerReferenceInput) => void;
}

function isCreatePlayerOption(option: PlayerOption): option is CreatePlayerOption {
  return "type" in option && option.type === "create";
}

function nicknameKey(nickname: string): string {
  return nickname.trim().toLocaleLowerCase("ru");
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1]! + 1,
        previous[rightIndex]! + 1,
        previous[rightIndex - 1]! + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length]!;
}

export default function ProjectPlayerAutocomplete({
  label,
  value,
  players,
  loading = false,
  loadError = null,
  errorText = null,
  disabled = false,
  onChange,
}: ProjectPlayerAutocompleteProps) {
  const selectedPlayer = value.playerRefId ? players.find((player) => player.id === value.playerRefId) ?? null : null;

  function handleInputChange(_event: SyntheticEvent, nextInputValue: string, reason: string) {
    if (reason === "input" || reason === "clear") {
      onChange({ nickname: nextInputValue, playerRefId: null });
    }
  }

  function handleOptionChange(_event: SyntheticEvent, nextOption: PlayerOption | string | null) {
    if (typeof nextOption === "string") {
      onChange({ nickname: nextOption, playerRefId: null });
      return;
    }

    if (!nextOption) {
      onChange({ nickname: "", playerRefId: null });
      return;
    }

    if (isCreatePlayerOption(nextOption)) {
      onChange({ nickname: nextOption.nickname, playerRefId: null });
      return;
    }

    onChange({ nickname: nextOption.content.nickname, playerRefId: nextOption.id });
  }

  return (
    <Autocomplete<PlayerOption, false, false, true>
      freeSolo
      fullWidth
      options={players}
      value={selectedPlayer}
      inputValue={value.nickname}
      loading={loading}
      disabled={disabled}
      getOptionLabel={(option) => (typeof option === "string" ? option : isCreatePlayerOption(option) ? option.nickname : option.content.nickname)}
      isOptionEqualToValue={(option, selected) =>
        !isCreatePlayerOption(option) && !isCreatePlayerOption(selected) && option.id === selected.id
      }
      filterOptions={(options, state) => {
        const query = state.inputValue.trim();
        if (!query) return options;

        const queryKey = nicknameKey(query);
        const matches = options.filter((option) => {
          if (isCreatePlayerOption(option)) return false;
          const optionKey = nicknameKey(option.content.nickname);
          return optionKey.includes(queryKey) || queryKey.includes(optionKey) || editDistance(optionKey, queryKey) <= 1;
        });
        const hasExactMatch = options.some(
          (option) => !isCreatePlayerOption(option) && nicknameKey(option.content.nickname) === queryKey,
        );

        return hasExactMatch ? matches : [...matches, { type: "create", nickname: query }];
      }}
      noOptionsText={playerTexts.autocomplete.empty}
      loadingText={playerTexts.autocomplete.loading}
      onInputChange={handleInputChange}
      onChange={handleOptionChange}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props;

        if (isCreatePlayerOption(option)) {
          return (
            <li key={key} {...optionProps}>
              <Typography color="primary">{playerTexts.autocomplete.create(option.nickname)}</Typography>
            </li>
          );
        }

        const aliases = option.content.aliases.filter((alias) => nicknameKey(alias) !== nicknameKey(option.content.nickname));
        return (
          <li key={key} {...optionProps}>
            <ListItemText
              primary={option.content.nickname}
              secondary={aliases.length ? playerTexts.autocomplete.aliases(aliases) : undefined}
            />
          </li>
        );
      }}
      renderInput={(params) => (
        <AppTextInput
          {...params}
          label={label}
          placeholder={playerTexts.autocomplete.placeholder}
          error={Boolean(errorText)}
          helperText={errorText ?? (loadError ? playerTexts.autocomplete.loadError : undefined)}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
