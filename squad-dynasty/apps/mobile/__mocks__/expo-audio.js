// Mock de testes (Node): players de áudio são no-ops.
module.exports = {
  createAudioPlayer: () => ({ play: () => {}, seekTo: () => {}, remove: () => {} }),
};
