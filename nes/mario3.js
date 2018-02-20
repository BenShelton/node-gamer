const fs = require('fs')
const { NES, Controller } = require('jsnes')

const server = (req, res) => fs.createReadStream('nes/index.html').pipe(res)
const app = require('http').createServer(server)
app.listen(3000)
const io = require('socket.io')(app)

// console.log(nes.cpu.load(0x090))
let button
const nes = new NES({
  onStatusUpdate: console.log,
  onFrame (frameBuffer) {
    io.emit('frame', frameBuffer)
    // setImmediate(nes.frame)
    nes.buttonUp(1, button)
    process.stdin.resume()
    process.stdout.write('Input: ')
    process.stdin.once('data', chooseButton)
  },
  emulateSound: false
  // onAudioSample (left, right) {
  //   io.emit('audioSample', { left, right })
  // }
})

// .NES FILE
// const rom = fs.readFileSync('nes/roms/mario3.nes', { encoding: 'binary' })
// nes.loadROM(rom)
// nes.frame()

// LEVEL
const level = JSON.parse(fs.readFileSync('nes/1-1.json'))
nes.fromJSON(level)
nes.frame()

function saveState () {
  console.log(nes.toJSON().romData)
  // fs.writeFileSync('nes/1-1.json', JSON.stringify(nes.toJSON()))
}

function chooseButton (data) {
  switch (data.toString().trim().toLowerCase()) {
    case 'w':
      button = Controller.BUTTON_UP
      break
    case 'a':
      button = Controller.BUTTON_LEFT
      break
    case 's':
      button = Controller.BUTTON_DOWN
      break
    case 'd':
      button = Controller.BUTTON_RIGHT
      break
    case 'k':
      button = Controller.BUTTON_A
      break
    case 'l':
      button = Controller.BUTTON_B
      break
    case 'm':
      button = Controller.BUTTON_START
      break
    case 'n':
      button = Controller.BUTTON_SELECT
      break
    case '1':
      button = null
      saveState()
      break
    default:
      button = null
  }
  nes.buttonDown(1, button)
  nes.frame()
}
