import GridOnRoundedIcon from "@mui/icons-material/GridOnRounded";
import { Alert, Box, Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import { battleshipsTexts } from "../../../texts/battleshipsTexts";
import type { BattleshipsBoardCell, BattleshipsPersistedGame } from "../types";

interface BattleshipsBoardCardProps {
  game: BattleshipsPersistedGame | null;
  actionsDisabled: boolean;
  onShoot: (row: number, column: number) => void;
}

function BattleshipsBoardButton({
  cell,
  disabled,
  onShoot,
}: {
  cell: BattleshipsBoardCell;
  disabled: boolean;
  onShoot: (row: number, column: number) => void;
}) {
  const isShip = cell.shipSize > 0;
  const isMiss = cell.hasShot && !cell.isHit;
  const isHit = cell.isHit;

  return (
    <Box
      component="button"
      type="button"
      onClick={() => onShoot(cell.row, cell.column)}
      disabled={disabled}
      aria-label={`Клетка ${cell.coordinateLabel}`}
      sx={{
        width: { xs: 42, md: 54 },
        height: { xs: 42, md: 54 },
        borderRadius: 2,
        border: "1px solid rgba(15, 23, 42, 0.12)",
        background: isHit
          ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
          : isMiss
            ? "linear-gradient(135deg, #475569 0%, #1e293b 100%)"
            : isShip
              ? "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)"
              : "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
        color: isHit || isMiss ? "#fff" : isShip ? "#065f46" : "#2563eb",
        fontWeight: 800,
        fontSize: { xs: "0.82rem", md: "0.95rem" },
        cursor: disabled ? "default" : "pointer",
        boxShadow: isHit ? "inset 0 0 0 1px rgba(255,255,255,0.18)" : "none",
        transition: "transform 120ms ease, box-shadow 120ms ease",
        "&:hover": disabled
          ? undefined
          : {
              transform: "translateY(-1px)",
              boxShadow: "0 10px 18px rgba(37, 99, 235, 0.16)",
            },
      }}
    >
      {isHit ? "X" : isMiss ? "•" : isShip ? cell.shipSize : ""}
    </Box>
  );
}

export default function BattleshipsBoardCard({ game, actionsDisabled, onShoot }: BattleshipsBoardCardProps) {
  if (!game) {
    return (
      <Card>
        <CardHeader title={battleshipsTexts.cards.boardTitle} subheader={battleshipsTexts.cards.boardSubtitle} />
        <CardContent>
          <Alert severity="info" icon={<GridOnRoundedIcon fontSize="inherit" />}>
            {battleshipsTexts.alerts.boardEmpty}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const boardLetters = game.derived.boardLetters;
  const gameIsOver = game.derived.gameIsOver;

  return (
    <Card>
      <CardHeader title={battleshipsTexts.cards.boardTitle} subheader={battleshipsTexts.cards.boardSubtitle} />
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography variant="body2" color="text.secondary">
              Поле {game.derived.boardConfig.boardSize}x{game.derived.boardConfig.boardSize}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Добито кораблей: {game.derived.destroyedShipsCount}/{game.derived.totalShipsCount}
            </Typography>
          </Stack>

          <Box sx={{ overflowX: "auto", pb: 1 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: `38px repeat(${game.board[0]?.length ?? 0}, minmax(42px, 54px))`,
                gap: 1,
                alignItems: "center",
                width: "max-content",
                minWidth: "100%",
              }}
            >
              <Box />
              {Array.from({ length: game.board[0]?.length ?? 0 }, (_, index) => (
                <Box key={`column-${index + 1}`} sx={{ textAlign: "center", fontWeight: 700, color: "text.secondary" }}>
                  {index + 1}
                </Box>
              ))}

              {game.board.map((row, rowIndex) => (
                <Box key={`row-${rowIndex + 1}`} sx={{ display: "contents" }}>
                  <Box
                    sx={{
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                      color: "text.secondary",
                    }}
                  >
                    {boardLetters[rowIndex] ?? rowIndex + 1}
                  </Box>

                  {row.map((cell) => (
                    <BattleshipsBoardButton
                      key={cell.coordinateLabel}
                      cell={cell}
                      disabled={actionsDisabled || cell.hasShot || gameIsOver}
                      onShoot={onShoot}
                    />
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
