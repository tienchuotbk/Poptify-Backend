/** Enum dùng chung cho Popup (entity + DTO). */

export enum PopupType {
  Discount = 'discount',
  Newsletter = 'newsletter',
  ExitIntent = 'exit_intent',
}

export enum PopupTriggerType {
  PageLoad = 'page_load',
  TimeDelay = 'time_delay',
  ScrollPercentage = 'scroll_percentage',
  ExitIntent = 'exit_intent',
}

export enum PopupFrequency {
  EveryVisit = 'every_visit',
  OncePerSession = 'once_per_session',
  OncePerDay = 'once_per_day',
  OncePerWeek = 'once_per_week',
}

export enum PopupPosition {
  Center = 'center',
  BottomLeft = 'bottom_left',
  BottomRight = 'bottom_right',
}
