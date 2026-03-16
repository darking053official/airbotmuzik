module.exports = {
  name: 'resume',
  description: 'Müziği devam ettirir',
  aliases: ['devam'],
  
  async execute(message, args, client) {
    const serverQueue = client.queue.get(message.guild.id);
    
    if (!serverQueue || !serverQueue.songs.length) {
      return message.reply('❌ **Çalan müzik yok!**');
    }

    serverQueue.player?.unpause();
    await message.reply('▶️ **Devam ediyor!**');
  }
};
