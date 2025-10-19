import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";
import FormData from "form-data";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const imgbbKey = process.env.IMGBB_API_KEY;

if (!token) throw new Error("TELEGRAM_BOT_TOKEN tidak ditemukan di .env");
if (!imgbbKey) throw new Error("IMGBB_API_KEY tidak ditemukan di .env");

const bot = new TelegramBot(token, { polling: true });

// 🔍 Verifikasi API key ImgBB
(async () => {
  try {
    console.log("🔍 Mengecek validitas IMGBB API key...");
    const res = await axios.get(`https://api.imgbb.com/1?key=${imgbbKey}`);
    if (res.status === 200) {
      console.log("✅ API key valid! Bot siap digunakan 🚀");
    }
  } catch (err) {
    console.error("❌ API key IMGBB tidak valid atau koneksi gagal!");
  }
})();

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (!msg.photo) {
    bot.sendMessage(chatId, "📸 Kirim gambar untuk diupload ke ImgBB!");
    return;
  }

  const fileId = msg.photo[msg.photo.length - 1].file_id;
  const fileLink = await bot.getFileLink(fileId);

  const statusMsg = await bot.sendMessage(chatId, "⏳ Mengupload gambar ke ImgBB...");

  try {
    // Ambil file dari Telegram
    const response = await axios.get(fileLink, { responseType: "arraybuffer" });
    const imageBase64 = Buffer.from(response.data).toString("base64");

    // Siapkan form upload
    const form = new FormData();
    form.append("key", imgbbKey);
    form.append("image", imageBase64);

    // Upload ke ImgBB
    const upload = await axios.post("https://api.imgbb.com/1/upload", form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const data = upload.data.data;

    // Hapus pesan status
    setTimeout(() => {
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
    }, 1000);

    // Kirim hasil ke user
    const message =
      `✅ Berhasil diupload!\n\n` +
      `🌐 Link Pendek: ${data.url_viewer}\n` +
      `🖼️ Link Langsung: ${data.url}`;

    await bot.sendMessage(chatId, message);
  } catch (error) {
    console.error("❌ Upload gagal:", error.response?.data || error.message);

    setTimeout(() => {
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
    }, 1000);

    bot.sendMessage(chatId, "❌ Gagal mengupload gambar. Coba lagi nanti.");
  }
});

console.log("🤖 Bot IMGBB uploader streaming berjalan...");
