import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { Accordion, AccordionDetails, AccordionSummary, Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { formatResourceAmounts } from "../../rewards/resourceAmounts";
import type { LottoBingoPageModel } from "../types";

export default function LottoBingoAuditTrail({ game }: { game: LottoBingoPageModel }) {
  const finalPayouts = game.state.rewards.finalPayouts;
  return <Card><CardContent sx={{ p: 0 }}>{finalPayouts.length ? <Box sx={{ px: { xs: 2.25, md: 2.5 }, pt: 2.25 }}><Typography variant="h6">Финальные награды</Typography><Stack spacing={0.75} sx={{ mt: 1.25 }}>{finalPayouts.map((payout) => <Box key={payout.id} sx={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", alignItems: "center", gap: 1.25, px: 1.25, py: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.5, bgcolor: "#fafafa" }}><EmojiEventsRoundedIcon color="warning" fontSize="small" /><Box minWidth={0}><Typography variant="body2" fontWeight={800} noWrap>{payout.nickname}</Typography><Typography variant="caption" color="text.secondary">Награда сохранена</Typography></Box><Typography variant="body2" color="success.main" fontWeight={800} sx={{ textAlign: "right" }}>{formatResourceAmounts(payout.resolvedRewards, game.configuration.resources, { showPlus: true })}</Typography></Box>)}</Stack></Box> : null}<Accordion disableGutters elevation={0} sx={{ "&:before": { display: "none" } }}>
    <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: { xs: 2.25, md: 2.5 }, minHeight: 64 }}><Typography variant="h6">История действий</Typography></AccordionSummary>
    <AccordionDetails sx={{ px: { xs: 2.25, md: 2.5 }, pt: 0 }}><Stack divider={<hr style={{ width: "100%", border: 0, borderTop: "1px solid #e5e7eb", margin: 0 }} />}>
      {[...game.state.timeline].reverse().map((event) => <Stack key={event.id} direction="row" justifyContent="space-between" spacing={2} sx={{ py: 1.25 }}><Typography variant="body2">{event.message} · {event.actorName}</Typography><Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>{new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</Typography></Stack>)}
      {!game.state.timeline.length ? <Typography variant="body2" color="text.secondary">Действий пока нет.</Typography> : null}
    </Stack></AccordionDetails>
  </Accordion></CardContent></Card>;
}
