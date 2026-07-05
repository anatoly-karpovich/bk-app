import { appHeaderTexts } from "../texts/appHeaderTexts";
import AppBreadcrumbs from "./ui/AppBreadcrumbs";

interface GameBreadcrumbsProps {
  title: string;
}

export default function GameBreadcrumbs({ title }: GameBreadcrumbsProps) {
  return <AppBreadcrumbs items={[appHeaderTexts.brandTitle, title]} />;
}
