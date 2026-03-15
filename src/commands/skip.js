const config = require('../../config');

module.exports = {
  name: 'skip',
  description: 'Sonraki şarkıya geçer',
  aliases: ['gec', 'next', 's'],
  cooldown: 3,
  
  async execute(message, args, client) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply(config.messages.notInVoiceChannel);

    const serverQueue = client.queue?.get(message.guild.id);
    if (!serverQueue) return message.reply(config.messages.noMusicPlaying);

    serverQueue.player.stop();
    return message.reply(config.messages.skipped);
  }
};
