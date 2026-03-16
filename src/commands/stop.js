module.exports = {
  name: 'stop',
  description: 'Müziği durdurur',
  aliases: ['dur'],
  
  async execute(message, args, client) {
    const serverQueue = client.queue.get(message.guild.id);
    
    if (!serverQueue || !serverQueue.songs.length) {
      return message.reply('❌ **Çalan müzik yok!**');
    }

    serverQueue.songs = [];
    serverQueue.player?.stop();
    
    await message.reply('⏹️ **Müzik durduruldu!**');
  }
};
