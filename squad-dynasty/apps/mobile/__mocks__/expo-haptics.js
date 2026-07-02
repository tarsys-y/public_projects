// Mock de testes (Node): haptics é no-op fora do dispositivo.
module.exports = {
  impactAsync: async () => {},
  notificationAsync: async () => {},
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
};
