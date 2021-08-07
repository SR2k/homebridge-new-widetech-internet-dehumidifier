# Homebridge Plugin for New Widetech Internet Dehumidifier

This plugin helps you to connect your New Widetech Internet Dehumidifier with Homebridge. Tested ONLY on the 18L model.

## Usage

First, install the plugin, you might need `sudo`:

``` shell
npm i -g homebridge-new-widetech-internet-dehumidifier
```

Then head to Homebridge `config.json`, and add a new accessory:

``` json
{
  // ... extra configs
  "accessories": [
    // ... extra accessories
    {
      "accessory": "NewWidetechInternetDehumidifier",
      "ip": "10.0.1.5",
      "token": "the-top-secret-token"
    }
  ]
}
```

Now reboot Homebridge and turn to your Home app.

## Config

Fields explained:

- `ip` (required): The IP address in your local network
- `token` (required): The miio token. In case you don't know what a token is, read [this](https://github.com/Maxmudjon/com.xiaomi-miio/blob/master/docs/obtain_token.md#obtain-mi-home-device-token)
- `name`: Name for displaying in HomeKit and for logging
- `serial`: Serial Number field in Home app. Will use token if absent
- `model`: Model field in Home app
- `manufacturer`: Manufacturer field in Home app
- `ledSwitch`: Name for displaying LED switch. Leave empty to hide the LED switch service
- `buzzerSwitch`: Name for displaying buzzer switch. Leave empty to hide the buzzer switch service

## Special modes mapping

NWT's dehumidifier supports continuous mode and dry cloth mode, which is absent in HomeKit. The plugins maps those modes into available controls as a work-around.

When you set target dehumidifier threshold to 0, the dehumidifier will turn on continuous mode.

When you set fan speed to the max, the dehumidifier will turn on dry cloth mode.

## Develop

``` shell
yarn
yarn watch
```
