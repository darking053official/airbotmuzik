const config = require('../../config');

module.exports = {
  name: 'stop',
  description: 'Müziği durdurur ve kanaldan çıkar',
  aliases: ['dur', 'leave', 'git'],
  cooldown: 3,
  
  async execute(message, args, client) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply(config.messages.notInVoiceChannel);

    const serverQueue = client.queue?.get(message.guild.id);
    if (!serverQueue) return message.reply(config.messages.noMusicPlaying);

    serverQueue.songs = [];
    serverQueue.player.stop();
    if (serverQueue.connection) serverQueue.connection.destroy();
    client.queue.delete(message.guild.id);
    
    return message.reply(config.messages.stopped);
  }
};
