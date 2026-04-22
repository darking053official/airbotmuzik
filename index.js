// ╔══════════════════════════════════════════════════════════════════╗
// ║                    AIRBOT MÜZİK v2.0.0                           ║
// ║              Profesyonel Jubbio Müzik Botu                       ║
// ╚══════════════════════════════════════════════════════════════════╝

const { Client, GatewayIntentBits, EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("@jubbio/core");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  AudioPlayerStatus,
  VoiceConnectionStatus
} = require("@jubbio/voice");
const { MongoClient } = require("mongodb");
const fetch = require("node-fetch");
const http = require("http");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const ffmpeg = require('ffmpeg-static');

console.log("╔══════════════════════════════════════════════════════════════════╗");
console.log("║                    AIRBOT MÜZİK BAŞLATILIYOR                     ║");
console.log("╚══════════════════════════════════════════════════════════════════╝");
console.log(`🎵 ffmpeg: ${ffmpeg}`);

// ──────────────────────────────────────────────────────────────────
// ENVIRONMENT VARIABLES
// ──────────────────────────────────────────────────────────────────
const TOKEN = process.env.BOT_TOKEN;
const MONGO_URL = process.env.MONGO_URL;
const GENIUS_KEY = process.env.GENIUS_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const COOKIES_PATH = path.join(__dirname, "cookies.txt");

if (!TOKEN) {
  console.error("❌ BOT_TOKEN bulunamadı!");
  process.exit(1);
}

// ──────────────────────────────────────────────────────────────────
// HTTP SUNUCU
// ──────────────────────────────────────────────────────────────────
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "online", bot: "AirBot Müzik", version: "2.0.0" }));
}).listen(10000, () => console.log("🌐 HTTP sunucu çalışıyor (Port: 10000)"));

// ──────────────────────────────────────────────────────────────────
// MONGODB
// ──────────────────────────────────────────────────────────────────
let db = null;
(async () => {
  if (MONGO_URL) {
    try {
      const mongo = new MongoClient(MONGO_URL);
      await mongo.connect();
      db = mongo.db("airbot_muzik");
      console.log("✅ MongoDB bağlandı!");
    } catch (e) {
      console.error("❌ MongoDB:", e.message);
    }
  } else {
    console.log("⚠️ MongoDB bağlantısı yok - bazı özellikler devre dışı");
  }
})();

// ──────────────────────────────────────────────────────────────────
// yt-dlp KURULUMU
// ──────────────────────────────────────────────────────────────────
let YTDLP = "";

const ytDlpPaths = [
  "/opt/render/.local/bin/yt-dlp",
  "/opt/render/project/src/.venv/bin/yt-dlp",
  "/opt/render/project/src/node_modules/.bin/yt-dlp",
  "/usr/local/bin/yt-dlp",
  "/usr/bin/yt-dlp",
  path.join(__dirname, "node_modules/.bin/yt-dlp"),
];

for (const p of ytDlpPaths) {
  try {
    if (p && fs.existsSync(p)) {
      YTDLP = p;
      break;
    }
  } catch (e) {}
}

if (!YTDLP) {
  try {
    YTDLP = execSync("which yt-dlp", { stdio: "pipe" }).toString().trim();
  } catch (e) {}
}

if (!YTDLP) {
  const installDir = "/opt/render/.local/bin";
  try {
    if (!fs.existsSync(installDir)) fs.mkdirSync(installDir, { recursive: true });
    execSync(`curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ${installDir}/yt-dlp`, { stdio: "pipe" });
    execSync(`chmod +x ${installDir}/yt-dlp`, { stdio: "pipe" });
    YTDLP = `${installDir}/yt-dlp`;
  } catch (e) {}
}

console.log(YTDLP && fs.existsSync(YTDLP) ? `✅ yt-dlp hazır` : `❌ yt-dlp bulunamadı!`);
const YTDLP_FINAL = YTDLP;

// ──────────────────────────────────────────────────────────────────
// JUBBIO CLIENT
// ──────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
  gatewayUrl: "wss://realtime.jubbio.com/ws/bot",
  apiUrl: "https://gateway.jubbio.com/api/v1",
});

// ──────────────────────────────────────────────────────────────────
// MÜZİK SİSTEMİ DEĞİŞKENLERİ
// ──────────────────────────────────────────────────────────────────
const queues = new Map();
const players = new Map();
const channels = new Map();
const volumeLevels = new Map();
const currentSongs = new Map();
const loopModes = new Map();
const historyQueues = new Map();
const nowPlayingMessages = new Map();

// Radyo istasyonları
const RADYO_KANALLARI = {
  "power": { name: "Power FM", url: "https://listen.powerapp.com.tr/powerfm/abr/playlist.m3u8" },
  "fenomen": { name: "Fenomen FM", url: "https://live.radyofenomen.com/fenomen/abr/playlist.m3u8" },
  "kral": { name: "Kral FM", url: "https://kralpop.80.yayin.com.tr/stream" },
  "joy": { name: "Joy FM", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/JOY_FM_SC" },
  "metro": { name: "Metro FM", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/METRO_FM_SC" },
  "slow": { name: "Slow Türk", url: "https://radyo.slowturk.com.tr/slowturk" },
  "alem": { name: "Alem FM", url: "https://turkmedya.radyotvonline.com/turkmedya/alemfm.stream/playlist.m3u8" }
};

// ──────────────────────────────────────────────────────────────────
// YARDIMCI FONKSİYONLAR
// ──────────────────────────────────────────────────────────────────
function formatSure(saniye) {
  if (!saniye) return "?";
  const saat = Math.floor(saniye / 3600);
  const dak = Math.floor((saniye % 3600) / 60);
  const san = saniye % 60;
  if (saat > 0) return `${saat}:${dak.toString().padStart(2, '0')}:${san.toString().padStart(2, '0')}`;
  return `${dak}:${san.toString().padStart(2, '0')}`;
}

function formatSayi(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// ──────────────────────────────────────────────────────────────────
// MÜZİK BUTONLARI
// ──────────────────────────────────────────────────────────────────
function createMusicButtons(loopMode = 0) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("muzik_playpause").setLabel("⏯️").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("muzik_skip").setLabel("⏭️").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("muzik_stop").setLabel("⏹️").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("muzik_queue").setLabel("📋").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("muzik_loop").setLabel(loopMode === 1 ? "🔂" : loopMode === 2 ? "🔁" : "➡️").setStyle(ButtonStyle.Secondary)
  );
  
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("muzik_volume_down").setLabel("🔉").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("muzik_volume_up").setLabel("🔊").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("muzik_shuffle").setLabel("🔀").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("muzik_clear").setLabel("🗑️").setStyle(ButtonStyle.Secondary)
  );
  
  return [row1, row2];
}

// ──────────────────────────────────────────────────────────────────
// PLAYER OLUŞTURUCU
// ──────────────────────────────────────────────────────────────────
function getPlayer(guildId) {
  if (players.has(guildId)) return players.get(guildId);

  const player = createAudioPlayer();
  players.set(guildId, player);

  player.on(AudioPlayerStatus.Idle, () => {
    const queue = queues.get(guildId) || [];
    const loopMode = loopModes.get(guildId) || 0;
    const currentSong = currentSongs.get(guildId);
    
    if (loopMode === 1 && currentSong) {
      queue.unshift(currentSong);
    } else if (loopMode === 2 && currentSong) {
      queue.push(currentSong);
    } else if (currentSong) {
      const history = historyQueues.get(guildId) || [];
      history.unshift(currentSong);
      if (history.length > 20) history.pop();
      historyQueues.set(guildId, history);
    }
    
    if (queue.length > 0) {
      queue.shift();
      queues.set(guildId, queue);
      currentSongs.delete(guildId);
      
      if (queue.length > 0 || loopMode > 0) {
        setTimeout(() => playNext(guildId), 500);
      } else {
        const ch = channels.get(guildId);
        if (ch) ch.send({ content: "🎵 **Kuyruk bitti!** Yeni şarkı ekleyebilirsiniz." }).catch(() => {});
      }
    } else {
      currentSongs.delete(guildId);
    }
  });

  player.on("error", (err) => {
    console.error(`[Player] Hata: ${err.message}`);
    const queue = queues.get(guildId) || [];
    if (queue.length > 0) {
      queue.shift();
      queues.set(guildId, queue);
      setTimeout(() => playNext(guildId), 1000);
    }
  });

  return player;
}

// ──────────────────────────────────────────────────────────────────
// SES URL'Sİ ALMA
// ──────────────────────────────────────────────────────────────────
async function getAudioUrl(query) {
  if (!YTDLP_FINAL || !fs.existsSync(YTDLP_FINAL)) {
    throw new Error("yt-dlp bulunamadı!");
  }

  const cookiesArg = fs.existsSync(COOKIES_PATH) ? `--cookies "${COOKIES_PATH}"` : "";
  const cmd = `"${YTDLP_FINAL}" ${cookiesArg} -f bestaudio --get-url --no-warnings "${query}"`;
  
  console.log(`[yt-dlp] URL alma: ${cmd}`);
  
  try {
    const audioUrl = execSync(cmd, { 
      timeout: 20000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).toString().trim();
    
    if (audioUrl && audioUrl.startsWith('http')) {
      return audioUrl;
    }
    throw new Error("Geçersiz URL");
  } catch (error) {
    const altCmd = `"${YTDLP_FINAL}" -g "${query}"`;
    const audioUrl = execSync(altCmd, { 
      timeout: 15000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).toString().trim();
    
    if (audioUrl && audioUrl.startsWith('http')) {
      return audioUrl;
    }
    throw new Error(`Ses URL'si alınamadı`);
  }
}

// ──────────────────────────────────────────────────────────────────
// YOUTUBE ARAMA
// ──────────────────────────────────────────────────────────────────
async function searchYouTube(query, limit = 5) {
  if (!YTDLP_FINAL || !fs.existsSync(YTDLP_FINAL)) {
    return [];
  }

  const cookiesArg = fs.existsSync(COOKIES_PATH) ? `--cookies "${COOKIES_PATH}"` : "";
  const searchQuery = `ytsearch${limit}:${query}`;
  const cmd = `"${YTDLP_FINAL}" ${cookiesArg} --flat-playlist --no-warnings --print "%(title)s||%(id)s||%(duration)s||%(uploader)s" "${searchQuery}"`;
  
  try {
    const output = execSync(cmd, { 
      timeout: 20000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).toString().trim();
    
    const results = output.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split('||');
        if (parts.length >= 2) {
          return {
            id: parts[1],
            title: parts[0] || 'Bilinmiyor',
            url: `https://youtube.com/watch?v=${parts[1]}`,
            duration: parseInt(parts[2]) || 0,
            channel: parts[3] || 'Bilinmiyor',
            thumbnail: `https://i.ytimg.com/vi/${parts[1]}/hqdefault.jpg`
          };
        }
        return null;
      })
      .filter(r => r && r.id);
    
    return results;
  } catch (e) {
    console.error(`[Arama] Hata: ${e.message}`);
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────
// ŞARKI BİLGİSİ ALMA
// ──────────────────────────────────────────────────────────────────
async function getSongInfo(url) {
  if (!YTDLP_FINAL || !fs.existsSync(YTDLP_FINAL)) {
    return { title: url, duration: 0, thumbnail: null };
  }

  const cookiesArg = fs.existsSync(COOKIES_PATH) ? `--cookies "${COOKIES_PATH}"` : "";
  const cmd = `"${YTDLP_FINAL}" ${cookiesArg} --no-playlist --no-warnings -j "${url}"`;
  
  try {
    const output = execSync(cmd, { 
      timeout: 10000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).toString().trim();
    
    const data = JSON.parse(output);
    return {
      title: data.title || url,
      duration: data.duration || 0,
      thumbnail: data.thumbnail || (data.id ? `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg` : null),
      channel: data.channel || data.uploader || 'Bilinmiyor',
      views: data.view_count || 0
    };
  } catch (e) {
    return { title: url, duration: 0, thumbnail: null };
  }
}

// ──────────────────────────────────────────────────────────────────
// ŞARKI ÇALMA
// ──────────────────────────────────────────────────────────────────
async function playNext(guildId) {
  const queue = queues.get(guildId) || [];
  if (!queue.length) {
    currentSongs.delete(guildId);
    return;
  }

  const song = queue[0];
  const ch = channels.get(guildId);
  
  console.log(`[Müzik] Çalınıyor: ${song.title}`);

  try {
    const audioUrl = await getAudioUrl(song.url);
    
    const resource = createAudioResource(audioUrl);
    const player = getPlayer(guildId);
    
    const conn = getVoiceConnection(guildId);
    if (!conn) {
      throw new Error("Ses bağlantısı yok!");
    }
    
    conn.subscribe(player);
    player.play(resource);
    
    const volume = volumeLevels.get(guildId) || 100;
    if (player.state.resource?.volume) {
      player.state.resource.volume.setVolumeLogarithmic(volume / 100);
    }
    
    player.once('stateChange', (oldState, newState) => {
      if (newState.status === 'playing') {
        currentSongs.set(guildId, { ...song, startedAt: Date.now() });
        
        if (ch) {
          const embed = new EmbedBuilder()
            .setTitle("🎵 Şimdi Çalıyor")
            .setDescription(`**${song.title}**`)
            .setColor(Colors.Blue)
            .addFields(
              { name: "👤 İsteyen", value: `<@${song.requestedBy}>`, inline: true },
              { name: "🔊 Ses", value: `${volume}%`, inline: true }
            )
            .setTimestamp();
          
          if (song.thumbnail) embed.setThumbnail(song.thumbnail);
          
          ch.send({ embeds: [embed], components: createMusicButtons(loopModes.get(guildId) || 0) }).catch(() => {});
        }
      }
    });
    
  } catch (err) {
    console.error(`[Müzik] HATA:`, err.message);
    if (ch) ch.send(`❌ Çalınamadı: ${err.message}`).catch(() => {});
    
    queue.shift();
    queues.set(guildId, queue);
    if (queue.length) setTimeout(() => playNext(guildId), 1000);
  }
}

// ──────────────────────────────────────────────────────────────────
// SES KANALINA BAĞLANMA
// ──────────────────────────────────────────────────────────────────
async function connectToVoice(guildId, channelId, textChannel) {
  console.log(`[Voice] Bağlanılıyor: Guild=${guildId}, Channel=${channelId}`);
  
  try {
    let conn = getVoiceConnection(guildId);
    if (conn) {
      conn.destroy();
      await new Promise(res => setTimeout(res, 500));
    }
    
    if (!client.voice || !client.voice.adapters) {
      throw new Error("Voice modülü yok!");
    }
    
    const adapter = client.voice.adapters.get(guildId);
    if (!adapter) {
      throw new Error("Voice adapter bulunamadı!");
    }
    
    conn = joinVoiceChannel({ 
      channelId: channelId, 
      guildId: guildId, 
      adapterCreator: adapter,
      selfDeaf: false,
      selfMute: false
    });
    
    const player = getPlayer(guildId);
    conn.subscribe(player);
    channels.set(guildId, textChannel);
    
    conn.on(VoiceConnectionStatus.Ready, () => {
      console.log(`[Voice] ✅ Bağlantı hazır!`);
    });
    
    conn.on(VoiceConnectionStatus.Disconnected, async () => {
      queues.delete(guildId);
      players.delete(guildId);
      channels.delete(guildId);
      volumeLevels.delete(guildId);
      currentSongs.delete(guildId);
      loopModes.delete(guildId);
    });
    
    return conn;
    
  } catch (error) {
    console.error(`[Voice] BAĞLANTI HATASI:`, error);
    throw error;
  }
}

// ──────────────────────────────────────────────────────────────────
// SLASH KOMUTLARI
// ──────────────────────────────────────────────────────────────────
const SLASH_KOMUTLAR = [
  new SlashCommandBuilder().setName("çal").setDescription("Şarkı çalar veya kuyruğa ekler").addStringOption(o => o.setName("şarkı").setDescription("Şarkı adı veya YouTube linki").setRequired(true)).toJSON(),
  new SlashCommandBuilder().setName("ara").setDescription("Şarkı arar ve seçenek sunar").addStringOption(o => o.setName("şarkı").setDescription("Aranacak şarkı").setRequired(true)).toJSON(),
  new SlashCommandBuilder().setName("dur").setDescription("Müziği durdurur ve kuyruğu temizler").toJSON(),
  new SlashCommandBuilder().setName("geç").setDescription("Sonraki şarkıya geçer").toJSON(),
  new SlashCommandBuilder().setName("duraklat").setDescription("Müziği duraklatır").toJSON(),
  new SlashCommandBuilder().setName("devam").setDescription("Duraklatılmış müziği devam ettirir").toJSON(),
  new SlashCommandBuilder().setName("sıra").setDescription("Müzik kuyruğunu gösterir").toJSON(),
  new SlashCommandBuilder().setName("karistir").setDescription("Kuyruğu karıştırır").toJSON(),
  new SlashCommandBuilder().setName("ses").setDescription("Ses seviyesini ayarlar").addIntegerOption(o => o.setName("seviye").setDescription("Ses seviyesi (0-200)").setRequired(true).setMinValue(0).setMaxValue(200)).toJSON(),
  new SlashCommandBuilder().setName("loop").setDescription("Döngü modunu ayarlar").addStringOption(o => o.setName("mod").setDescription("Döngü modu").addChoices({ name: "Kapalı", value: "off" }, { name: "Tek Şarkı", value: "one" }, { name: "Tüm Kuyruk", value: "all" }).setRequired(true)).toJSON(),
  new SlashCommandBuilder().setName("ses-kanal").setDescription("Botu ses kanalına çeker").toJSON(),
  new SlashCommandBuilder().setName("ayril").setDescription("Botu ses kanalından çıkarır").toJSON(),
  new SlashCommandBuilder().setName("simdi").setDescription("Çalan şarkıyı gösterir").toJSON(),
  new SlashCommandBuilder().setName("radyo").setDescription("Radyo kanalı açar").addStringOption(o => o.setName("kanal").setDescription("Radyo kanalı").addChoices(...Object.keys(RADYO_KANALLARI).map(k => ({ name: RADYO_KANALLARI[k].name, value: k }))).setRequired(true)).toJSON(),
  new SlashCommandBuilder().setName("yardim").setDescription("Tüm komutları listeler").toJSON(),
  new SlashCommandBuilder().setName("ping").setDescription("Bot gecikmesini gösterir").toJSON()
];

// ──────────────────────────────────────────────────────────────────
// SLASH KOMUT KAYIT
// ──────────────────────────────────────────────────────────────────
async function slashKaydet() {
  const appId = client.applicationId;
  if (!appId) return;
  
  console.log(`📝 Slash komutlar kaydediliyor...`);
  for (const komut of SLASH_KOMUTLAR) {
    try {
      await fetch(`https://gateway.jubbio.com/api/v1/applications/${appId}/commands`, {
        method: "POST",
        headers: { "Authorization": `Bot ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(komut)
      });
      console.log(`   ✅ /${komut.name}`);
    } catch (e) {
      console.log(`   ❌ /${komut.name}: ${e.message}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────
// READY EVENT
// ──────────────────────────────────────────────────────────────────
client.on("ready", async () => {
  console.log(`✅ ${client.user?.username} hazır!`);
  console.log(`📊 ${client.guilds.size} sunucuda aktif`);
  await slashKaydet();
});

// ──────────────────────────────────────────────────────────────────
// INTERACTION HANDLER
// ──────────────────────────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  try {
    // BUTON HANDLER
    if (interaction.isButton() && interaction.customId.startsWith("muzik_")) {
      const guildId = interaction.guildId;
      const player = getPlayer(guildId);
      const queue = queues.get(guildId) || [];
      const conn = getVoiceConnection(guildId);
      const memberVC = interaction.member?.voice?.channelId;
      const botVC = conn?.joinConfig?.channelId;
      
      if (!memberVC || memberVC !== botVC) {
        return interaction.reply({ content: "❌ Botla aynı ses kanalında olmalısın!", ephemeral: true });
      }
      
      const action = interaction.customId.replace("muzik_", "");
      
      switch (action) {
        case "playpause":
          if (player.state.status === AudioPlayerStatus.Playing) {
            player.pause();
            await interaction.reply({ content: "⏸️ Duraklatıldı", ephemeral: true });
          } else if (player.state.status === AudioPlayerStatus.Paused) {
            player.unpause();
            await interaction.reply({ content: "▶️ Devam ediyor", ephemeral: true });
          }
          break;
          
        case "skip":
          if (!queue.length) return interaction.reply({ content: "❌ Atlayacak şarkı yok!", ephemeral: true });
          player.stop();
          await interaction.reply({ content: "⏭️ Atlandı!", ephemeral: true });
          break;
          
        case "stop":
          player.stop();
          queues.set(guildId, []);
          currentSongs.delete(guildId);
          if (conn) conn.disconnect();
          await interaction.reply({ content: "⏹️ Müzik durduruldu!", ephemeral: true });
          break;
          
        case "queue":
          const currentSong = currentSongs.get(guildId);
          let qText = "";
          if (currentSong) qText += `**▶️ Şimdi:** ${currentSong.title}\n\n`;
          if (queue.length) {
            qText += "**📋 Kuyruk:**\n";
            queue.slice(0, 10).forEach((s, i) => { qText += `${i+1}. ${s.title}\n`; });
          }
          const qEmbed = new EmbedBuilder().setTitle("🎶 Müzik Kuyruğu").setDescription(qText || "Kuyruk boş").setColor(Colors.Blue);
          await interaction.reply({ embeds: [qEmbed], ephemeral: true });
          break;
          
        case "loop":
          let mode = (loopModes.get(guildId) || 0) + 1;
          if (mode > 2) mode = 0;
          loopModes.set(guildId, mode);
          const modeText = mode === 0 ? "❌ Kapalı" : mode === 1 ? "🔂 Tek Şarkı" : "🔁 Tüm Kuyruk";
          await interaction.reply({ content: `🔁 Döngü: **${modeText}**`, ephemeral: true });
          break;
          
        case "volume_down":
          let volDown = (volumeLevels.get(guildId) || 100) - 10;
          if (volDown < 0) volDown = 0;
          volumeLevels.set(guildId, volDown);
          if (player.state.resource?.volume) player.state.resource.volume.setVolumeLogarithmic(volDown / 100);
          await interaction.reply({ content: `🔉 Ses: **${volDown}%**`, ephemeral: true });
          break;
          
        case "volume_up":
          let volUp = (volumeLevels.get(guildId) || 100) + 10;
          if (volUp > 200) volUp = 200;
          volumeLevels.set(guildId, volUp);
          if (player.state.resource?.volume) player.state.resource.volume.setVolumeLogarithmic(volUp / 100);
          await interaction.reply({ content: `🔊 Ses: **${volUp}%**`, ephemeral: true });
          break;
          
        case "shuffle":
          if (queue.length < 2) return interaction.reply({ content: "❌ Karıştırmak için en az 2 şarkı gerekli!", ephemeral: true });
          for (let i = queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue[i], queue[j]] = [queue[j], queue[i]];
          }
          queues.set(guildId, queue);
          await interaction.reply({ content: `🔀 Kuyruk karıştırıldı! (${queue.length} şarkı)`, ephemeral: true });
          break;
          
        case "clear":
          queues.set(guildId, []);
          await interaction.reply({ content: "🗑️ Kuyruk temizlendi!", ephemeral: true });
          break;
      }
      return;
    }
    
    // SELECT MENU HANDLER
    if (interaction.isStringSelectMenu() && interaction.customId === "muzik_ara_sec") {
      const url = interaction.values[0];
      const vcId = interaction.member?.voice?.channelId;
      
      if (!vcId) return interaction.reply({ content: "❌ Önce ses kanalına girin!", ephemeral: true });
      
      await interaction.deferReply();
      
      try {
        let conn = getVoiceConnection(interaction.guildId);
        if (!conn) await connectToVoice(interaction.guildId, vcId, interaction.channel);
        
        const songInfo = await getSongInfo(url);
        const song = {
          url,
          title: songInfo.title,
          duration: songInfo.duration,
          thumbnail: songInfo.thumbnail,
          channel: songInfo.channel,
          views: songInfo.views,
          requestedBy: interaction.user.id
        };
        
        const queue = queues.get(interaction.guildId) || [];
        queue.push(song);
        queues.set(interaction.guildId, queue);
        
        const player = getPlayer(interaction.guildId);
        
        if (player.state.status === AudioPlayerStatus.Idle) {
          await playNext(interaction.guildId);
          await interaction.editReply(`▶️ Çalıyor: **${song.title}**`);
        } else {
          await interaction.editReply(`✅ Kuyruğa eklendi: **${song.title}**`);
        }
      } catch (error) {
        await interaction.editReply(`❌ Hata: ${error.message}`);
      }
      return;
    }
    
    // SLASH KOMUT HANDLER
    if (!interaction.isCommand()) return;
    
    const { commandName } = interaction;
    
// /çal
if (commandName === "çal") {
  const sorgu = interaction.options.getString("şarkı", true);
  
  // Jubbio'da ses kanalı kontrolü - DÜZELTİLDİ
  const voiceState = interaction.guild?.voiceStates?.find(v => v.userId === interaction.user.id);
  const vcId = voiceState?.channelId;
  
  if (!vcId) {
    return interaction.reply({ content: "❌ Önce bir ses kanalına girmelisin!", ephemeral: true });
  }
  
  await interaction.deferReply();
  
  try {
    let conn = getVoiceConnection(interaction.guildId);
    if (!conn) {
      await connectToVoice(interaction.guildId, vcId, interaction.channel);
    }
    
    let videoUrl = sorgu;
    let songInfo = { title: sorgu, duration: 0, thumbnail: null };
    
    if (!sorgu.startsWith("http")) {
      const results = await searchYouTube(sorgu, 1);
      if (!results.length) return interaction.editReply(`❌ Şarkı bulunamadı!`);
      videoUrl = results[0].url;
      songInfo = results[0];
    } else {
      songInfo = await getSongInfo(videoUrl);
    }
    
    const song = {
      url: videoUrl,
      title: songInfo.title,
      duration: songInfo.duration,
      thumbnail: songInfo.thumbnail,
      requestedBy: interaction.user.id
    };
    
    const queue = queues.get(interaction.guildId) || [];
    queue.push(song);
    queues.set(interaction.guildId, queue);
    
    const player = getPlayer(interaction.guildId);
    
    if (player.state.status === AudioPlayerStatus.Idle) {
      await playNext(interaction.guildId);
      await interaction.editReply(`▶️ Çalıyor: **${song.title}**`);
    } else {
      await interaction.editReply(`✅ Kuyruğa eklendi: **${song.title}** (Sıra: ${queue.length})`);
    }
  } catch (error) {
    await interaction.editReply(`❌ Hata: ${error.message}`);
  }
  return;
      }
    
    // /ara
if (commandName === "ara") {
  const sorgu = interaction.options.getString("şarkı", true);
  
  // Jubbio'da ses kanalı kontrolü için alternatif yöntem
  const voiceState = interaction.guild?.voiceStates?.find(v => v.userId === interaction.user.id);
  const vcId = voiceState?.channelId;
  
  if (!vcId) {
    return interaction.reply({ content: "❌ Önce bir ses kanalına girmelisin!", ephemeral: true });
  }
  
  await interaction.deferReply();
  
  try {
    // Bot ses kanalında değilse bağlan
    let conn = getVoiceConnection(interaction.guildId);
    if (!conn) {
      await connectToVoice(interaction.guildId, vcId, interaction.channel);
    }
    
    const results = await searchYouTube(sorgu, 5);
    if (!results.length) return interaction.editReply("❌ Sonuç bulunamadı!");
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("muzik_ara_sec")
      .setPlaceholder("Bir şarkı seçin...")
      .addOptions(results.map((r, i) => new StringSelectMenuOptionBuilder()
        .setLabel(r.title.substring(0, 100))
        .setDescription(`${r.channel} • ${formatSure(r.duration)}`)
        .setValue(r.url)
        .setEmoji(i === 0 ? "🎵" : "🎶")
      ));
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    const embed = new EmbedBuilder()
      .setTitle(`🔍 Arama Sonuçları: "${sorgu}"`)
      .setDescription(results.map((r, i) => `${i+1}. **${r.title}**\n   👤 ${r.channel} • ⏱️ ${formatSure(r.duration)}`).join("\n\n"))
      .setColor(Colors.Blue)
      .setThumbnail(results[0].thumbnail)
      .setFooter({ text: "Seçim yapmak için aşağıdaki menüyü kullanın" });
    
    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error) {
    await interaction.editReply(`❌ Hata: ${error.message}`);
  }
  return;
}
    
    // /dur
    if (commandName === "dur") {
      const player = getPlayer(interaction.guildId);
      if (player.state.status === AudioPlayerStatus.Idle) {
        return interaction.reply({ content: "❌ Çalan şarkı yok!", ephemeral: true });
      }
      
      player.stop();
      queues.set(interaction.guildId, []);
      currentSongs.delete(interaction.guildId);
      
      const conn = getVoiceConnection(interaction.guildId);
      if (conn) conn.disconnect();
      
      await interaction.reply("⏹️ Müzik durduruldu ve kuyruk temizlendi!");
      return;
    }
    
    // /geç
    if (commandName === "geç") {
      const queue = queues.get(interaction.guildId) || [];
      if (!queue.length) return interaction.reply({ content: "❌ Atlayacak şarkı yok!", ephemeral: true });
      
      const player = getPlayer(interaction.guildId);
      player.stop();
      await interaction.reply("⏭️ Şarkı atlandı!");
      return;
    }
    
    // /duraklat
    if (commandName === "duraklat") {
      const player = getPlayer(interaction.guildId);
      if (player.state.status !== AudioPlayerStatus.Playing) {
        return interaction.reply({ content: "❌ Çalan şarkı yok!", ephemeral: true });
      }
      player.pause();
      await interaction.reply("⏸️ Müzik duraklatıldı!");
      return;
    }
    
    // /devam
    if (commandName === "devam") {
      const player = getPlayer(interaction.guildId);
      if (player.state.status !== AudioPlayerStatus.Paused) {
        return interaction.reply({ content: "❌ Duraklatılmış müzik yok!", ephemeral: true });
      }
      player.unpause();
      await interaction.reply("▶️ Müzik devam ediyor!");
      return;
    }
    
    // /sıra
    if (commandName === "sıra") {
      const queue = queues.get(interaction.guildId) || [];
      const currentSong = currentSongs.get(interaction.guildId);
      
      if (!queue.length && !currentSong) {
        return interaction.reply({ content: "📭 Kuyruk boş!", ephemeral: true });
      }
      
      let description = "";
      
      if (currentSong) {
        description += `**▶️ Şimdi Çalıyor:**\n${currentSong.title} - <@${currentSong.requestedBy}>\n\n`;
      }
      
      if (queue.length) {
        description += `**📋 Kuyruk (${queue.length} şarkı):**\n`;
        queue.slice(0, 10).forEach((song, i) => {
          description += `\`${i + 1}.\` ${song.title} - <@${song.requestedBy}>\n`;
        });
        if (queue.length > 10) {
          description += `\n*...ve ${queue.length - 10} şarkı daha*`;
        }
      }
      
      const embed = new EmbedBuilder()
        .setTitle("🎶 Müzik Kuyruğu")
        .setDescription(description || "Kuyruk boş")
        .setColor(Colors.Blue);
      
      await interaction.reply({ embeds: [embed] });
      return;
    }
    
    // /karistir
    if (commandName === "karistir") {
      const queue = queues.get(interaction.guildId) || [];
      if (queue.length < 2) return interaction.reply({ content: "❌ Karıştırmak için en az 2 şarkı gerekli!", ephemeral: true });
      
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
      queues.set(interaction.guildId, queue);
      await interaction.reply(`🔀 Kuyruk karıştırıldı! (${queue.length} şarkı)`);
      return;
    }
    
    // /ses
    if (commandName === "ses") {
      const seviye = interaction.options.getInteger("seviye", true);
      volumeLevels.set(interaction.guildId, seviye);
      
      const player = getPlayer(interaction.guildId);
      if (player.state.resource?.volume) {
        player.state.resource.volume.setVolumeLogarithmic(seviye / 100);
      }
      
      await interaction.reply(`🔊 Ses seviyesi: **${seviye}%**`);
      return;
    }
    
    // /loop
    if (commandName === "loop") {
      const mod = interaction.options.getString("mod", true);
      let mode = 0;
      if (mod === "one") mode = 1;
      else if (mod === "all") mode = 2;
      
      loopModes.set(interaction.guildId, mode);
      const modeText = mode === 0 ? "❌ Kapalı" : mode === 1 ? "🔂 Tek Şarkı" : "🔁 Tüm Kuyruk";
      await interaction.reply(`🔁 Döngü modu: **${modeText}**`);
      return;
    }
    
    // /simdi
    if (commandName === "simdi") {
      const song = currentSongs.get(interaction.guildId);
      if (!song) return interaction.reply({ content: "❌ Çalan şarkı yok!", ephemeral: true });
      
      const volume = volumeLevels.get(interaction.guildId) || 100;
      
      const embed = new EmbedBuilder()
        .setTitle("🎵 Şimdi Çalıyor")
        .setDescription(`**${song.title}**`)
        .setColor(Colors.Blue)
        .addFields(
          { name: "👤 İsteyen", value: `<@${song.requestedBy}>`, inline: true },
          { name: "⏱️ Süre", value: song.duration ? formatSure(song.duration) : "Canlı", inline: true },
          { name: "🔊 Ses", value: `${volume}%`, inline: true }
        )
        .setTimestamp();
      
      if (song.thumbnail) embed.setThumbnail(song.thumbnail);
      
      await interaction.reply({ embeds: [embed] });
      return;
    }
    
    // /ses-kanal
    if (commandName === "ses-kanal") {
      const vcId = interaction.member?.voice?.channelId;
      if (!vcId) return interaction.reply({ content: "❌ Önce ses kanalına girin!", ephemeral: true });
      
      await interaction.deferReply({ ephemeral: true });
      try {
        await connectToVoice(interaction.guildId, vcId, interaction.channel);
        await interaction.editReply("✅ Ses kanalına bağlandım! `/çal <şarkı>` ile müzik başlatabilirsin.");
      } catch (error) {
        await interaction.editReply(`❌ Bağlanılamadı: ${error.message}`);
      }
      return;
    }
    
    // /ayril
    if (commandName === "ayril") {
      const conn = getVoiceConnection(interaction.guildId);
      if (!conn) return interaction.reply({ content: "❌ Bot ses kanalında değil!", ephemeral: true });
      
      if (interaction.member?.voice?.channelId !== conn.joinConfig?.channelId) {
        return interaction.reply({ content: "❌ Botla aynı ses kanalında değilsin!", ephemeral: true });
      }
      
      conn.destroy();
      queues.delete(interaction.guildId);
      players.delete(interaction.guildId);
      channels.delete(interaction.guildId);
      currentSongs.delete(interaction.guildId);
      
      await interaction.reply("👋 Ses kanalından çıkıldı!");
      return;
    }
    
    // /radyo
    if (commandName === "radyo") {
      const kanal = interaction.options.getString("kanal", true);
      const vcId = interaction.member?.voice?.channelId;
      
      if (!vcId) return interaction.reply({ content: "❌ Önce ses kanalına girin!", ephemeral: true });
      
      await interaction.deferReply();
      
      try {
        let conn = getVoiceConnection(interaction.guildId);
        if (!conn) await connectToVoice(interaction.guildId, vcId, interaction.channel);
        
        const radyo = RADYO_KANALLARI[kanal];
        const resource = createAudioResource(radyo.url);
        const player = getPlayer(interaction.guildId);
        
        player.play(resource);
        queues.set(interaction.guildId, []);
        
        const embed = new EmbedBuilder()
          .setTitle("📻 Radyo")
          .setDescription(`**${radyo.name}** yayında!`)
          .setColor(Colors.Green)
          .setFooter({ text: "🎵 Canlı yayın" });
        
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        await interaction.editReply(`❌ Radyo başlatılamadı: ${error.message}`);
      }
      return;
    }
    
    // /yardim
    if (commandName === "yardim") {
      const embed = new EmbedBuilder()
        .setTitle("🎵 AirBot Müzik - Komut Listesi")
        .setDescription("Profesyonel Jubbio Müzik Botu")
        .setColor(Colors.Blue)
        .addFields(
          { name: "▶️ Müzik Kontrol", value: "`/çal` `/ara` `/dur` `/geç` `/duraklat` `/devam`", inline: false },
          { name: "📋 Kuyruk", value: "`/sıra` `/karistir` `/simdi`", inline: false },
          { name: "🔊 Ses Kontrol", value: "`/ses` `/loop`", inline: false },
          { name: "🔌 Bağlantı", value: "`/ses-kanal` `/ayril`", inline: false },
          { name: "🎸 Diğer", value: "`/radyo` `/ping` `/yardim`", inline: false }
        )
        .setFooter({ text: "AirBot Müzik v2.0.0 • Butonlarla da kontrol edebilirsiniz!" })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      return;
    }
    
    // /ping
    if (commandName === "ping") {
      const start = Date.now();
      await interaction.reply({ content: "🏓 Ölçülüyor...", ephemeral: true });
      await interaction.editReply(`🏓 Pong! \`${Date.now() - start}ms\``);
      return;
    }
    
  } catch (error) {
    console.error("Interaction hatası:", error);
    try {
      if (interaction.deferred) await interaction.editReply("❌ Bir hata oluştu!");
      else if (!interaction.replied) await interaction.reply({ content: "❌ Bir hata oluştu!", ephemeral: true });
    } catch (e) {}
  }
});

// ──────────────────────────────────────────────────────────────────
// HATA YAKALAMA
// ──────────────────────────────────────────────────────────────────
client.on("error", (err) => console.error("❌ Client Hatası:", err.message));
process.on("unhandledRejection", (err) => console.error("❌ Rejection:", err));
process.on("uncaughtException", (err) => console.error("❌ Exception:", err.message));

// ──────────────────────────────────────────────────────────────────
// BAŞLAT
// ──────────────────────────────────────────────────────────────────
console.log("🚀 AirBot Müzik başlatılıyor...");
client.login(TOKEN);
