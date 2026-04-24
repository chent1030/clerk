import { formatDistanceToNow } from "date-fns";
import { enUS as dateFnsEnUS, zhCN as dateFnsZhCN } from "date-fns/locale";

import { detectLocale, type Locale } from "@/core/i18n";
import { getLocaleFromCookie } from "@/core/i18n/cookies";

function getDateFnsLocale(locale: Locale) {
  switch (locale) {
    case "zh-CN":
      return dateFnsZhCN;
    case "en-US":
    default:
      return dateFnsEnUS;
  }
}

export function formatTimeAgo(date: Date | string | number, locale?: Locale) {
  const effectiveLocale =
    locale ??
    (getLocaleFromCookie() as Locale | null) ??
    detectLocale();
  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === "number") {
    d = new Date(date > 1e12 ? date : date * 1000);
  } else {
    d = new Date(date);
    if (isNaN(d.getTime())) {
      const n = Number(date);
      if (!isNaN(n)) {
        d = new Date(n > 1e12 ? n : n * 1000);
      }
    }
  }
  if (isNaN(d.getTime())) return "";
  return formatDistanceToNow(d, {
    addSuffix: true,
    locale: getDateFnsLocale(effectiveLocale),
  });
}
