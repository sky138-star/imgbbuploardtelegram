import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const imgbbKey = process.env.IMGBB_API_KEY;

if (!token) throw new Error("TELEGRAM_BOT_TOKEN tidak ditemukan di .env");
if (!imgbbKey) throw new Error("IMGBB_API_KEY tidak ditemukan di .env");

const bot = new TelegramBot(token, { polling: true });

// 🔍 Cek validitas API key IMGBB
async function validateIMGBBKey() {
  try {
    await axios.get(`https://api.imgbb.com/1?key=${imgbbKey}`);
    console.log("✅ API key valid! Bot siap digunakan 🚀");
  } catch {
    console.error("❌ API key tidak valid atau koneksi bermasalah");
  }
}

validateIMGBBKey();

console.log("🤖 Bot IMGBB uploader streaming berjalan...");

// 🟢 MENU INLINE BUTTON
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "📤 Upload Gambar", callback_data: "upload" },
        { text: "ℹ️ Bantuan", callback_data: "help" },
      ],
      [{ text: "👤 Tentang Bot", callback_data: "about" }],
    ],
  },
};

// 🔹 Command /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    `👋 Halo *${msg.from.first_name || "teman"}!*\n\nSelamat datang di *IMGBB Uploader Bot*.\nKirimkan gambar untuk langsung diunggah ke IMGBB atau gunakan menu di bawah ini ⬇️`,
    { parse_mode: "Markdown", ...mainMenu }
  );
});

// 🔹 Command /help
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `📘 *Panduan Bot*\n\n1️⃣ Kirim gambar ke bot\n2️⃣ Tunggu proses upload\n3️⃣ Bot akan membalas dengan link pendek\n\nGunakan juga tombol menu / perintah yang tersedia.`,
    { parse_mode: "Markdown" }
  );
});

// 🔹 Command /upload
bot.onText(/\/upload/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "📤 Kirimkan gambar yang ingin kamu upload ke IMGBB!"
  );
});

// 🔹 Handle callback dari tombol inline
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === "upload") {
    await bot.sendMessage(chatId, "📤 Silakan kirim gambar untuk diupload!");
  } else if (data === "help") {
    await bot.sendMessage(
      chatId,
      `🧾 *Panduan Penggunaan*\n\n1️⃣ Kirim gambar ke bot\n2️⃣ Tunggu proses upload\n3️⃣ Dapatkan link IMGBB\n\nKamu juga bisa gunakan perintah /upload untuk mulai.`,
      { parse_mode: "Markdown" }
    );
  } else if (data === "about") {
    await bot.sendMessage(
      chatId,
      `👤 *Tentang Bot*\n\nBot ini dibuat untuk upload gambar langsung ke IMGBB.\n\n🔗 Developer: [ARIIII]\n💡 Fitur: Auto-delete status, Link pendek, dan Menu interaktif.`,
      { parse_mode: "Markdown" }
    );
  }

  // Hapus notifikasi tombol ditekan
  bot.answerCallbackQuery(query.id);
});

// 🖼 Handle file gambar
bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.photo[msg.photo.length - 1].file_id;

  const statusMsg = await bot.sendMessage(chatId, "⏳ Sedang mengunggah gambar...");

  try {
    const fileLink = await bot.getFileLink(fileId);
    const response = await axios({
      method: "POST",
      url: "https://api.imgbb.com/1/upload",
      params: { key: imgbbKey },
      data: { image: fileLink.href },
    });

    const imageUrl = response.data.data.url;

    // Gunakan TinyURL untuk memperpendek link
    const shortUrl = await axios.get(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(imageUrl)}`
    );

    await bot.editMessageText(
      `✅ *Berhasil diupload!*\n\n🔗 [Klik di sini untuk melihat gambar](${shortUrl.data})`,
      {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: "Markdown",
      }
    );
  } catch (error) {
    console.error("Upload gagal:", error.message);
    await bot.editMessageText("❌ Gagal mengunggah gambar. Coba lagi nanti.", {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });
  }

  // Auto-delete pesan status dalam 15 detik
  setTimeout(() => {
    bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
  }, 15000);
});
