// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
'use strict';

const BaseInterface = require('azure-iot-digitaltwins-device').BaseInterface;
const Telemetry = require('azure-iot-digitaltwins-device').Telemetry;

const INTERFACE_ID = 'urn:kartben:com:LPSTKSensors:1'

module.exports.LPSTKSensors = class LPSTKSensors extends BaseInterface {
  constructor(name, propertyCallback, commandCallback) {
    super(name, INTERFACE_ID, propertyCallback, commandCallback);
    this.ambienceTemp = new Telemetry();
    this.objectTemp = new Telemetry();
    this.light = new Telemetry();
    this.humidity = new Telemetry();
    this.hallFlux = new Telemetry();
  }

  static INTERFACE_ID = INTERFACE_ID;
  
  static MODEL = `{
    "@id": "${this.INTERFACE_ID}",
    "@type": "Interface",
    "displayName": "LPSTK Sensors",
    "description": "Describes all the sensors available on the TI CC1352 LPSTK",
    "contents": [
      {
        "@type": [
          "Telemetry",
          "SemanticType/Temperature"
        ],
        "description": "Ambient temperature",
        "displayName": "Temperature",
        "name": "ambienceTemp",
        "schema": "double",
        "unit": "Units/Temperature/celsius"
      },
      {
        "@type": [
          "Telemetry",
          "SemanticType/Temperature"
        ],
        "description": "Object temperature",
        "displayName": "Object temperature",
        "name": "objectTemp",
        "schema": "double",
        "unit": "Units/Temperature/celsius"
      },
      {
        "@type": [
          "Telemetry",
          "SemanticType/Humidity"
        ],
        "description": "Humidity level",
        "displayName": "Humidity",
        "name": "humidity",
        "schema": "double",
        "unit": "Units/Humidity/percent"
      }
    ],
    "@context": "http://azureiot.com/v1/contexts/IoTModel.json"
  }`;
};