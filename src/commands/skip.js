const config = require('../config');

module.exports = {
  name: 'skip',
  description: 'Sonraki şarkıya geçer',
  aliases: ['gec', 'next', 's'],
  cooldown: 3,
  
  async execute(message, args, client) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply(config.messages.notInVoiceChannel);
    }

    // DJ rolü kontrolü
    const djRoleId = client.djRoles?.get(message.guild.id);
    if (config.djRole.enabled && config.djRole.requiredFor.includes('skip') && djRoleId) {
      if (!message.member.roles.cache.has(djRoleId) && !message.member.permissions.has('ADMINISTRATOR')) {
        return message.reply(config.messages.needDjRole);
      }
    }

    const serverQueue = client.queue?.get(message.guild.id);
    if (!serverQueue || serverQueue.songs.length === 0) {
      return message.reply(config.messages.noMusicPlaying);
    }

    serverQueue.player.stop();
    return message.reply(config.messages.skipped);
  }
};
