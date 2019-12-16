const util = require('util');

const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')
const port = new SerialPort('/dev/tty.usbmodemL41008DW1', { autoOpen: true, baudRate: 115200 })

const LPSTKSensors = require('./lpstksensors').LPSTKSensors;
const DeviceInformation = require('./deviceInformation').DeviceInformation;
const ModelDefinition = require('./modelDefinition').ModelDefinition;

const capabilityModelId = 'urn:kartben:LPSTK:1';

const modelDefinitionHandler = (request, response) => {
  if (request.payload !== LPSTKSensors.INTERFACE_ID) {
    response.acknowledge(404, null)
      .then(console.log('Successfully sent the not found error for command ' + request.payload))
      .catch((err) => {
        console.log('The failure response to the getModelDefinition failed to send.  Error is: ' + err.toString());
      });
  } else {
    response.acknowledge(200, JSON.parse(LPSTKSensors.MODEL))
      .then(console.log('Successfully sent the model.'))
      .catch((err) => {
        console.log('The response to the getModelDefinition failed to send.  Error is: ' + err.toString());
      });
  }
};



const iotHubTransport = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const crypto = require('crypto');
const DigitalTwinClient = require('azure-iot-digitaltwins-device').DigitalTwinClient;

const ProvisioningTransport = require('azure-iot-provisioning-device-mqtt').Mqtt;
const SymmetricKeySecurityClient = require('azure-iot-security-symmetric-key').SymmetricKeySecurityClient;
const ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

const provisioningHost = 'global.azure-devices-provisioning.net';
const idScope = '0ne0005CF6C'
const symmetricGroupKey = 'Fkx2BvX0YRGliXC2GqCdxu2jamK+o9xfF1cHbNnphg6Eqrg0e271ZMrVS37O0s0q278dqQzYtn8Eu0Wgt8fgXQ==';

function computeDerivedSymmetricKey(masterKey, regId) {
  return crypto.createHmac('SHA256', Buffer.from(masterKey, 'base64'))
    .update(regId, 'utf8')
    .digest('base64');
}

const IOTHUBCLIENTS_CACHE = {}
const DIGITALTWINCLIENTS_CACHE = {}
const INTERFACES_CACHE = {}

function getIoTHubClient(deviceId) {
  return new Promise((resolve, reject) => {
    iotHubClient = IOTHUBCLIENTS_CACHE[deviceId];

    if (!iotHubClient) {
      var symmetricKey = computeDerivedSymmetricKey(symmetricGroupKey, deviceId);
      var provisioningSecurityClient = new SymmetricKeySecurityClient(deviceId, symmetricKey);
      var provisioningClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new ProvisioningTransport(), provisioningSecurityClient);
      var register = util.promisify(provisioningClient.register).bind(provisioningClient)
      register().
        then((result) => {
          var connectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + symmetricKey;
          var iotHubClient = Client.fromConnectionString(connectionString, iotHubTransport);
          IOTHUBCLIENTS_CACHE[deviceId] = iotHubClient;
          resolve(iotHubClient);
        }).
        catch(reject)
    } else {
      resolve(iotHubClient)
    }
  })
}

function getDigitalTwinClient(deviceId) {
  return new Promise((resolve, reject) => {
    getIoTHubClient(deviceId).
      then((iotHubClient) => {

        var digitalTwinClient = DIGITALTWINCLIENTS_CACHE[deviceId];

        if(!digitalTwinClient) {
          DIGITALTWINCLIENTS_CACHE[deviceId] = 'pending';
          const digitalTwinClient = new DigitalTwinClient(capabilityModelId, iotHubClient);

          const lpstkSensors = new LPSTKSensors('lpstkSensors');
          const deviceInformation = new DeviceInformation('deviceInformation');
          const modelDefinition = new ModelDefinition('urn_azureiot_ModelDiscovery_ModelDefinition', null, modelDefinitionHandler);
  
          digitalTwinClient.addInterfaceInstance(lpstkSensors);
          digitalTwinClient.addInterfaceInstance(deviceInformation);
          digitalTwinClient.addInterfaceInstance(modelDefinition);

          digitalTwinClient.register().then((c) => {
            DIGITALTWINCLIENTS_CACHE[deviceId] = digitalTwinClient;
            INTERFACES_CACHE[deviceId] = {lpstkSensors: lpstkSensors,
                                            deviceInformation: deviceInformation,
                                            modelDefinition: modelDefinition}
            resolve({client: digitalTwinClient, interfaces: {
              lpstkSensors: lpstkSensors,
              deviceInformation: deviceInformation,
              modelDefinition: modelDefinition
            }}); 
          })
        } 
        else {
          if(digitalTwinClient === 'pending') {
            // TODO improve this :)
            reject();
          } else {
            resolve({client: digitalTwinClient, interfaces: {
              lpstkSensors: INTERFACES_CACHE[deviceId].lpstkSensors,
              deviceInformation: INTERFACES_CACHE[deviceId].deviceInformation,
              modelDefinition: INTERFACES_CACHE[deviceId].modelDefinition
            }});   
          }
        }
      })
  })
}

const parser = port.pipe(new Readline({ delimiter: '\r\n' }))
parser.on('data', d => {
  try {
    var frame = JSON.parse(d)
    var deviceId = frame.deviceInfo.extAddr;

    getDigitalTwinClient(deviceId).
      then((res) => {
        res.interfaces.lpstkSensors.sendTelemetry({ humidity: frame.sensorData.humidity, objectTemp: frame.sensorData.objectTemp});  
      })

  } catch (e) {
    // ignore
    console.log(e)
  }
})