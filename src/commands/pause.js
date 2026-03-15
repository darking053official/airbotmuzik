const config = require('../../config');

module.exports = {
  name: 'pause',
  description: 'Müziği duraklatır',
  aliases: ['durdur', 'bekle'],
  cooldown: 3,
  
  async execute(message, args, client) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply(config.messages.notInVoiceChannel);

    const serverQueue = client.queue?.get(message.guild.id);
    if (!serverQueue) return message.reply(config.messages.noMusicPlaying);

    serverQueue.player.pause();
    return message.reply(config.messages.paused);
  }
};
