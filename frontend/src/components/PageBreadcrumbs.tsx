import { appHeaderTexts } from "../texts/appHeaderTexts";
import { findNavigationItem } from "../navigation";
import AppBreadcrumbs from "./ui/AppBreadcrumbs";

interface PageBreadcrumbsProps {
  pagePath: string;
}

export default function PageBreadcrumbs({ pagePath }: PageBreadcrumbsProps) {
  const navigation = findNavigationItem(pagePath);
  const items = navigation
    ? [appHeaderTexts.brandTitle, navigation.group.label, navigation.item.label]
    : [appHeaderTexts.brandTitle];

  return <AppBreadcrumbs items={items} />;
}
