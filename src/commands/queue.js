module.exports = {
  name: 'queue',
  description: 'Kuyruğu gösterir',
  aliases: ['sira', 'q'],
  
  async execute(message, args, client) {
    const serverQueue = client.queue.get(message.guild.id);
    
    if (!serverQueue || !serverQueue.songs.length) {
      return message.reply('📭 **Kuyruk boş!**');
    }

    let queueList = '📋 **Kuyruk:**\n';
    serverQueue.songs.forEach((song, i) => {
      queueList += `${i === 0 ? '▶️' : i}. ${song.substring(0, 50)}...\n`;
    });

    await message.reply(queueList);
  }
};
