module.exports = {
  name: 'queue',
  description: 'Kuyruktaki şarkıları gösterir',
  aliases: ['q', 'sira'],
  cooldown: 3,
  async execute(message, args, client) {
    const serverQueue = client.queue.get(message.guild.id);
    
    if (!serverQueue || serverQueue.songs.length === 0) {
      return message.reply('📭 **Kuyruk boş!**');
    }

    let queueList = '📋 **Kuyruktaki şarkılar:**\n\n';
    
    for (let i = 0; i < Math.min(serverQueue.songs.length, 10); i++) {
      const song = serverQueue.songs[i];
      const shortUrl = song.length > 40 ? song.substring(0, 40) + '...' : song;
      
      if (i === 0) {
        queueList += `▶️ **Şu an:** ${shortUrl}\n`;
      } else {
        queueList += `${i}. ${shortUrl}\n`;
      }
    }
    
    if (serverQueue.songs.length > 10) {
      queueList += `\n...ve ${serverQueue.songs.length - 10} şarkı daha.`;
    }
    
    queueList += `\n\n**Toplam:** ${serverQueue.songs.length} şarkı`;
    
    await message.reply(queueList);
  }
};
