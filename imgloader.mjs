import * as Canvas from 'canvas';
import * as faceapi from 'face-api.js';


module.exports={fun:function(path){
    const canvas = require('canvas');
faceapi.env.monkeyPatch({ Canvas, Image })
const img = await canvas.loadImage(path);
return img;

}}