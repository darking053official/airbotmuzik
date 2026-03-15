module.exports = {
  name: 'skip',
  description: 'Sonraki şarkıya geçer',
  aliases: ['gec', 'next'],
  
  async execute(message, args, client) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('❌ **Önce bir ses kanalına girmelisin!**');
    }

    // DJ rolü kontrolü
    const djRoleId = client.djRoles?.get(message.guild.id);
    if (djRoleId) {
      const hasDjRole = message.member.roles.cache.has(djRoleId);
      const isAdmin = message.member.permissions.has('ADMINISTRATOR');
      
      if (!hasDjRole && !isAdmin) {
        const djRole = message.guild.roles.cache.get(djRoleId);
        return message.reply(`❌ **Bu komutu sadece ${djRole ? djRole.name : 'DJ'} rolü olanlar kullanabilir!**`);
      }
    }

    const serverQueue = client.queue?.get(message.guild.id);
    if (!serverQueue || serverQueue.songs.length === 0) {
      return message.reply('❌ **Çalan müzik yok!**');
    }

    serverQueue.player.stop();
    return message.reply('⏭️ **Sonraki şarkıya geçiliyor...**');
  }
};
