import _ from 'lodash';
import Jimp from 'jimp';
import { exec } from 'child_process';
import WebSocket from 'ws';

//this is only an addon which allows you to watch frustrated people trying to turn the lamp off
//main script will work without this

const framesBeforeEvent = 60; //if debounceVal is equal to 100, ten frames are equal to 1sec of video
var framesAfterEvent = 1.2*framesBeforeEvent+1;
const debounceVal = 100;

const fps = 1000/debounceVal;
const camURL = `http://kunden.brauchbarkeit.de/ois/webcam/oiszkm.jpg`;

var cameraFrames = [];
var isRecording = false;

const ws = new WebSocket('ws://localhost:3333');
ws.on('open', () => {
  console.log('Camera connected!');
});

ws.on('message', (msg) => {
  if(msg == 'plsvideo') {
    isRecording = true;
    framesAfterEvent+=framesBeforeEvent; //every button press from Art Center makes this video longer to see whole action ;]
  }
  console.log(msg);
});

function saveFrameInLimitedArray(frame, limit) {
  if(cameraFrames.length >= limit) { //spooky code for recording frames before real button press
    cameraFrames.shift();
    cameraFrames.push(frame);
  } else { cameraFrames.push(frame) }
}

async function captureFrame() {
  let url = `${camURL}?p=${Date.now()}`;
  console.log(`FRAMES: ${cameraFrames.length}`);
  const frame = await Jimp.read(url).then((frame) => {
    if(isRecording) {
      saveFrameInLimitedArray(frame, framesAfterEvent);
    } else {
      saveFrameInLimitedArray(frame, framesBeforeEvent);
    }
  }).catch(err => captureFrame());
}

function getVideoName() {
  let d = new Date();
  return `vid_${d.getDate()}-${d.getMonth()+1}_${(0 + d.getHours().toString()).slice(-2)}:${(0 + d.getMinutes().toString()).slice(-2)}:${(0 + d.getSeconds().toString()).slice(-2)}.avi`;
}

function makeVideo(callback) {
  cameraFrames.map((frame, i) => {
    frame.write(`frames/${i+1}.jpg`);
  })
  exec(`cd frames && ls -1tr > frames.txt && mencoder -nosound -ovc lavc -lavcopts vcodec=mpeg4:mbd=2:trell:autoaspect:vqscale=3 -vf scale=320:240 -mf type=jpeg:fps=${fps} mf://@frames.txt -o ../videos/${getVideoName()} && cd .. && rm -rf frames/*`, (error, stdout, stderr) => {
    console.log(stdout);
    callback();
  })
}

function watch() {
  const watchDebounced = _.debounce(watch, debounceVal);
  if(cameraFrames.length < framesAfterEvent) {
    captureFrame().then(() => {
      watchDebounced();
    })
  } else {
    makeVideo(() => {
      console.log('VIDEO SAVED');
      isRecording = false;
      cameraFrames = [];
      framesAfterEvent = 2*framesBeforeEvent+1;
      watch();
    });
  }
}

watch();
