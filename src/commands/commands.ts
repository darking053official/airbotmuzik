import { SlashCommandBuilder } from '@jubbio/core';

const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Bir URL\'den müzik çal')
    .addStringOption((opt) =>
      opt.setName('url').setDescription('YouTube veya direkt ses URL\'si').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Mevcut şarkıyı atla'),

  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Müziği durdur ve kanaldan ayrıl'),

  new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Müziği duraklat'),

  new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Duraklatılmış müziği devam ettir'),

  new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Müzik kuyruğunu göster'),

  new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Şu an çalan şarkıyı göster'),
];

export async function registerCommands(client: any) {
  try {
    console.log('🔄 Slash komutları kaydediliyor...');

    const guilds = client.guilds.cache;

    for (const [guildId, guild] of guilds) {
      await (guild as any).commands.set(commands.map((c: any) => c.toJSON()));
      console.log(`✅ ${(guild as any).name} sunucusuna komutlar kaydedildi.`);
    }

    console.log(`✅ Toplam ${commands.length} komut kaydedildi.`);
  } catch (error) {
    console.error('❌ Komut kaydı başarısız:', error);
  }
}
