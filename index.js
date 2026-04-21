// ╔══════════════════════════════════════════════════════════════════╗
// ║                    AIRBOT MÜZİK v2.0.0                           ║
// ║              Full Özellikli Jubbio Müzik Botu                    ║
// ║                                                                  ║
// ║  ▶️ /çal       - Şarkı çalar / kuyruğa ekler                     ║
// ║  ⏸️ /dur       - Müziği durdurur                                 ║
// ║  ⏭️ /geç       - Sonraki şarkıya geçer                           ║
// ║  ⏮️ /geri      - Önceki şarkıya döner                            ║
// ║  📋 /sıra      - Kuyruğu gösterir                                ║
// ║  🔀 /karistir  - Kuyruğu karıştırır                              ║
// ║  🔁 /loop      - Döngü modunu ayarlar                            ║
// ║  🔇 /ses       - Ses seviyesini ayarlar                          ║
// ║  ⏹️ /bitir     - Müziği bitirir ve çıkar                         ║
// ║  🔍 /ara       - Şarkı arar ve seçenek sunar                     ║
// ║  🎤 /simdi     - Çalan şarkıyı gösterir                          ║
// ║  ⏱️ /atla       - Belirtilen saniyeye atlar                      ║
// ║  📊 /kuyruk-temizle - Kuyruğu temizler                           ║
// ║  🎵 /calma-listesi - Çalma listesi oluştur                       ║
// ║  💾 /kaydet    - Kuyruğu playlist olarak kaydeder                ║
// ║  📂 /yukle     - Kaydedilmiş playlisti yükler                    ║
// ║  ❤️ /favori    - Şarkıyı favorilere ekler                        ║
// ║  ⭐ /favoriler - Favori listesini gösterir                       ║
// ║  🎧 /ses-kanal - Botu ses kanalına çeker                         ║
// ║  👋 /ayril     - Botu ses kanalından çıkarır                     ║
// ║  ⏯️ /devam     - Duraklatılmış müziği devam ettirir              ║
// ║  ⏸️ /duraklat  - Müziği duraklatır                               ║
// ║  📈 /lyrics    - Şarkı sözlerini gösterir                        ║
// ║  🎸 /oneri     - Müzik önerisi yapar                             ║
// ║  🌐 /radyo     - Radyo kanalı açar                               ║
// ║  🔊 /bass      - Bass seviyesini ayarlar                         ║
// ║  🎛️ /filtre    - Ses filtresi uygular                           ║
// ║  📜 /gecmis    - Çalınan şarkı geçmişini gösterir                ║
// ║  ℹ️ /yardim    - Tüm komutları listeler                          ║
// ║  🎮 Butonlar   - Tam etkileşimli müzik paneli                    ║
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
const { execSync, spawn } = require("child_process");
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
  res.end(JSON.stringify({ 
    status: "online", 
    bot: "AirBot Müzik", 
    version: "2.0.0",
    features: ["YouTube", "Kuyruk", "Loop", "Bass", "Filtre", "Playlist", "Favoriler", "Radyo", "Lyrics"]
  }));
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
      
      await db.collection("favoriler").createIndex({ guildId: 1, userId: 1 });
      await db.collection("playlistler").createIndex({ guildId: 1, userId: 1, name: 1 });
      await db.collection("gecmis").createIndex({ guildId: 1, userId: 1 });
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
const bassLevels = new Map();
const currentSongs = new Map();
const loopModes = new Map();
const filters = new Map();
const historyQueues = new Map();
const radioStations = new Map();
const nowPlayingMessages = new Map();

// Radyo istasyonları
const RADYO_KANALLARI = {
  "power": { name: "Power FM", url: "https://listen.powerapp.com.tr/powerfm/abr/playlist.m3u8" },
  "fenomen": { name: "Fenomen FM", url: "https://live.radyofenomen.com/fenomen/abr/playlist.m3u8" },
  "kral": { name: "Kral FM", url: "https://kralpop.80.yayin.com.tr/stream" },
  "joy": { name: "Joy FM", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/JOY_FM_SC" },
  "metro": { name: "Metro FM", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/METRO_FM_SC" },
  "slow": { name: "Slow Türk", url: "https://radyo.slowturk.com.tr/slowturk" },
  "alem": { name: "Alem FM", url: "https://turkmedya.radyotvonline.com/turkmedya/alemfm.stream/playlist.m3u8" },
  "numberone": { name: "Number One FM", url: "https://n10101m.mediatriple.net/videoonlylive/mtkgeuihrlfwlive/broadcast_5e8f1177d2fa2.smil/playlist.m3u8" }
};

// Ses filtreleri
const FILTRELER = {
  "bass": "bass=g=20",
  "nightcore": "asetrate=48000*1.25,aresample=48000",
  "vaporwave": "asetrate=48000*0.8,aresample=48000",
  "8d": "apulsator=hz=0.08",
  "echo": "aecho=0.8:0.9:1000:0.3",
  "chorus": "chorus=0.5:0.9:50:0.4:0.25:2",
  "tremolo": "tremolo=f=5:d=0.5",
  "vibrato": "vibrato=f=5:d=0.5",
  "normal": "null"
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

function getProgressBar(current, total, size = 15) {
  const progress = Math.round((current / total) * size);
  return '▬'.repeat(progress) + '🔘' + '▬'.repeat(size - progress);
}

// ──────────────────────────────────────────────────────────────────
// PLAYER OLUŞTURUCU
// ──────────────────────────────────────────────────────────────────
// Player oluşturucu - JUBBIO UYUMLU
function getPlayer(guildId) {
  if (players.has(guildId)) return players.get(guildId);

  // Jubbio'da createAudioPlayer parametresiz çalışır
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
// MÜZİK BUTONLARI
// ──────────────────────────────────────────────────────────────────
function createMusicButtons(isPlaying = true, loopMode = 0) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("muzik_playpause").setLabel(isPlaying ? "⏸️" : "▶️").setStyle(isPlaying ? ButtonStyle.Primary : ButtonStyle.Success),
    new ButtonBuilder().setCustomId("muzik_skip").setLabel("⏭️").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("muzik_stop").setLabel("⏹️").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("muzik_queue").setLabel("📋").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("muzik_loop").setLabel(loopMode === 1 ? "🔂" : loopMode === 2 ? "🔁" : "➡️").setStyle(ButtonStyle.Secondary)
  );
  
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("muzik_volume_down").setLabel("🔉").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("muzik_volume_up").setLabel("🔊").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("muzik_bass").setLabel("🎛️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("muzik_favorite").setLabel("❤️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("muzik_lyrics").setLabel("📝").setStyle(ButtonStyle.Secondary)
  );
  
  return [row1, row2];
}

// ──────────────────────────────────────────────────────────────────
// SES URL'Sİ ALMA
// ──────────────────────────────────────────────────────────────────
// SES URL'Sİ ALMA - TIMEOUT DÜZELTİLMİŞ
async function getAudioUrl(query, options = {}) {
  if (!YTDLP_FINAL || !fs.existsSync(YTDLP_FINAL)) {
    throw new Error("yt-dlp bulunamadı!");
  }

  const cookiesArg = fs.existsSync(COOKIES_PATH) ? `--cookies "${COOKIES_PATH}"` : "";
  
  // Daha hızlı format
  const cmd = `"${YTDLP_FINAL}" --socket-timeout 10 --no-check-certificate ${cookiesArg} -f bestaudio -g "${query}"`;
  
  console.log(`[yt-dlp] Komut: ${cmd}`);
  
  try {
    // TIMEOUT'U 15 SANİYEYE DÜŞÜR
    const audioUrl = execSync(cmd, { 
      timeout: 15000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).toString().trim();
    
    if (!audioUrl || !audioUrl.startsWith('http')) {
      throw new Error(`Geçersiz URL`);
    }
    
    console.log(`[yt-dlp] URL alındı: ${audioUrl.substring(0, 80)}...`);
    return audioUrl;
    
  } catch (error) {
    console.error(`[yt-dlp] Hata: ${error.message}`);
    
    // YEDEK KOMUT - DAHA BASİT
    try {
      const altCmd = `"${YTDLP_FINAL}" --no-playlist -g "${query}"`;
      const audioUrl = execSync(altCmd, { 
        timeout: 10000,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).toString().trim();
      
      if (audioUrl && audioUrl.startsWith('http')) {
        return audioUrl;
      }
    } catch (e) {}
    
    throw new Error("Ses URL'si alınamadı");
  }
                }

// ──────────────────────────────────────────────────────────────────
// YOUTUBE ARAMA
// ──────────────────────────────────────────────────────────────────
// YOUTUBE ARAMA - TIMEOUT DÜZELTİLMİŞ
async function searchYouTube(query, limit = 5) {
  if (!YTDLP_FINAL || !fs.existsSync(YTDLP_FINAL)) {
    throw new Error("yt-dlp bulunamadı!");
  }

  const cookiesArg = fs.existsSync(COOKIES_PATH) ? `--cookies "${COOKIES_PATH}"` : "";
  const searchQuery = `ytsearch${limit}:${query}`;
  const cmd = `"${YTDLP_FINAL}" ${cookiesArg} --no-playlist --no-warnings -j "${searchQuery}"`;
  
  console.log(`[yt-dlp] Arama: ${cmd}`);
  
  try {
    const output = execSync(cmd, { 
      timeout: 15000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).toString().trim();
    
    const results = output.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try { return JSON.parse(line); } catch (e) { return null; }
      })
      .filter(r => r && r.id);
    
    return results.map(r => ({
      id: r.id,
      title: r.title || 'Bilinmiyor',
      url: r.webpage_url || `https://youtube.com/watch?v=${r.id}`,
      duration: r.duration || 0,
      thumbnail: r.thumbnail || `https://i.ytimg.com/vi/${r.id}/hqdefault.jpg`,
      channel: r.channel || r.uploader || 'Bilinmiyor',
      views: r.view_count || 0
    }));
    
  } catch (error) {
    console.error(`[yt-dlp] Arama hatası: ${error.message}`);
    throw new Error("Arama başarısız oldu");
  }
      }

// ──────────────────────────────────────────────────────────────────
// ŞARKI BİLGİSİ ALMA
// ──────────────────────────────────────────────────────────────────
// ŞARKI BİLGİSİ ALMA - TIMEOUT DÜZELTİLMİŞ
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
    console.error(`[yt-dlp] Bilgi hatası: ${e.message}`);
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
    
    const filter = filters.get(guildId);
    let resource;
    
    if (filter && filter !== 'normal') {
      const filterCmd = `"${ffmpeg}" -i "${audioUrl}" -af "${FILTRELER[filter]}" -f mp3 pipe:1`;
      const ffmpegProcess = spawn(ffmpeg, ['-i', audioUrl, '-af', FILTRELER[filter], '-f', 'mp3', 'pipe:1']);
      resource = createAudioResource(ffmpegProcess.stdout, { inlineVolume: true });
    } else {
      resource = createAudioResource(audioUrl, { inlineVolume: true });
    }
    
    const player = getPlayer(guildId);
    
    player.once('playing', () => {
      currentSongs.set(guildId, { ...song, startedAt: Date.now() });
      updateNowPlaying(guildId);
    });
    
    player.play(resource);
    
    const volume = volumeLevels.get(guildId) || 100;
    setTimeout(() => {
      if (player.state.resource?.volume) {
        player.state.resource.volume.setVolumeLogarithmic(volume / 100);
      }
    }, 200);
    
    if (ch) {
      await updateNowPlayingMessage(guildId, song);
    }
    
  } catch (err) {
    console.error(`[Müzik] HATA:`, err.message);
    if (ch) ch.send(`❌ Çalınamadı: ${err.message.substring(0, 100)}`).catch(() => {});
    queue.shift();
    queues.set(guildId, queue);
    if (queue.length) setTimeout(() => playNext(guildId), 1000);
  }
}

// ──────────────────────────────────────────────────────────────────
// NOW PLAYING MESAJI GÜNCELLEME
// ──────────────────────────────────────────────────────────────────
async function updateNowPlayingMessage(guildId, song) {
  const ch = channels.get(guildId);
  if (!ch) return;
  
  const queue = queues.get(guildId) || [];
  const volume = volumeLevels.get(guildId) || 100;
  const loopMode = loopModes.get(guildId) || 0;
  const filter = filters.get(guildId) || 'normal';
  
  const embed = new EmbedBuilder()
    .setTitle("🎵 Şimdi Çalıyor")
    .setDescription(`**[${song.title}](${song.url})**`)
    .setColor(Colors.Blue)
    .addFields(
      { name: "👤 İsteyen", value: `<@${song.requestedBy}>`, inline: true },
      { name: "⏱️ Süre", value: song.duration ? formatSure(song.duration) : "Canlı", inline: true },
      { name: "🔊 Ses", value: `${volume}%`, inline: true },
      { name: "📋 Kuyruk", value: `${queue.length} şarkı`, inline: true },
      { name: "🔁 Döngü", value: loopMode === 1 ? "🔂 Tek" : loopMode === 2 ? "🔁 Hepsi" : "❌ Kapalı", inline: true },
      { name: "🎛️ Filtre", value: filter, inline: true }
    )
    .setFooter({ text: `AirBot Müzik • ${song.channel ? song.channel + ' • ' : ''}${formatSayi(song.views || 0)} görüntülenme` })
    .setTimestamp();
  
  if (song.thumbnail) embed.setThumbnail(song.thumbnail);
  
  const buttons = createMusicButtons(true, loopMode);
  
  try {
    const oldMsg = nowPlayingMessages.get(guildId);
    if (oldMsg) await oldMsg.delete().catch(() => {});
    
    const msg = await ch.send({ embeds: [embed], components: buttons });
    nowPlayingMessages.set(guildId, msg);
  } catch (e) {}
}

async function updateNowPlaying(guildId) {
  const song = currentSongs.get(guildId);
  if (song) await updateNowPlayingMessage(guildId, song);
}

// ──────────────────────────────────────────────────────────────────
// SES KANALINA BAĞLANMA
// ──────────────────────────────────────────────────────────────────
async function connectToVoice(guildId, channelId, textChannel) {
  let conn = getVoiceConnection(guildId);
  if (conn) conn.destroy();
  
  if (!client.voice?.adapters) throw new Error("Voice modülü başlatılamadı!");
  
  const adapter = client.voice.adapters.get(guildId);
  if (!adapter) throw new Error("Voice adapter bulunamadı!");
  
  conn = joinVoiceChannel({ 
    channelId, 
    guildId, 
    adapterCreator: adapter,
    selfDeaf: false,
    selfMute: false
  });
  
  conn.subscribe(getPlayer(guildId));
  channels.set(guildId, textChannel);
  
  conn.on(VoiceConnectionStatus.Disconnected, () => {
    queues.delete(guildId);
    players.delete(guildId);
    channels.delete(guildId);
    volumeLevels.delete(guildId);
    bassLevels.delete(guildId);
    currentSongs.delete(guildId);
    loopModes.delete(guildId);
    filters.delete(guildId);
    nowPlayingMessages.delete(guildId);
  });
  
  return conn;
}

// ──────────────────────────────────────────────────────────────────
// LYRICS ALMA
// ──────────────────────────────────────────────────────────────────
async function getLyrics(query) {
  if (!GENIUS_KEY) return null;
  
  try {
    const searchRes = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(query)}`, {
      headers: { 'Authorization': `Bearer ${GENIUS_KEY}` }
    });
    const searchData = await searchRes.json();
    if (!searchData.response?.hits?.length) return null;
    
    const songUrl = searchData.response.hits[0].result.url;
    return { url: songUrl, title: searchData.response.hits[0].result.full_title };
  } catch (e) {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────
// GEMINI ÖNERİ
// ──────────────────────────────────────────────────────────────────
async function getMusicRecommendation(tur) {
  if (!GEMINI_KEY) return null;
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: `${tur} türünde 5 popüler şarkı öner. Sadece "Şarkı Adı - Sanatçı" formatında yaz.` }] }] })
    });
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────
// SLASH KOMUTLARI
// ──────────────────────────────────────────────────────────────────
const SLASH_KOMUTLAR = [
  // Temel Müzik Komutları
  new SlashCommandBuilder().setName("çal").setDescription("Şarkı çalar veya kuyruğa ekler").addStringOption(o => o.setName("şarkı").setDescription("Şarkı adı veya YouTube linki").setRequired(true)).toJSON(),
  new SlashCommandBuilder().setName("ara").setDescription("Şarkı arar ve seçenek sunar").addStringOption(o => o.setName("şarkı").setDescription("Aranacak şarkı").setRequired(true)).toJSON(),
  new SlashCommandBuilder().setName("dur").setDescription("Müziği durdurur ve kuyruğu temizler").toJSON(),
  new SlashCommandBuilder().setName("geç").setDescription("Sonraki şarkıya geçer").toJSON(),
  new SlashCommandBuilder().setName("geri").setDescription("Önceki şarkıya döner").toJSON(),
  new SlashCommandBuilder().setName("duraklat").setDescription("Müziği duraklatır").toJSON(),
  new SlashCommandBuilder().setName("devam").setDescription("Duraklatılmış müziği devam ettirir").toJSON(),
  
  // Kuyruk Komutları
  new SlashCommandBuilder().setName("sıra").setDescription("Müzik kuyruğunu gösterir").addIntegerOption(o => o.setName("sayfa").setDescription("Sayfa numarası").setMinValue(1)).toJSON(),
  new SlashCommandBuilder().setName("karistir").setDescription("Kuyruğu karıştırır").toJSON(),
  new SlashCommandBuilder().setName("kuyruk-temizle").setDescription("Kuyruğu temizler").toJSON(),
  new SlashCommandBuilder().setName("gecmis").setDescription("Çalınan şarkı geçmişini gösterir").toJSON(),
  new SlashCommandBuilder().setName("simdi").setDescription("Çalan şarkıyı gösterir").toJSON(),
  
  // Ses Komutları
  new SlashCommandBuilder().setName("ses").setDescription("Ses seviyesini ayarlar").addIntegerOption(o => o.setName("seviye").setDescription("Ses seviyesi (0-200)").setRequired(true).setMinValue(0).setMaxValue(200)).toJSON(),
  new SlashCommandBuilder().setName("bass").setDescription("Bass seviyesini ayarlar").addStringOption(o => o.setName("seviye").setDescription("Bass seviyesi").addChoices({ name: "Kapalı", value: "off" }, { name: "Düşük", value: "low" }, { name: "Orta", value: "medium" }, { name: "Yüksek", value: "high" }).setRequired(true)).toJSON(),
  new SlashCommandBuilder().setName("filtre").setDescription("Ses filtresi uygular").addStringOption(o => o.setName("filtre").setDescription("Filtre türü").addChoices({ name: "Normal", value: "normal" }, { name: "Bass Boost", value: "bass" }, { name: "Nightcore", value: "nightcore" }, { name: "Vaporwave", value: "vaporwave" }, { name: "8D Audio", value: "8d" }, { name: "Echo", value: "echo" }).setRequired(true)).toJSON(),
  
  // Döngü Komutları
  new SlashCommandBuilder().setName("loop").setDescription("Döngü modunu ayarlar").addStringOption(o => o.setName("mod").setDescription("Döngü modu").addChoices({ name: "Kapalı", value: "off" }, { name: "Tek Şarkı", value: "one" }, { name: "Tüm Kuyruk", value: "all" }).setRequired(true)).toJSON(),
  
  // Playlist Komutları
  new SlashCommandBuilder().setName("kaydet").setDescription("Kuyruğu playlist olarak kaydeder").addStringOption(o => o.setName("isim").setDescription("Playlist adı").setRequired(true)).toJSON(),
  new SlashCommandBuilder().setName("yukle").setDescription("Kaydedilmiş playlisti yükler").addStringOption(o => o.setName("isim").setDescription("Playlist adı").setRequired(true)).toJSON(),
  new SlashCommandBuilder().setName("playlistler").setDescription("Kaydedilmiş playlistleri listeler").toJSON(),
  new SlashCommandBuilder().setName("playlist-sil").setDescription("Playlist siler").addStringOption(o => o.setName("isim").setDescription("Playlist adı").setRequired(true)).toJSON(),
  
  // Favori Komutları
  new SlashCommandBuilder().setName("favori").setDescription("Çalan şarkıyı favorilere ekler").toJSON(),
  new SlashCommandBuilder().setName("favoriler").setDescription("Favori listesini gösterir").toJSON(),
  new SlashCommandBuilder().setName("favori-sil").setDescription("Favorilerden şarkı siler").addStringOption(o => o.setName("id").setDescription("Silinecek şarkı ID'si").setRequired(true)).toJSON(),
  new SlashCommandBuilder().setName("favori-cal").setDescription("Favorilerden şarkı çalar").addStringOption(o => o.setName("id").setDescription("Çalınacak şarkı ID'si").setRequired(true)).toJSON(),
  
  // Ses Kanalı Komutları
  new SlashCommandBuilder().setName("ses-kanal").setDescription("Botu ses kanalına çeker").toJSON(),
  new SlashCommandBuilder().setName("ayril").setDescription("Botu ses kanalından çıkarır").toJSON(),
  new SlashCommandBuilder().setName("bitir").setDescription("Müziği bitirir ve ses kanalından çıkar").toJSON(),
  
  // Diğer Komutlar
  new SlashCommandBuilder().setName("atla").setDescription("Belirtilen saniyeye atlar").addIntegerOption(o => o.setName("saniye").setDescription("Atlanacak saniye").setRequired(true).setMinValue(0)).toJSON(),
  new SlashCommandBuilder().setName("lyrics").setDescription("Çalan şarkının sözlerini gösterir").addStringOption(o => o.setName("şarkı").setDescription("Şarkı adı (opsiyonel)")).toJSON(),
  new SlashCommandBuilder().setName("oneri").setDescription("Müzik önerisi yapar").addStringOption(o => o.setName("tür").setDescription("Müzik türü").addChoices({ name: "Pop", value: "pop" }, { name: "Rock", value: "rock" }, { name: "Rap", value: "rap" }, { name: "Türkçe Pop", value: "turkce-pop" }, { name: "Arabesk", value: "arabesk" }, { name: "Elektronik", value: "elektronik" }).setRequired(true)).toJSON(),
  new SlashCommandBuilder().setName("radyo").setDescription("Radyo kanalı açar").addStringOption(o => o.setName("kanal").setDescription("Radyo kanalı").addChoices(...Object.keys(RADYO_KANALLARI).map(k => ({ name: RADYO_KANALLARI[k].name, value: k }))).setRequired(true)).toJSON(),
  new SlashCommandBuilder().setName("yardim").setDescription("Tüm komutları listeler").toJSON(),
  new SlashCommandBuilder().setName("ping").setDescription("Bot gecikmesini gösterir").toJSON(),
  new SlashCommandBuilder().setName("istatistik").setDescription("Bot istatistiklerini gösterir").toJSON()
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
  // bos
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
          filters.delete(guildId);
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
          
        case "bass":
          let bass = ((bassLevels.get(guildId) || 0) + 1) % 4;
          bassLevels.set(guildId, bass);
          const bassText = bass === 0 ? "Kapalı" : bass === 1 ? "Düşük" : bass === 2 ? "Orta" : "Yüksek";
          filters.set(guildId, bass === 0 ? 'normal' : 'bass');
          await interaction.reply({ content: `🎛️ Bass: **${bassText}**\n⚠️ Sonraki şarkıda aktif olacak`, ephemeral: true });
          break;
          
        case "favorite":
          const song = currentSongs.get(guildId);
          if (!song) return interaction.reply({ content: "❌ Çalan şarkı yok!", ephemeral: true });
          if (db) {
            await db.collection("favoriler").updateOne(
              { guildId, userId: interaction.user.id },
              { $addToSet: { songs: { ...song, addedAt: new Date() } } },
              { upsert: true }
            );
            await interaction.reply({ content: `❤️ **${song.title}** favorilere eklendi!`, ephemeral: true });
          } else {
            await interaction.reply({ content: "❌ Veritabanı bağlantısı yok!", ephemeral: true });
          }
          break;
          
        case "lyrics":
          const currentSongForLyrics = currentSongs.get(guildId);
          if (!currentSongForLyrics) return interaction.reply({ content: "❌ Çalan şarkı yok!", ephemeral: true });
          await interaction.deferReply({ ephemeral: true });
          const lyrics = await getLyrics(currentSongForLyrics.title);
          if (lyrics) {
            await interaction.editReply({ content: `📝 **${lyrics.title}**\n🔗 ${lyrics.url}` });
          } else {
            await interaction.editReply({ content: "❌ Şarkı sözü bulunamadı!" });
          }
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
      const vcId = interaction.member?.voice?.channelId;
      
      if (!vcId) return interaction.reply({ content: "❌ Önce ses kanalına girin!", ephemeral: true });
      
      await interaction.deferReply();
      
      try {
        let conn = getVoiceConnection(interaction.guildId);
        if (!conn) await connectToVoice(interaction.guildId, vcId, interaction.channel);
        
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
      const vcId = interaction.member?.voice?.channelId;
      
      if (!vcId) return interaction.reply({ content: "❌ Önce ses kanalına girin!", ephemeral: true });
      
      await interaction.deferReply();
      
      try {
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
          .setDescription(results.map((r, i) => `${i+1}. **${r.title}**\n   👤 ${r.channel} • 👁️ ${formatSayi(r.views)} • ⏱️ ${formatSure(r.duration)}`).join("\n\n"))
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
    if (commandName === "dur" || commandName === "bitir") {
      const player = getPlayer(interaction.guildId);
      if (player.state.status === AudioPlayerStatus.Idle && commandName === "dur") {
        return interaction.reply({ content: "❌ Çalan şarkı yok!", ephemeral: true });
      }
      
      player.stop();
      queues.set(interaction.guildId, []);
      currentSongs.delete(interaction.guildId);
      filters.delete(interaction.guildId);
      
      if (commandName === "bitir") {
        const conn = getVoiceConnection(interaction.guildId);
        if (conn) conn.disconnect();
        await interaction.reply("👋 Müzik bitirildi ve ses kanalından çıkıldı!");
      } else {
        await interaction.reply("⏹️ Müzik durduruldu ve kuyruk temizlendi!");
      }
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
    
    // /geri
    if (commandName === "geri") {
      const history = historyQueues.get(interaction.guildId) || [];
      if (!history.length) return interaction.reply({ content: "❌ Geçmiş şarkı yok!", ephemeral: true });
      
      const previousSong = history[0];
      const queue = queues.get(interaction.guildId) || [];
      queue.unshift(previousSong);
      queues.set(interaction.guildId, queue);
      
      history.shift();
      historyQueues.set(interaction.guildId, history);
      
      getPlayer(interaction.guildId).stop();
      await interaction.reply(`⏮️ Önceki şarkıya dönülüyor: **${previousSong.title}**`);
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
      const sayfa = interaction.options.getInteger("sayfa") || 1;
      
      if (!queue.length && !currentSong) {
        return interaction.reply({ content: "📭 Kuyruk boş!", ephemeral: true });
      }
      
      const itemsPerPage = 10;
      const totalPages = Math.ceil(queue.length / itemsPerPage) || 1;
      const page = Math.min(sayfa, totalPages);
      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      
      let description = "";
      
      if (currentSong) {
        const progress = player.state.status === AudioPlayerStatus.Playing ? 
          `\n${getProgressBar(0, currentSong.duration)} \`${formatSure(0)} / ${formatSure(currentSong.duration)}\`` : '';
        description += `**▶️ Şimdi Çalıyor:**\n[${currentSong.title}](${currentSong.url}) - <@${currentSong.requestedBy}>${progress}\n\n`;
      }
      
      if (queue.length) {
        description += `**📋 Kuyruk (${queue.length} şarkı):**\n`;
        const pageQueue = queue.slice(start, end);
        pageQueue.forEach((song, i) => {
          description += `\`${start + i + 1}.\` [${song.title}](${song.url}) - <@${song.requestedBy}> \`${formatSure(song.duration)}\`\n`;
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle("🎶 Müzik Kuyruğu")
        .setDescription(description || "Kuyruk boş")
        .setColor(Colors.Blue)
        .setFooter({ text: `Sayfa ${page}/${totalPages} • ${queue.length} şarkı kuyrukta` });
      
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
    
    // /filtre
    if (commandName === "filtre") {
      const filtre = interaction.options.getString("filtre", true);
      filters.set(interaction.guildId, filtre);
      await interaction.reply(`🎛️ Filtre: **${filtre}**\n⚠️ Sonraki şarkıda aktif olacak!`);
      return;
    }
    
    // /simdi
    if (commandName === "simdi") {
      const song = currentSongs.get(interaction.guildId);
      if (!song) return interaction.reply({ content: "❌ Çalan şarkı yok!", ephemeral: true });
      
      await updateNowPlayingMessage(interaction.guildId, song);
      await interaction.reply({ content: "✅ Çalan şarkı bilgisi güncellendi!", ephemeral: true });
      return;
    }
    
    // /ses-kanal
    if (commandName === "ses-kanal") {
      const vcId = interaction.member?.voice?.channelId;
      if (!vcId) return interaction.reply({ content: "❌ Önce ses kanalına girin!", ephemeral: true });
      
      await interaction.deferReply();
      try {
        await connectToVoice(interaction.guildId, vcId, interaction.channel);
        await interaction.editReply("✅ Ses kanalına girildi! `/çal` ile müzik başlatabilirsiniz.");
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
        const resource = createAudioResource(radyo.url, { inlineVolume: true });
        const player = getPlayer(interaction.guildId);
        
        player.play(resource);
        radioStations.set(interaction.guildId, kanal);
        
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
    
    // /lyrics
    if (commandName === "lyrics") {
      let query = interaction.options.getString("şarkı");
      if (!query) {
        const song = currentSongs.get(interaction.guildId);
        if (!song) return interaction.reply({ content: "❌ Çalan şarkı yok! Şarkı adı belirtin.", ephemeral: true });
        query = song.title;
      }
      
      await interaction.deferReply();
      const lyrics = await getLyrics(query);
      
      if (lyrics) {
        const embed = new EmbedBuilder()
          .setTitle("📝 Şarkı Sözleri")
          .setDescription(`**${lyrics.title}**\n\n[🔗 Genius'da görüntüle](${lyrics.url})`)
          .setColor(Colors.Purple);
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply("❌ Şarkı sözü bulunamadı!");
      }
      return;
    }
    
    // /oneri
    if (commandName === "oneri") {
      const tur = interaction.options.getString("tür", true);
      await interaction.deferReply();
      
      const oneri = await getMusicRecommendation(tur);
      if (oneri) {
        const embed = new EmbedBuilder()
          .setTitle(`🎵 ${tur.toUpperCase()} Önerileri`)
          .setDescription(oneri)
          .setColor(Colors.Purple)
          .setFooter({ text: "AirBot Müzik • Gemini AI" });
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply("❌ Öneri alınamadı!");
      }
      return;
    }
    
    // /kaydet
    if (commandName === "kaydet") {
      if (!db) return interaction.reply({ content: "❌ Veritabanı bağlantısı yok!", ephemeral: true });
      
      const isim = interaction.options.getString("isim", true);
      const queue = queues.get(interaction.guildId) || [];
      
      if (!queue.length) return interaction.reply({ content: "❌ Kuyruk boş!", ephemeral: true });
      
      await db.collection("playlistler").updateOne(
        { guildId: interaction.guildId, userId: interaction.user.id, name: isim },
        { $set: { songs: queue, createdAt: new Date() } },
        { upsert: true }
      );
      
      await interaction.reply(`💾 Kuyruk **"${isim}"** adıyla kaydedildi! (${queue.length} şarkı)`);
      return;
    }
    
    // /yukle
    if (commandName === "yukle") {
      if (!db) return interaction.reply({ content: "❌ Veritabanı bağlantısı yok!", ephemeral: true });
      
      const isim = interaction.options.getString("isim", true);
      const vcId = interaction.member?.voice?.channelId;
      
      if (!vcId) return interaction.reply({ content: "❌ Önce ses kanalına girin!", ephemeral: true });
      
      await interaction.deferReply();
      
      const playlist = await db.collection("playlistler").findOne({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        name: isim
      });
      
      if (!playlist) return interaction.editReply(`❌ **"${isim}"** adında playlist bulunamadı!`);
      
      try {
        let conn = getVoiceConnection(interaction.guildId);
        if (!conn) await connectToVoice(interaction.guildId, vcId, interaction.channel);
        
        const queue = queues.get(interaction.guildId) || [];
        queue.push(...playlist.songs);
        queues.set(interaction.guildId, queue);
        
        const player = getPlayer(interaction.guildId);
        
        if (player.state.status === AudioPlayerStatus.Idle) {
          await playNext(interaction.guildId);
        }
        
        await interaction.editReply(`📂 **"${isim}"** playlisti yüklendi! (${playlist.songs.length} şarkı)`);
      } catch (error) {
        await interaction.editReply(`❌ Hata: ${error.message}`);
      }
      return;
    }
    
    // /playlistler
    if (commandName === "playlistler") {
      if (!db) return interaction.reply({ content: "❌ Veritabanı bağlantısı yok!", ephemeral: true });
      
      const playlists = await db.collection("playlistler").find({
        guildId: interaction.guildId,
        userId: interaction.user.id
      }).toArray();
      
      if (!playlists.length) return interaction.reply({ content: "📭 Hiç playlist kaydedilmemiş!", ephemeral: true });
      
      const embed = new EmbedBuilder()
        .setTitle("📂 Playlistleriniz")
        .setDescription(playlists.map((p, i) => `**${i+1}.** ${p.name} - ${p.songs?.length || 0} şarkı`).join("\n"))
        .setColor(Colors.Blue);
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
    
    // /favori
    if (commandName === "favori") {
      if (!db) return interaction.reply({ content: "❌ Veritabanı bağlantısı yok!", ephemeral: true });
      
      const song = currentSongs.get(interaction.guildId);
      if (!song) return interaction.reply({ content: "❌ Çalan şarkı yok!", ephemeral: true });
      
      await db.collection("favoriler").updateOne(
        { guildId: interaction.guildId, userId: interaction.user.id },
        { $addToSet: { songs: { ...song, addedAt: new Date() } } },
        { upsert: true }
      );
      
      await interaction.reply(`❤️ **${song.title}** favorilere eklendi!`);
      return;
    }
    
    // /favoriler
    if (commandName === "favoriler") {
      if (!db) return interaction.reply({ content: "❌ Veritabanı bağlantısı yok!", ephemeral: true });
      
      const favorites = await db.collection("favoriler").findOne({
        guildId: interaction.guildId,
        userId: interaction.user.id
      });
      
      if (!favorites?.songs?.length) {
        return interaction.reply({ content: "📭 Favori listeniz boş!", ephemeral: true });
      }
      
      const embed = new EmbedBuilder()
        .setTitle("❤️ Favori Şarkılarınız")
        .setDescription(favorites.songs.map((s, i) => `**${i+1}.** ${s.title} - ${formatSure(s.duration)}\n   ID: \`${i+1}\``).join("\n\n"))
        .setColor(Colors.Red)
        .setFooter({ text: "/favori-cal <id> ile çalabilirsiniz" });
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
    
    // /favori-cal
    if (commandName === "favori-cal") {
      if (!db) return interaction.reply({ content: "❌ Veritabanı bağlantısı yok!", ephemeral: true });
      
      const id = parseInt(interaction.options.getString("id", true)) - 1;
      const vcId = interaction.member?.voice?.channelId;
      
      if (!vcId) return interaction.reply({ content: "❌ Önce ses kanalına girin!", ephemeral: true });
      
      const favorites = await db.collection("favoriler").findOne({
        guildId: interaction.guildId,
        userId: interaction.user.id
      });
      
      if (!favorites?.songs?.[id]) {
        return interaction.reply({ content: "❌ Geçersiz ID!", ephemeral: true });
      }
      
      await interaction.deferReply();
      
      try {
        let conn = getVoiceConnection(interaction.guildId);
        if (!conn) await connectToVoice(interaction.guildId, vcId, interaction.channel);
        
        const song = favorites.songs[id];
        song.requestedBy = interaction.user.id;
        
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
    
    // /gecmis
    if (commandName === "gecmis") {
      const history = historyQueues.get(interaction.guildId) || [];
      if (!history.length) return interaction.reply({ content: "📭 Geçmiş boş!", ephemeral: true });
      
      const embed = new EmbedBuilder()
        .setTitle("📜 Çalınan Şarkı Geçmişi")
        .setDescription(history.slice(0, 10).map((s, i) => `**${i+1}.** ${s.title} - <@${s.requestedBy}>`).join("\n"))
        .setColor(Colors.Blue);
      
      await interaction.reply({ embeds: [embed] });
      return;
    }
    
    // /yardim
    if (commandName === "yardim") {
      const embed = new EmbedBuilder()
        .setTitle("🎵 AirBot Müzik - Komut Listesi")
        .setDescription("Profesyonel Jubbio Müzik Botu")
        .setColor(Colors.Blue)
        .addFields(
          { name: "▶️ Müzik Kontrol", value: "`/çal` `/ara` `/dur` `/geç` `/geri` `/duraklat` `/devam` `/atla`", inline: false },
          { name: "📋 Kuyruk", value: "`/sıra` `/karistir` `/kuyruk-temizle` `/gecmis` `/simdi`", inline: false },
          { name: "🔊 Ses Kontrol", value: "`/ses` `/bass` `/filtre`", inline: false },
          { name: "🔁 Döngü", value: "`/loop`", inline: false },
          { name: "📂 Playlist", value: "`/kaydet` `/yukle` `/playlistler` `/playlist-sil`", inline: false },
          { name: "❤️ Favoriler", value: "`/favori` `/favoriler` `/favori-sil` `/favori-cal`", inline: false },
          { name: "🔌 Bağlantı", value: "`/ses-kanal` `/ayril` `/bitir`", inline: false },
          { name: "🎸 Diğer", value: "`/lyrics` `/oneri` `/radyo` `/ping` `/istatistik`", inline: false }
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
    
    // /istatistik
    if (commandName === "istatistik") {
      let totalSongs = 0;
      for (const queue of queues.values()) totalSongs += queue.length;
      
      const embed = new EmbedBuilder()
        .setTitle("📊 Bot İstatistikleri")
        .setColor(Colors.Green)
        .addFields(
          { name: "🎵 Aktif Müzik", value: `${queues.size} sunucu`, inline: true },
          { name: "📋 Toplam Kuyruk", value: `${totalSongs} şarkı`, inline: true },
          { name: "🌐 Sunucu", value: `${client.guilds.size} sunucu`, inline: true },
          { name: "⏱️ Uptime", value: formatSure(Math.floor(process.uptime())), inline: true },
          { name: "🎛️ yt-dlp", value: YTDLP_FINAL && fs.existsSync(YTDLP_FINAL) ? "✅ Aktif" : "❌ Yok", inline: true },
          { name: "💾 MongoDB", value: db ? "✅ Bağlı" : "❌ Yok", inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
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
