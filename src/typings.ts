/* eslint-disable camelcase */

import { AccessoryConfig } from 'homebridge'

export interface IMapSetOptions<T> {
  debounce?: number
  ensureActive?: boolean
  update?: keyof T
}

export const enum SwitchStatuses {
  On = 'on',
  Off = 'off',
}

export const enum Modes {
  DryCloth = 'dry_cloth',
  Auto = 'auto',
  On = 'on',
}

export const enum FanStatuses {
  Low = '1',
  Medium = '2',
  High = '3',
}

export const enum Thresholds {
  T40 = '40',
  T50 = '50',
  T60 = '60',
}

export interface DehumidifierAccessoryConfig extends AccessoryConfig {
  ip: string
  token: string
  pollingInterval?: number
  serial?: string
  model?: string
  manufacturer?: string
  ledSwitch?: string
  buzzerSwitch?: string
}

export interface MiioProps {
  on_off: SwitchStatuses
  compressor_status: SwitchStatuses
  child_lock: SwitchStatuses
  auto: Thresholds
  humidity: string
  tank_full: SwitchStatuses
  mode: Modes
  fan_st: FanStatuses
  buzzer: SwitchStatuses
  led: SwitchStatuses
}
