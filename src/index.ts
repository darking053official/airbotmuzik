import http from 'http';
import { execSync } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { Client, GatewayIntentBits, EmbedBuilder, Colors } from '@jubbio/core';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResourceFromUrl,
  probeAudioInfo,
  getVoiceConnection,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} from '@jubbio/voice';
import { registerCommands } from './commands/commands';
import { GuildQueue, QueueTrack } from './commands/queue';

// ffmpeg path'ini ayarla
process.env.FFMPEG_PATH = ffmpegStatic ?? 'ffmpeg';

// yt-dlp binary'sini indir (ilk çalıştırmada)
try {
  execSync('yt-dlp --version', { stdio: 'ignore' });
} catch {
  console.log('⬇️ yt-dlp indiriliyor...');
  execSync('npx yt-dlp-wrap download', { stdio: 'inherit' });
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

const queues = new Map<string, GuildQueue>();

function getQueue(guildId: string): GuildQueue {
  if (!queues.has(guildId)) {
    queues.set(guildId, new GuildQueue());
  }
  return queues.get(guildId)!;
}

async function playNext(guildId: string) {
  const queue = getQueue(guildId);
  const track = queue.next();

  if (!track) {
    queue.playing = false;
    const connection = getVoiceConnection(guildId);
    if (connection) {
      setTimeout(() => {
        if (!queue.playing) {
          connection.destroy();
          queues.delete(guildId);
        }
      }, 30000);
    }
    return;
  }

  const player = queue.player!;
  const resource = createAudioResourceFromUrl(track.url);
  player.play(resource);
  queue.playing = true;

  player.once(AudioPlayerStatus.Idle, () => {
    playNext(guildId);
  });

  if (queue.textChannelSend) {
    const embed = buildNowPlayingEmbed(track);
    queue.textChannelSend(embed).catch(() => {});
  }
}

function buildNowPlayingEmbed(track: QueueTrack): object {
  const minutes = Math.floor(track.duration / 60);
  const seconds = track.duration % 60;
  const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const embed = new EmbedBuilder()
    .setTitle('🎵 Şu an çalıyor')
    .setDescription(`**${track.title}**`)
    .setColor(Colors.Blue)
    .addFields(
      { name: '⏱ Süre', value: durationStr, inline: true },
      { name: '👤 Ekleyen', value: track.requestedBy, inline: true }
    )
    .setTimestamp();

  if (track.thumbnail) embed.setThumbnail(track.thumbnail);

  return { embeds: [embed] };
}

client.on('ready', async () => {
  console.log(`✅ ${client.user?.username} hazır!`);
  await registerCommands(client);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const guildId: string | undefined = interaction.guildId;
  if (!guildId) return;

  // --- /play ---
  if (interaction.commandName === 'play') {
    const url: string = interaction.options.getString('url', true);
    const voiceChannelId: string | undefined = interaction.member?.voice?.channelId;

    if (!voiceChannelId) {
      return interaction.reply({ content: '❌ Önce bir ses kanalına gir!', ephemeral: true });
    }

    await interaction.deferReply();

    try {
      const info = await probeAudioInfo(url);
      const queue = getQueue(guildId);

      let connection = getVoiceConnection(guildId);
      if (!connection) {
        const adapter = client.voice.adapters.get(guildId);
        if (!adapter) throw new Error('Voice adapter bulunamadı.');

        connection = joinVoiceChannel({
          channelId: voiceChannelId,
          guildId,
          adapterCreator: adapter,
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
          queues.delete(guildId);
        });

        const player = createAudioPlayer();
        queue.player = player;
        connection.subscribe(player);
      }

      if (!queue.player) {
        const player = createAudioPlayer();
        queue.player = player;
        connection!.subscribe(player);
      }

      const track: QueueTrack = {
        title: info.title,
        url: info.url,
        duration: info.duration,
        thumbnail: info.thumbnail,
        requestedBy: interaction.member?.user?.username ?? 'Bilinmiyor',
      };

      queue.textChannelSend = (payload: object) => interaction.channel?.send(payload);

      if (!queue.playing) {
        queue.tracks.push(track);
        await playNext(guildId);

        const mins = Math.floor(info.duration / 60);
        const secs = info.duration % 60;
        const dur = `${mins}:${secs.toString().padStart(2, '0')}`;

        const embed = new EmbedBuilder()
          .setTitle('🎵 Şu an çalıyor')
          .setDescription(`**${info.title}**`)
          .setColor(Colors.Green)
          .addFields(
            { name: '⏱ Süre', value: dur, inline: true },
            { name: '👤 Ekleyen', value: track.requestedBy, inline: true }
          )
          .setTimestamp();

        if (info.thumbnail) embed.setThumbnail(info.thumbnail);
        await interaction.editReply({ embeds: [embed] });
      } else {
        queue.tracks.push(track);

        const embed = new EmbedBuilder()
          .setTitle('📋 Kuyruğa Eklendi')
          .setDescription(`**${info.title}**`)
          .setColor(Colors.Yellow)
          .addFields({ name: '📍 Sıra', value: `${queue.tracks.length}. sırada`, inline: true })
          .setTimestamp();

        if (info.thumbnail) embed.setThumbnail(info.thumbnail);
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (error: any) {
      await interaction.editReply(`❌ Hata: ${error.message}`);
    }
  }

  // --- /skip ---
  else if (interaction.commandName === 'skip') {
    const queue = getQueue(guildId);
    if (!queue.playing) {
      return interaction.reply({ content: '❌ Şu an bir şey çalmıyor.', ephemeral: true });
    }
    queue.player?.stop();
    await interaction.reply('⏭ Atlandı!');
  }

  // --- /stop ---
  else if (interaction.commandName === 'stop') {
    const queue = getQueue(guildId);
    queue.tracks = [];
    queue.currentIndex = 0;
    queue.playing = false;
    queue.player?.stop();
    getVoiceConnection(guildId)?.destroy();
    queues.delete(guildId);
    await interaction.reply('⏹ Müzik durduruldu ve kanaldan ayrıldım.');
  }

  // --- /pause ---
  else if (interaction.commandName === 'pause') {
    const queue = getQueue(guildId);
    if (!queue.playing) {
      return interaction.reply({ content: '❌ Şu an bir şey çalmıyor.', ephemeral: true });
    }
    queue.player?.pause();
    await interaction.reply('⏸ Duraklatıldı.');
  }

  // --- /resume ---
  else if (interaction.commandName === 'resume') {
    const queue = getQueue(guildId);
    queue.player?.unpause();
    await interaction.reply('▶️ Devam ediyor.');
  }

  // --- /queue ---
  else if (interaction.commandName === 'queue') {
    const queue = getQueue(guildId);
    if (queue.tracks.length === 0) {
      return interaction.reply({ content: '📋 Kuyruk boş.', ephemeral: true });
    }

    const trackList = queue.tracks
      .map((t: QueueTrack, i: number) => {
        const mins = Math.floor(t.duration / 60);
        const secs = t.duration % 60;
        const dur = `${mins}:${secs.toString().padStart(2, '0')}`;
        const arrow = i === queue.currentIndex - 1 ? '▶️ ' : `${i + 1}. `;
        return `${arrow}**${t.title}** \`${dur}\` - ${t.requestedBy}`;
      })
      .slice(0, 10)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📋 Müzik Kuyruğu')
      .setDescription(trackList)
      .setColor(Colors.Purple)
      .setFooter({ text: `Toplam ${queue.tracks.length} şarkı` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // --- /nowplaying ---
  else if (interaction.commandName === 'nowplaying') {
    const queue = getQueue(guildId);
    const current = queue.current();
    if (!current) {
      return interaction.reply({ content: '❌ Şu an bir şey çalmıyor.', ephemeral: true });
    }
    await interaction.reply(buildNowPlayingEmbed(current));
  }
});

client.login(process.env.BOT_TOKEN!);

// Render free plan keep-alive
const PORT = process.env.PORT ?? 3000;
http.createServer((_, res) => {
  res.writeHead(200);
  res.end('Bot çalışıyor!');
}).listen(PORT, () => {
  console.log(`🌐 HTTP server ayakta: ${PORT}`);
});
