import Jimp from 'jimp';
import _ from 'lodash';
import { exec } from 'child_process';
import { Server as WebSocketServer } from 'ws';

const imgURL = `http://kunden.brauchbarkeit.de/ois/webcam/oiszkm.jpg`;

var cameraSocket = null;
const wss = new WebSocketServer({ port: 3333 });
wss.on('connection', (ws) => {
  cameraSocket = ws;
  console.log('Camera connected!');
});

function getFilename() {
  let d = new Date();
  return `lamp_${d.getDate()}-${d.getMonth()+1}_${(0 + d.getHours().toString()).slice(-2)}:${(0 + d.getMinutes().toString()).slice(-2)}.jpg`;
}

function saveImg(img) {
  img.write(`captured/${getFilename()}`);
  console.log('image captured!');
}

function average(arr) {
  return arr.reduce((a, b) => {
    return a + b;
  })/arr.length;
}

async function getLampState(srcImg) {
  const pixels = [];
  const data = await Jimp.read(srcImg).then((img) => {
    img.scan(258, 137, 22, 33, (x, y, idx) => { //scan a part of image which contains the lamp to check brightness
      pixels.push(parseInt(img.getPixelColor(x, y)));
    });
    if(average(_.uniq(pixels)) < 2278124287) { //hex color of shining lamp is almost ffffff so the avg of off-state can be lower than any not high val
      return { turnedOn: false, img };
    } else {
      return { turnedOn: true, img };
    }
  });
  return data;
}

function casperBot(callback) {
  exec("casperjs casper-lamp.js", (error, stdout, stderr) => { //execute casper switch
    console.log(stdout);
    callback(); //come back to watching state
  });
}

function autoSwitch() {
  const autoSwitchDebounced = _.debounce(autoSwitch, 250);
  const url = `${imgURL}?p=${Date.now()}`;
  getLampState(url).then(({turnedOn, img}) => {
    if(turnedOn) {
      console.log('on');
      autoSwitchDebounced();
    } else {
      console.log('off');
      saveImg(img);
      if(cameraSocket) {
        cameraSocket.send('plsvideo')
      }
      casperBot(autoSwitch);
    }
  }).catch(err => autoSwitchDebounced()); //webcam server is not good, sometimes it returns some errors, just try again then
}

autoSwitch();
