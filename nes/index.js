const fs = require('fs')
const { NES: Emulator, Controller } = require('jsnes')

const required = name => { throw new Error(`NES Constructor - ${name} is required`) }

module.exports = class NES {
  constructor ({
    file = required('File'),
    fromSave = false,
    server = false,
    manualInputs = false
  }) {
    this.file = file
    this.fromSave = fromSave
    this.io = null
    this.button = null
    this.controller = Controller
    if (server) {
      const fileSrv = (req, res) => fs.createReadStream('nes/index.html').pipe(res)
      const app = require('http').createServer(fileSrv)
      app.listen(3000)
      this.io = require('socket.io')(app)
    }
    this.emulator = new Emulator({
      onStatusUpdate: console.log,
      onFrame: frameBuffer => {
        if (this.io) this.io.volatile.emit('frame', frameBuffer)
        if (manualInputs) {
          this.emulator.buttonUp(1, this.button)
          process.stdin.resume()
          process.stdout.write('Input: ')
          process.stdin.once('data', this.chooseButton)
        }
      },
      emulateSound: false
      // onAudioSample (left, right) {
      //   io.emit('audioSample', { left, right })
      // }
    })
  }

  load () {
    if (this.fromSave) {
      const level = JSON.parse(fs.readFileSync(this.file))
      this.emulator.fromJSON(level)
    } else {
      const rom = fs.readFileSync(this.file, { encoding: 'binary' })
      this.emulator.loadROM(rom)
    }
  }

  advance () {
    this.emulator.frame()
  }

  readMemory (addresses) {
    return addresses.map(a => this.emulator.cpu.load(a))
  }

  copyMemory () {
    const mem = this.emulator.cpu.mem
    return [].concat(
      mem.slice(0, 0x00F7),
      mem.slice(0x200, 0x800),
      mem.slice(0x6000, 0x794F)
    )
  }

  readSpriteData () {
    return this.emulator.ppu.spriteMem.slice()
  }

  chooseButton (data) {
    switch (data.toString().trim().toLowerCase()) {
      case 'w':
        this.button = Controller.BUTTON_UP
        break
      case 'a':
        this.button = Controller.BUTTON_LEFT
        break
      case 's':
        this.button = Controller.BUTTON_DOWN
        break
      case 'd':
        this.button = Controller.BUTTON_RIGHT
        break
      case 'k':
        this.button = Controller.BUTTON_A
        break
      case 'l':
        this.button = Controller.BUTTON_B
        break
      case 'm':
        this.button = Controller.BUTTON_START
        break
      case 'n':
        this.button = Controller.BUTTON_SELECT
        break
      case '1':
        this.button = null
        this.saveState()
        break
      default:
        this.button = null
    }
    this.emulator.buttonDown(1, this.button)
    this.emulator.frame()
  }

  setButton (state, button) {
    const b = Controller[`BUTTON_${button}`]
    if (state) {
      this.emulator.buttonDown(1, b)
    } else {
      this.emulator.buttonUp(1, b)
    }
  }

  saveState () {
    fs.writeFileSync('nes/1-1.json', JSON.stringify(this.emulator.toJSON()))
  }

  sendMeta (meta) {
    if (!this.io) return
    this.io.emit('meta', meta)
  }
}
