import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import { Divider, ListItemIcon, Menu, MenuItem } from "@mui/material";
import type { ButtonProps } from "@mui/material";
import { useState } from "react";
import type { ReactNode } from "react";
import AppPillButton from "./ui/AppPillButton";

export interface GamePageHeaderMoreAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  color?: ButtonProps["color"];
  dividerBefore?: boolean;
}

interface GamePageHeaderMoreMenuProps {
  actions: GamePageHeaderMoreAction[];
  disabled?: boolean;
}

export default function GamePageHeaderMoreMenu({ actions, disabled = false }: GamePageHeaderMoreMenuProps) {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorElement);

  function closeMenu() {
    setAnchorElement(null);
  }

  return (
    <>
      <AppPillButton
        variant="outlined"
        startIcon={<MoreHorizRoundedIcon />}
        endIcon={<KeyboardArrowDownRoundedIcon />}
        disabled={disabled}
        onClick={(event) => setAnchorElement(event.currentTarget)}
      >
        Ещё
      </AppPillButton>
      <Menu
        anchorEl={anchorElement}
        open={open}
        onClose={closeMenu}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        MenuListProps={{ dense: true }}
      >
        {actions.flatMap((action) => [
          action.dividerBefore ? <Divider key={`${action.key}-divider`} /> : null,
            <MenuItem
              key={action.key}
              disabled={disabled || action.disabled}
              onClick={() => {
                closeMenu();
                action.onClick();
              }}
              sx={{ color: action.color === "error" ? "error.main" : undefined }}
            >
              {action.icon ? <ListItemIcon sx={{ color: "inherit" }}>{action.icon}</ListItemIcon> : null}
              {action.label}
            </MenuItem>,
        ])}
      </Menu>
    </>
  );
}
