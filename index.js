var express = require('express')
var app = express()
var fs = require('fs')

var options = {
  key: fs.readFileSync(__dirname + "/localhost.key"),
  cert: fs.readFileSync(__dirname + '/localhost.crt')
}
var server = require('https').createServer(options, app)
var io = require('socket.io')(server)

// var path = require("path")
var isPorjectMade;
var projectName;
var canvas = require('canvas')
// var buf = require('b')
// const fetch = require('node-fetch');
var labeledFaceDescriptors;

var faceapi = require('@vladmandic/face-api')
// var faceapi = require('')
const sqlite = require("better-sqlite3");
const session = require("express-session")
const SqliteStore = require("better-sqlite3-session-store")(session)
const db2 = new sqlite("./sessions.db");

var ports = new Object();
[...Array(9).keys()].map(x => x + 2).forEach((key) => {
  ports[key] = {
    "direction": 0,
    "value": "0"
  }
})

// console.log(ports);
app.use(session({
  secret: 'something highly secret :D', saveUninitialized: true, cookie: { sameSite: true, maxAge: 1000 * 60 * 60 * 24 * 7, secure: false },
  resave: false, store: new SqliteStore({
    client: db2,
    expired: {
      clear: true,
      intervalMs: 1000 * 60 * 60 * 12 //ms = 15min
    }
  })
}))

const { Canvas, Image, ImageData } = canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData })
// var {Blob} = require('buffer');



app.use(express.json({ limit: "10mb" }));

app.post("/predict", (req, res) => {


  // 0.6 is a good distance threshold value to judge
  // whether the descriptors match or not
  const maxDescriptorDistance = 0.5
  // console.log(Object.values(req.body[0].descriptor));
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, maxDescriptorDistance)

  results = faceMatcher.findBestMatch(Object.values(req.body[0].descriptor))
  if (results._label != "unknown") {
    req.session.name = results._label;
    // console.log('goooo');
    // res.redirect("/")
  }
  // const results = res.body.map(fd => faceMatcher.findBestMatch(fd.descriptor))
  res.send(results);
})
app.post("/train", async (req, res) => {
  train();
  res.send("h");

});
app.post('/append', (req, res) => {

  const buffer = Buffer.from(Object.values(req.body.image));

  try {
    fs.writeFile('./images/' + req.body.person.name + `/${req.body.name}`, buffer, (e) => {
      //  console.log(e);

    })
  }
  catch (e) {
    console.log(e);
  }
  if (req.body.lastOne) {
    res.redirect("/");
  } 
  res.send("nothing");
  // console.log(req.body);
})
// import fetch from 'node-fetch';

// faceapi.env.monkeyPatch({ fetch: fetch });
x = async function () {
  var MODEL_URL = `${__dirname}/model/`;
  // faceapi.loadFaceRecognitionModel()
  await faceapi.nets.faceRecognitionNet.loadFromDisk(__dirname + "/model");
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(__dirname + "/models")
  await faceapi.nets.faceLandmark68Net.loadFromDisk(__dirname + "/models")
  await faceapi.nets.tinyFaceDetector.loadFromDisk(__dirname + "/models")
  console.log("loaded");
  if (isPorjectMade)
    train();
}
fs.readdir(__dirname + "/images", (err, files) => {
  console.log(files);
  files.forEach((file) => {
    if (file.toString().includes(".")) { // an image

    }
  });
});
// faceapi.reco
//  faceapi.loadFaceRecognitionModel(MODEL_URL).catch((e)=>console.log(e));




const { SerialPort } = require('serialport')

const serialport = new SerialPort({ path: '/dev/ttyACM0', baudRate: 9600 }, () => {

})

io.on('connection', (socket) => {
  socket.emit("init", ports);

  socket.on("img", async (msg) => {

    const buffer = Buffer.from(msg);
    console.log(buffer);

    try {
      fs.writeFile('./img.png', buffer, (e) => {
        //  console.log(e);
      })
    }
    catch (e) {
      // console.log(e);
    }
  })
  socket.on("change", (data) => {
    console.log(data);
    // io.emit('change',(data));
    io.emit("change", data)

    if (serialport.isOpen) {
      // console.log(serialport);
      serialport.write((Number(data) + 2).toString() + "\n")
    }

  })
})




app.get('/', (req, res) => {
  console.log(__dirname + (isPorjectMade ? (req.session.name ? "/home.html" : "/login.html") : "/makeProject.html"));
  res.sendFile(__dirname + (isPorjectMade ? (req.session.name ? "/home.html" : "/login.html") : "/makeProject.html"))

})


app.post('/signout', (req, res) => {
  if (!req.session.name) {
    res.redirect("/");
  } else {

    db2.prepare("delete from sessions where sid=?").run(req.session.name);
    req.session.name = ""
    res.send("/")
  }
})

app.post("/create", (req, res) => {

  // console.log(req.body);
  projectName = req.body.projectName;
  isPorjectMade = true;
  req.body.people.forEach(person => {
    fs.mkdir(`./images/${person}`, { recursive: true }, (err) => { console.log(err); })
  })
  res.send("nothing")
})
app.use(express.static(__dirname + "/"))

function train() {

  fs.readdir("./images", async (err, files) => {
    var faceDescriptors = [];

    labeledFaceDescriptors = await Promise.all(

      files.map(async label => {

        fs.readdir(`./images/${label}/`, (e, image) => {
          image.forEach(async (file) => {
            var img;
            img = await canvas.loadImage("./images/" + label + "/" + file)
            // loader.fun("./images/" + label + "/"+image)
            console.log(img);
            var x = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
            // console.log(x);
            faceDescriptors.push(x.descriptor);
            // console.log("output:");

            if (faceDescriptors.length == image.length) {
              console.log(faceDescriptors.length);
              labeledFaceDescriptors.push(new faceapi.LabeledFaceDescriptors(label, faceDescriptors))
              faceDescriptors = []

            }
          })
          // console.log("./images/" + label + "/"+image);



        })


        return new faceapi.LabeledFaceDescriptors(label, faceDescriptors)
      })
    ).catch(e => { console.log(e); })
  })

}
server.listen(3002, () => {

  console.log("Server has started !");
  fs.readdir(__dirname + '/images', (err, files) => {
    isPorjectMade = files.length > 0;
    x()
  });
  
})