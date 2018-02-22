const NES = require('../nes')
const { Matrix, NeuralNetwork } = require('node-nn')

const BUTTONS = [
  'UP',
  'RIGHT',
  'DOWN',
  'LEFT',
  'A',
  'B'
]

const options = JSON.parse(process.argv[2])
const emulator = new NES(options)

process.on('message', ({ net, id }) => {
  const bot = NeuralNetwork.fromJSON(net)
  emulator.load()
  let staticFrames = 0
  let staticPos = 0
  while (staticFrames < 150) {
    // const output = bot.feedForward(emulator.readMemory(emulator.copyMemory()))
    const output = bot.feedForward(emulator.readSpriteData())
    Matrix.perceptron(output).data.forEach((v, i) => {
      emulator.setButton(v[0], BUTTONS[i])
    })
    emulator.advance()
    const pos = emulator.readMemory([0x0090])[0]
    if (pos === staticPos) {
      staticFrames++
    } else {
      staticPos = pos
    }
  }
  const fitnessVals = emulator.readMemory([0x0075, 0x0090])
  const fitness = (fitnessVals[0] * 255) + fitnessVals[1]
  process.send({ id, fitness })
})
