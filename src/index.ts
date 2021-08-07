import { API } from 'homebridge';
import { ACCESSORY_NAME } from './constants';
import { NewWideTechInternetDehumidifierAccessory } from './accessory'; 

export = (api: API) => {
  api.registerAccessory(
    ACCESSORY_NAME,
    NewWideTechInternetDehumidifierAccessory as any,
  );
};
