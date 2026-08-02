import { dashboardTexts } from "../../texts/dashboardTexts";

export function getDashboardGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return dashboardTexts.greetings.morning;
  if (hour >= 12 && hour < 17) return dashboardTexts.greetings.day;
  if (hour >= 17 && hour < 23) return dashboardTexts.greetings.evening;
  return dashboardTexts.greetings.night;
}
