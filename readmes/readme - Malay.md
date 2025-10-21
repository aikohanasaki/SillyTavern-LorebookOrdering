# 📚 Penjajaran Buku Pengetahuan (Sambungan SillyTavern)

---

🌐 **Dokumentasi dan panduan penuh dalam Bahasa Melayu:**
Sila rujuk [panduan STMB dan STLO dalam Bahasa Melayu](../guides/STMB%20and%20STLO%20-%20Malay.md) untuk maklumat terperinci!

Sambungan SillyTavern yang menambah pengurusan keutamaan dan belanjawan di peringkat buku pengetahuan untuk World Info. Memberi kawalan penuh ke atas buku pengetahuan yang diaktifkan terlebih dahulu dan menghadkan buku pengetahuan yang "rakus". Sangat sesuai untuk pengguna dengan banyak buku pengetahuan yang memerlukan kawalan terperinci terhadap tingkah laku World Info.

---

💡 **Ingin menguasai pengurusan memori sepenuhnya?**
Guna STLO bersama dengan [SillyTavern-MemoryBooks (STMB)](https://github.com/aikohanasaki/SillyTavern-MemoryBooks) untuk hasil terbaik!  
Lihat [Panduan STMB + STLO](../guides/STMB%20and%20STLO%20-%20Malay.md) untuk tip pemasangan dan memastikan buku memori anda diberi keutamaan dengan betul.

---

🆕 **Kini menyokong tetapan khusus watak dalam sembang kumpulan dan pelarasan urutan yang tepat!**

**📋 [Sejarah Versi & Perubahan](CHANGELOG.md)**

## Soalan Lazim
Akses tetapan melalui butang "Penjajaran Buku Pengetahuan" di panel World Info (muncul di sebelah kotak carian jika buku pengetahuan tersedia).

![STLO Button](https://github.com/aikohanasaki/imagehost/blob/main/STLO.png)

---

## 📋 Prasyarat

- **SillyTavern:** 1.13.5+ (disyorkan versi terkini)
- **Strategi World Info:** MESTI guna strategi sisipan "evenly" untuk STLO berfungsi
- **Beberapa Buku Pengetahuan:** Sangat berguna bila anda ada banyak buku yang perlu diprioriti

## 💡 Tetapan Pengaktifan Global World Info/Buku Pengetahuan Disyorkan
Diuji dengan tetapan berikut:

- **Strategi Sisipan:** "evenly" (diperlukan untuk STLO)
- **Langkah Rekursi Maksimum:** 2 (cadangan umum)

---

## 🚀 Bermula

### 1. **Pasang & Konfigurasi**
- Pasang sambungan dalam folder sambungan SillyTavern anda
- Pastikan anda mempunyai beberapa buku pengetahuan tersedia
- Tetapkan strategi sisipan World Info kepada "evenly" dalam tetapan SillyTavern

![Extension Button](https://github.com/aikohanasaki/imagehost/blob/main/settings.png)

### 2. **Akses Tetapan**
- Buka panel World Info dalam SillyTavern
- Cari butang "Penjajaran Buku Pengetahuan" di sebelah kotak carian
- Klik untuk buka mod pengurusan buku pengetahuan

### 3. **Konfigurasi Keutamaan**
- Pilih buku pengetahuan dari menu jatuh bawah
- Tetapkan tahap keutamaan (1=Paling Rendah, 5=Paling Tinggi, 3=Default)
- Tetapkan belanjawan (jika perlu)
- Laraskan urutan jika perlu
- Simpan dan ulangi untuk buku lain

![Basic (global) settings](https://github.com/aikohanasaki/imagehost/blob/main/STLO%20basic.png)

---

## 🎯 Tahap Keutamaan

### **Sistem Keutamaan**
- **Paling Tinggi (5):** Buku diaktifkan terlebih dahulu dan mendapat keutamaan dalam pembahagian belanjawan
- **Tinggi (4):** Lebih tinggi dari default
- **Default (3):** Tingkah laku SillyTavern standard
- **Rendah (2):** Lebih rendah dari default
- **Paling Rendah (1):** Buku diaktifkan terakhir

### **Bagaimana Ia Berfungsi**
- Buku berkeutamaan tinggi diproses dahulu semasa pengaktifan World Info
- Hanya berfungsi dengan strategi "evenly"

---

## 📊 Sistem Pelarasan Urutan

### **Pelarasan Halus Melebihi Keutamaan**
Sistem ini membolehkan kawalan tepat ke atas urutan pemprosesan dalam tahap keutamaan yang sama:

- **Julat Pelarasan:** -10,000 hingga +10,000 ditambah pada pengiraan keutamaan
- **Kawalan Tepat:** Laras urutan tanpa ubah tahap keutamaan
- **Formula Matematik:** `Urutan Akhir = Keutamaan × 10,000 + Pelarasan Urutan + Urutan Asal`

### **Contoh Penggunaan**
```
Buku A: Keutamaan 3, Pelarasan Urutan +250
Buku B: Keutamaan 3, Pelarasan Urutan -100
Buku C: Keutamaan 3, Pelarasan Urutan 0 (default)

Urutan Akhir:
1. Buku A: 30,250 + urutan asal (diproses dahulu)
2. Buku C: 30,000 + urutan asal (default)
3. Buku B: 29,900 + urutan asal (diproses akhir)
```

### **Kawalan Sembang Kumpulan**
- **Selalu Guna:** Pelarasan urutan berfungsi untuk sembang tunggal & kumpulan (default)
- **Sembang Kumpulan Sahaja:** Hanya aktifkan pelarasan semasa sembang kumpulan
- **Laraskan untuk Watak:** Tetapan unik untuk watak tertentu

### **Bila Guna Pelarasan Urutan**
- **Watak vs Dunia:** Utamakan buku khusus watak berbanding umum
- **Hierarki Pengetahuan:** Pastikan info kritikal didahulukan
- **Pengurusan Memori:** Laras bila memori/LTM diaktifkan
- **Dialog:** Kawal bila buku berkaitan dialog diaktifkan

---

## 🎭 Tetapan Watak Individu

![Group Chat Specific Settings](https://github.com/aikohanasaki/imagehost/blob/main/STLO%20group.png)

### **Kustomisasi Per-Watak**
Dalam sembang kumpulan, watak boleh ada tingkah laku buku berbeza:

- **Keutamaan Watak:** Contoh, Ali guna buku dengan keutamaan 5, Abu guna keutamaan 2
- **Pelarasan Khusus:** Set urutan unik setiap watak
- **Integrasi Lancar:** Berfungsi automatik dalam sembang kumpulan

### **Bagaimana Ia Berfungsi**
1. **Tetapkan:** Dalam tetapan buku, buka bahagian "Group Chat Overrides"
2. **Pilih Watak:** Pilih watak yang perlukan tetapan khas
3. **Tetapkan Nilai:** Set keutamaan & pelarasan unik setiap watak
4. **Auto Guna:** Berkuatkuasa semasa giliran watak dalam sembang

### **Contoh**
- **Buku Peribadi:** Tetapkan keutamaan 5 untuk pemilik, 1 untuk lain-lain
- **Kepakaran:** Cendekiawan dapat keutamaan tinggi pada buku sains, pejuang keutamaan rendah
- **Pelarasan Halus:** Kukuhkan konten watak tertentu

### **Nota Penting**
- **Sembang Tunggal:** Pelarasan diabaikan, ikut default
- **Logik Lalai:** Jika tiada tetapan khas, ikut default
- **Tiada Konflik:** Tukar mod kumpulan ke tunggal akan reset keadaan

---

## ⚙️ Tetapan & Konfigurasi

### **Tetapan Setiap Buku**
- **Keutamaan:** Skala 1-5 dengan label
- **Pelarasan Urutan:** Laras dalam tahap keutamaan
- **Kawalan Belanjawan:** Had penggunaan bajet/konteks
  - **Default:** Tiada had (STLO tak potong); SillyTavern tentukan sendiri
  - **% Bajet World Info:** Hadkan ikut peratusan
  - **% Konteks Maksimum:** Hadkan ikut peratusan tetingkap model
  - **Token Tetap:** Tetapkan had khusus
  - Pengiraan ikut getMaxContextSize(), hanya aktif dengan "evenly"
  - **Tips:** 0 = SillyTavern urus, 1 = had sepenuhnya
- **Auto-Simpan:** Semua disimpan automatik

### **Tingkah Laku Global**
- **Validasi Strategi:** Periksa keperluan "evenly" automatik
- **Amaran Pintar:** Hanya masa penjanaan, bukan masa muat naik
- **Penjejakan:** Beza antara salam automatik & penjanaan manual

---

## 🚨 Keserasian & Amaran

### **Keperluan Strategi**
STLO perlukan "evenly". Jika:
- Ada tetapan khas untuk buku
- Strategi BUKAN "evenly"

Akan muncul amaran:
- **Henti Penjanaan:** Betulkan tetapan dahulu
- **Lumpuhkan STLO:** Terus tanpa penjajaran

### **Amalan Terbaik**
- Sentiasa guna "evenly" bila STLO aktif
- Uji tetapan dengan sembang pendek
- Guna pelarasan urutan secara sederhana

---

## 🔧 Penggunaan Lanjutan

### **Senario Banyak Buku**
- **Watak + Dunia:** Buku watak keutamaan tinggi/tertinggi
- **Ingatan/LTM:** Buku memori keutamaan terendah
- **Kawal Urutan:** Guna pelarasan untuk kawalan tepat

### **Strategi Kumpulan**
- **Kepakaran Watak:** Setiap watak dapat keutamaan pada buku berkaitan mereka
  - Cendekiawan: tinggi pada "Teori Magik", biasa pada "Taktik Pertempuran"
  - Pejuang: tinggi pada "Taktik Pertempuran", rendah pada "Teori Magik"
- **Pelarasan Halus:** Kukuhkan konten tertentu +500
  - Buku khusus watak: pelarasan +500
  - Buku umum: 0 (default)
- **Konsistensi Pengetahuan:** Pengetahuan khas hanya muncul semasa giliran sendiri
  - Sejarah watak: keutamaan 5 untuk diri, 1 untuk lain-lain

---

*Dikodkan dengan Vibe oleh Cline dan pelbagai LLM.* 🎯✨
