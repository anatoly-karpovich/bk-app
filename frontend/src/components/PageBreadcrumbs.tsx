import { appHeaderTexts } from "../texts/appHeaderTexts";
import { findNavigationItem } from "../navigation";
import AppBreadcrumbs from "./ui/AppBreadcrumbs";
import type { AppBreadcrumbItem } from "./ui/AppBreadcrumbs";

interface PageBreadcrumbsProps {
  pagePath: string;
  additionalItems?: AppBreadcrumbItem[];
}

export default function PageBreadcrumbs({ pagePath, additionalItems = [] }: PageBreadcrumbsProps) {
  const navigation = findNavigationItem(pagePath);
  const items: AppBreadcrumbItem[] = [
    { label: appHeaderTexts.brandTitle, to: "/" },
    ...(navigation
      ? [
          { label: navigation.group.label },
          {
            label: navigation.item.label,
            to: additionalItems.length ? navigation.item.to : undefined,
          },
        ]
      : []),
  ];

  return <AppBreadcrumbs items={[...items, ...additionalItems]} />;
}
