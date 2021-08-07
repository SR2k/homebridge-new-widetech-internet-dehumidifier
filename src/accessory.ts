import {
  AccessoryPlugin, API, CharacteristicSetCallback, CharacteristicValue, HAPStatus,
  Logging, Service as HomebridgeService,
} from 'homebridge'

import { normalize } from './utils'
import { MiioDevice } from './miio-device'
import {
  DEFAULT_DISPLAY_NAME, DEFAULT_MANUFACTURER, DEFAULT_MODEL, DEFAULT_POLLING_INTERVAL,
} from './constants'
import { MiioProps, DehumidifierAccessoryConfig, SwitchStatuses, Modes } from './typings'

const ALL_KEYS: Array<keyof MiioProps> = [
  'on_off',
  'compressor_status',
  'child_lock',
  'auto',
  'humidity',
  'tank_full',
  'mode',
  'fan_st',
  'buzzer',
  'led',
]

export class NewWideTechInternetDehumidifierAccessory implements AccessoryPlugin {
  private readonly services: HomebridgeService[] = [];
  private device!: MiioDevice<MiioProps>;

  constructor(
    private readonly log: Logging,
    private readonly config: DehumidifierAccessoryConfig,
    private readonly api: API,
  ) {
    this.prepareAccessoryInformation()
    this.prepareHumidifierDehumidifierService()
    this.prepareExtraSwitches()
  }

  getServices() {
    return this.services
  }

  private prepareAccessoryInformation() {
    const { serial, model, token, manufacturer } = this.config

    const { Service, Characteristic } = this.api.hap
    const { Manufacturer, Model, SerialNumber } = Characteristic
    const accessoryInformationService = new Service.AccessoryInformation()

    accessoryInformationService
      .setCharacteristic(Manufacturer, manufacturer || DEFAULT_MANUFACTURER)
      .setCharacteristic(Model, model || DEFAULT_MODEL)
      .setCharacteristic(SerialNumber, serial || token.toUpperCase())

    this.services.push(accessoryInformationService)
  }

  private prepareHumidifierDehumidifierService() {
    const { name: displayName, ip, token, pollingInterval } = this.config
    this.device = MiioDevice.getDevice(
      ip,
      token,
      this.log,
      pollingInterval || DEFAULT_POLLING_INTERVAL,
      ALL_KEYS,
    )

    const { Service, Characteristic } = this.api.hap
    const {
      Name, Active, TargetHumidifierDehumidifierState, LockPhysicalControls, WaterLevel,
      RelativeHumidityDehumidifierThreshold, RotationSpeed, CurrentHumidifierDehumidifierState, CurrentRelativeHumidity,
    } = Characteristic
    const { HumidifierDehumidifier } = Service

    this.setRelativeHumidityThreshold = this.device.mapSet(
      'setRelativeHumidityThreshold',
      'set_auto',
      value => normalize(value as any, 40, 60),
      { ensureActive: true },
    )
    this.setMode = this.device.mapSet('setContinuousMode', 'set_mode', value => value, { ensureActive: true })
    this.setFanLevel = this.device.mapSet('setFanLevel', 'set_fan_level', value => +value, { debounce: 400 })

    const service = new HumidifierDehumidifier()
    service.setCharacteristic(Name, displayName || DEFAULT_DISPLAY_NAME)

    const setPower = this.device.mapSet('setActive', 'set_power', value => (value ? SwitchStatuses.On : SwitchStatuses.Off))
    this.device.registerPowerHooks(s => s?.on_off === SwitchStatuses.On, setPower)
    service.getCharacteristic(Active)
      .on('set', setPower)
      .on('get', this.device.mapGet('getActive', result => result.on_off === SwitchStatuses.On))

    // Support dehumidifier mode only. Use empty callbacks
    service.getCharacteristic(TargetHumidifierDehumidifierState)
      .on('set', (_, cb) => cb())
      .on('get', (cb) => cb(HAPStatus.SUCCESS, TargetHumidifierDehumidifierState.DEHUMIDIFIER))
      .setProps({ validValues: [TargetHumidifierDehumidifierState.DEHUMIDIFIER] })

    service.getCharacteristic(LockPhysicalControls)
      .on('set', this.device.mapSet('setLockPhysicalControls', 'set_child_lock', value => (value ? SwitchStatuses.On : SwitchStatuses.Off)))
      .on('get', this.device.mapGet('getLockPhysicalControls', result => result.child_lock === SwitchStatuses.On))

    service.getCharacteristic(RelativeHumidityDehumidifierThreshold)
      .on('set', this.setRelativeHumidityDehumidifierThreshold)
      .on('get', this.device.mapGet(
        'getRelativeHumidityThreshold',
        result => (result.mode === Modes.On ? 0 : +result.auto),
      ))
      .setProps({
        minValue: 0,
        maxValue: 100,
        minStep: 10,
      })

    service.getCharacteristic(RotationSpeed)
      .on('set', this.setRotationSpeed)
      .on('get', this.device.mapGet('getRotationSpeed', result => +result.fan_st))
      .setProps({
        minValue: 1,
        maxValue: 4,
        minStep: 1,
      })

    service.getCharacteristic(CurrentHumidifierDehumidifierState)
      .on('get', this.device.mapGet('getCurrentHumidifierDehumidifierState', result => {
        const { INACTIVE, IDLE, DEHUMIDIFYING } = CurrentHumidifierDehumidifierState
        if (result.compressor_status === SwitchStatuses.On) {
          return DEHUMIDIFYING
        } if (result.on_off === SwitchStatuses.On) {
          return IDLE
        }
        return INACTIVE
      }))

    service.getCharacteristic(CurrentRelativeHumidity)
      .on('get', this.device.mapGet('getCurrentRelativeHumidity', result => +result.humidity))

    service.getCharacteristic(WaterLevel)
      .on('get', this.device.mapGet('getWaterLevel', result => result.tank_full === SwitchStatuses.On))

    this.services.push(service)
  }

  private prepareExtraSwitches() {
    const { buzzerSwitch, ledSwitch } = this.config

    if (buzzerSwitch) {
      this.registerSimpleSwitch(buzzerSwitch, 'set_buzzer', 'buzzer', 'Buzzer')
    }
    if (ledSwitch) {
      this.registerSimpleSwitch(ledSwitch, 'set_led', 'led', 'Led')
    }
  }

  private registerSimpleSwitch(displayName: string, setApi: string, getApi: keyof MiioProps, logName: string) {
    const { Service, Characteristic } = this.api.hap
    const { Switch } = Service
    const { Name, On } = Characteristic

    const service = new Switch(displayName, getApi)
    service.setCharacteristic(Name, displayName)
    service.getCharacteristic(On)
      .on('set', this.device.mapSet(`set${logName ?? displayName}`, setApi, value => (value ? SwitchStatuses.On : SwitchStatuses.Off)))
      .on('get', this.device.mapGet(`get${logName ?? displayName}`, result => result[getApi] === SwitchStatuses.On))

    this.services.push(service)
  }

  private setMode!: (value: CharacteristicValue, callback?: CharacteristicSetCallback) => Promise<void>;
  private setRelativeHumidityThreshold!: (value: CharacteristicValue, callback?: CharacteristicSetCallback) => Promise<void>;
  private setFanLevel!: (value: CharacteristicValue, callback?: CharacteristicSetCallback) => Promise<void>;

  private setRelativeHumidityDehumidifierThreshold = async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
    if (typeof value !== 'number') {
      callback(new Error('Invalid value for setRelativeHumidityDehumidifierThreshold'))
      return
    }

    if (value === 0) {
      this.setMode(Modes.On, callback)
      return
    }

    try {
      await this.setMode(Modes.Auto)
      this.setRelativeHumidityThreshold(normalize(value, 40, 60), callback)
    } catch (err) {
      callback(err)
    }
  };

  private setRotationSpeed = async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
    if (typeof value !== 'number') {
      callback(new Error('Invalid value for setRelativeHumidityDehumidifierThreshold'))
      return
    }

    if (value === 4) {
      this.setMode(Modes.DryCloth, callback)
      return
    }

    try {
      await this.setMode(Modes.Auto)
      this.setFanLevel(normalize(value, 1, 3), callback)
    } catch (err) {
      callback(err)
    }
  };
}
