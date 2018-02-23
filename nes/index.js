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
      app.listen(process.env.PORT || 3000)
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

  load (file = this.file) {
    if (this.fromSave) {
      const level = JSON.parse(fs.readFileSync(file))
      this.emulator.fromJSON(level)
    } else {
      const rom = fs.readFileSync(file, { encoding: 'binary' })
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

  sendMeta (meta) {
    if (!this.io) return
    this.io.emit('meta', meta)
  }

  setButton (state, button) {
    const b = Controller[`BUTTON_${button}`]
    if (state) {
      this.emulator.buttonDown(1, b)
    } else {
      this.emulator.buttonUp(1, b)
    }
  }
}
