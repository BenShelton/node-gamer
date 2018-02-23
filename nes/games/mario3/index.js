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
    askForInput()
  },
  emulateSound: false
  // onAudioSample (left, right) {
  //   io.emit('audioSample', { left, right })
  // }
})

// .NES FILE
// const rom = fs.readFileSync('nes/games/mario3/mario3.nes', { encoding: 'binary' })
// nes.loadROM(rom)
// nes.frame()

// LEVEL
const level = JSON.parse(fs.readFileSync('nes/games/mario3/1-2.json'))
nes.fromJSON(level)
nes.frame()

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
    case 'save':
      button = null
      process.stdin.resume()
      process.stdout.write('Save State Name: ')
      process.stdin.once('data', saveState)
      return
    case 'read':
      button = null
      process.stdin.resume()
      process.stdout.write('Read Address (hex): ')
      process.stdin.once('data', readAddress)
      return
    case 'write':
      button = null
      process.stdin.resume()
      process.stdout.write('Write Address (hex): ')
      process.stdin.once('data', writeAddress)
      return
    default:
      button = null
  }
  nes.buttonDown(1, button)
  nes.frame()
}

function askForInput () {
  process.stdin.resume()
  process.stdout.write('Input: ')
  process.stdin.once('data', chooseButton)
}

function saveState (data) {
  const filename = data.toString().trim().toLowerCase()
  fs.writeFileSync(`nes/games/mario3/${filename}.json`, JSON.stringify(nes.toJSON()))
  console.log('State Saved!')
  askForInput()
}

function readAddress (data) {
  const address = Number('0x' + data)
  console.log(nes.cpu.load(address))
  askForInput()
}

function writeAddress (addData) {
  const address = Number('0x' + addData)
  process.stdin.resume()
  process.stdout.write('New Value (hex): ')
  process.stdin.once('data', valData => {
    const val = Number('0x' + valData)
    nes.cpu.write(address, val)
    console.log(`Address ${address} changed to ${val}`)
    askForInput()
  })
}
