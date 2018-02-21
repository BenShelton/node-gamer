const { fork } = require('child_process')
const { Matrix, NeuralNetwork, NeuroEvolution } = require('node-nn')
const NES = require('./nes')

// const ADDRESSES = [
//   0x0075, // ...Also horizontal position in levels measured in units of 8 blocks wide
//   0x0076, // Enemy Sprite horizontal positions on screen high byte
//   0x0087, // Vertical position measured in units of 8 blocks wide
//   0x0088, // Enemy Sprite vertical positions on screen high byte
//   0x0089, // ??? Possible extension of above ???
//   0x0090, // Player horizontal position...
//   0x0091, // Enemy Sprite horizontal positions on screen low byte
//   0x0092, // ??? Possible extension of above ???
//   0x0093, // ??? Possible extension of above ???
//   0x0094, // ??? Possible extension of above ???
//   0x0095, // ??? Possible extension of above ???
//   0x0096, // ??? Possible extension of above ???
//   0x0097, // ??? Possible extension of above ???
//   0x0098, // ??? Possible extension of above ???
//   0x009A, // Platform move direction index
//   0x00A2, // Player vertical position in levels
//   0x00A3, // Enemy Sprite vertical positions on screen low byte
//   0x00A4, // ??? Possible extension of above ???
//   0x00A5, // ??? Possible extension of above ???
//   0x00A6, // ??? Possible extension of above ???
//   0x00A7, // ??? Possible extension of above ???
//   0x00A8, // ??? Possible extension of above ???
//   0x00A9, // ??? Possible extension of above ???
//   0x00AA, // ??? Possible extension of above ???
//   0x00B4, // Player vertical position with 11 added...
//   0x00BD, // Player horizontal velocity (signed byte)
//   0x00BE, // Enemy Sprite horizontal velocity (signed byte)
//   0x00CF, // Player vertical velocity (signed byte)
//   0x00D0, // Enemy Sprite vertical velocity (signed byte)
//   0x00D8, // In air flag
//   0x00ED, // Current form
//   0x00EF, // Mario/Luigi status flag: 40 facing right, 00 facing left
//   0x00F5, // Controller status, new buttons pressed this frame...
//   0x00F7, // Controller status, buttons held down
//   0x03DD, // P-meter in status bar...
//   0x510, // Countdown timer for player going in/out of pipe...
//   0x511, // Countdown timer for raccoon tail waving (repeatedly pressing jump button)
//   0x515, // Countdown timer for advancing the P-meter up or down
//   0x552, // Timer that is set after player is hit...
//   0x553, // Timer for star mario
//   0x56E, // Timer that determines how long flight will last...
//   0x56F, // Ducking flag...
//   0x570, // Number of frames ducking on white block
//   0x575, // Swimming flag
//   0x577, // Indicates whether Mario currently has Kuribos boot...
//   0x578, // Change Mario form...
//   0x57B, // Indicates flight?...
//   0x584, // Underwater / not underwater selection
//   0x5F4, // Stomp counter
//   0x74D, // Horizontal subpixel position...
//   0x75F // Vertical subpixel position...
// ]

const BUTTONS = [
  'UP',
  'RIGHT',
  'DOWN',
  'LEFT',
  'A',
  'B'
]

const emulator = new NES({
  file: 'nes/1-1.json',
  fromSave: true,
  server: true
})

const template = new NeuralNetwork({
  // layerSizes: [ADDRESSES.length, 30, 6]
  layerSizes: [emulator.copyMemory().length, 50, 6]
})

const botOptions = JSON.stringify({
  file: 'nes/1-1.json',
  fromSave: true
})
const workers = [...Array(3)].map(() => fork('nes/station', [botOptions]))
let tickets = 0

const fitnessFn = bot => {
  const ticket = ++tickets
  const worker = workers[ticket % 3]
  return new Promise(resolve => {
    worker.send({ net: bot.toJSON(), id: ticket })
    worker.on('message', ({ id, fitness }) => {
      if (id === ticket) resolve(fitness)
    })
  })
}

const genFn = async meta => {
  for (const worker of workers) {
    worker.removeAllListeners('message')
  }
  emulator.load()
  emulator.sendMeta(meta)
  let staticFrames = 0
  let staticPos = 0
  while (staticFrames < 120) {
    const output = meta.best.feedForward(emulator.readMemory(emulator.copyMemory()))
    Matrix.perceptron(output).data.forEach((v, i) => {
      emulator.setButton(v[0], BUTTONS[i])
    })
    await new Promise(resolve => {
      setImmediate(() => {
        emulator.advance()
        resolve()
      })
    })
    const pos = emulator.readMemory([0x0090])[0]
    if (pos === staticPos) {
      staticFrames++
    } else {
      staticPos = pos
    }
  }
}

const botnet = new NeuroEvolution({
  size: 12,
  killRate: 0.4,
  mutationRate: 0.25,
  mutationPower: 0.1,
  template,
  fitnessFn,
  genFn,
  logStats: true
})

botnet.runGenerations(100).then(() => console.log('done!'))
