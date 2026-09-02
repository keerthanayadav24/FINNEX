export type DateRangePreset =
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'LAST_YEAR'
  | 'CUSTOM';

export interface DateRange {
  preset: DateRangePreset;
  startDate?: string; // YYYY-MM-DD or ISO string
  endDate?: string;   // YYYY-MM-DD or ISO string
  customFrom?: string; // YYYY-MM-DD
  customTo?: string;   // YYYY-MM-DD
}

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  TODAY: 'Today',
  YESTERDAY: 'Yesterday',
  LAST_7_DAYS: 'Last 7 Days',
  THIS_WEEK: 'This Week',
  THIS_MONTH: 'This Month',
  LAST_MONTH: 'Last Month',
  THIS_YEAR: 'This Year',
  LAST_YEAR: 'Last Year',
  CUSTOM: 'Custom Range',
};

export function getDateRangeBounds(range: DateRange, referenceDate: Date = new Date()): { startDate: string; endDate: string } {
  const now = new Date(referenceDate);
  const year = now.getFullYear();
  const month = now.getMonth();

  let start = new Date(now);
  let end = new Date(now);

  switch (range.preset) {
    case 'TODAY':
      start = new Date(year, month, now.getDate(), 0, 0, 0, 0);
      end = new Date(year, month, now.getDate(), 23, 59, 59, 999);
      break;

    case 'YESTERDAY':
      const yDay = new Date(now);
      yDay.setDate(yDay.getDate() - 1);
      start = new Date(yDay.getFullYear(), yDay.getMonth(), yDay.getDate(), 0, 0, 0, 0);
      end = new Date(yDay.getFullYear(), yDay.getMonth(), yDay.getDate(), 23, 59, 59, 999);
      break;

    case 'LAST_7_DAYS':
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      start = new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate(), 0, 0, 0, 0);
      end = new Date(year, month, now.getDate(), 23, 59, 59, 999);
      break;

    case 'THIS_WEEK': {
      const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0);
      end = new Date(year, month, now.getDate(), 23, 59, 59, 999);
      break;
    }

    case 'THIS_MONTH':
      start = new Date(year, month, 1, 0, 0, 0, 0);
      end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      break;

    case 'LAST_MONTH':
      start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      end = new Date(year, month, 0, 23, 59, 59, 999);
      break;

    case 'THIS_YEAR':
      start = new Date(year, 0, 1, 0, 0, 0, 0);
      end = new Date(year, 11, 31, 23, 59, 59, 999);
      break;

    case 'LAST_YEAR':
      start = new Date(year - 1, 0, 1, 0, 0, 0, 0);
      end = new Date(year - 1, 11, 31, 23, 59, 59, 999);
      break;

    case 'CUSTOM':
      if (range.customFrom) {
        const [fY, fM, fD] = range.customFrom.split('-').map(Number);
        start = new Date(fY, fM - 1, fD, 0, 0, 0, 0);
      } else {
        start = new Date(year, month, 1, 0, 0, 0, 0);
      }

      if (range.customTo) {
        const [tY, tM, tD] = range.customTo.split('-').map(Number);
        end = new Date(tY, tM - 1, tD, 23, 59, 59, 999);
      } else {
        end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      }
      break;
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}
