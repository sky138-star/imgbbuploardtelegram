import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const imgbbKey = process.env.IMGBB_KEY;

if (!imgbbKey) {
  console.error("❌ IMGBB_KEY tidak ditemukan di .env");
  process.exit(1);
}

async function checkImgbbKey() {
  console.log("🔍 Mengecek validitas IMGBB API key...");
  try {
    const res = await axios.get(`https://api.imgbb.com/1?key=${imgbbKey}`, {
      validateStatus: () => true, // hindari throw otomatis
      timeout: 10000,
    });

    if (res.data?.success === true) {
      console.log("✅ API Key IMGBB valid dan aktif!");
      process.exit(0);
    } else if (res.data?.error?.message?.includes("Invalid API v1 key")) {
      console.error("❌ API Key IMGBB tidak valid!");
      process.exit(1);
    } else {
      console.error("⚠️ Gagal memverifikasi API key:", JSON.stringify(res.data));
      process.exit(1);
    }
  } catch (err) {
    console.error("🚫 Terjadi kesalahan:", err.message);
    process.exit(1);
  }
}

checkImgbbKey();
