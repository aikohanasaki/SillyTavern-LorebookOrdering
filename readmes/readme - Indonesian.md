# 📚 Penjajaran Buku Pengetahuan (Ekstensi SillyTavern)

---

🌐 **Dokumentasi dan panduan lengkap dalam Bahasa Indonesia:**
Silakan baca [panduan STMB dan STLO dalam Bahasa Indonesia](../guides/STMB%20and%20STLO%20-%20Indonesian.md) untuk informasi lebih lanjut!

Ekstensi SillyTavern yang menambahkan manajemen prioritas dan anggaran tingkat buku pengetahuan ke World Info. Memberikan kontrol penuh atas buku mana yang diaktifkan lebih dulu dan dapat membatasi buku pengetahuan yang "rakus". Sempurna untuk pengguna dengan banyak buku pengetahuan yang membutuhkan kontrol rinci atas perilaku World Info.

---

💡 **Ingin memaksimalkan manajemen memori?**
Gunakan STLO bersama [SillyTavern-MemoryBooks (STMB)](https://github.com/aikohanasaki/SillyTavern-MemoryBooks) untuk hasil terbaik!  
Lihat [Panduan STMB + STLO](../guides/STMB%20and%20STLO%20-%20Indonesian.md) untuk tips pengaturan dan memastikan prioritas memori Anda benar.

---

🆕 **Sekarang mendukung pengaturan khusus karakter dalam obrolan grup dan penyesuaian urutan yang presisi!**

**📋 [Riwayat Versi & Perubahan](CHANGELOG.md)**

## FAQ
Pengaturan dapat diakses melalui tombol "Penjajaran Buku Pengetahuan" di panel World Info (muncul di samping kotak pencarian jika buku pengetahuan tersedia).

![STLO Button](https://github.com/aikohanasaki/imagehost/blob/main/STLO.png)

---

## 📋 Prasyarat

- **SillyTavern:** 1.13.5+ (disarankan versi terbaru)
- **Strategi World Info:** HARUS menggunakan strategi penyisipan "evenly" agar STLO berfungsi
- **Beberapa Buku Pengetahuan:** Ekstensi paling bermanfaat jika Anda memiliki banyak buku yang perlu diprioritaskan

## 💡 Pengaturan Aktivasi Global World Info/Buku Pengetahuan yang Disarankan
Diuji dengan pengaturan berikut:

- **Strategi Penyisipan:** "evenly" (wajib untuk STLO)
- **Maksimal Langkah Rekursi:** 2 (rekomendasi umum)

---

## 🚀 Memulai

### 1. **Instal & Konfigurasi**
- Instal ekstensi di folder ekstensi SillyTavern Anda
- Pastikan ada beberapa buku pengetahuan yang tersedia
- Atur strategi penyisipan World Info ke "evenly" di pengaturan SillyTavern

![Extension Button](https://github.com/aikohanasaki/imagehost/blob/main/settings.png)

### 2. **Akses Pengaturan**
- Buka panel World Info di SillyTavern
- Cari tombol "Penjajaran Buku Pengetahuan" di samping kotak pencarian
- Klik untuk membuka modal manajemen buku pengetahuan

### 3. **Konfigurasi Prioritas**
- Pilih buku pengetahuan dari dropdown
- Tetapkan tingkat prioritas (1=Terendah, 5=Tertinggi, 3=Default)
- Tetapkan anggaran (jika diinginkan)
- Atur penyesuaian urutan jika perlu
- Simpan dan ulangi untuk buku pengetahuan lainnya

![Basic (global) settings](https://github.com/aikohanasaki/imagehost/blob/main/STLO%20basic.png)

---

## 🎯 Tingkat Prioritas

### **Sistem Prioritas**
- **Tertinggi (5):** Buku pengetahuan diaktifkan pertama dan mendapat prioritas dalam pembagian anggaran
- **Tinggi (4):** Lebih tinggi dari default
- **Default (3):** Perilaku standar SillyTavern
- **Rendah (2):** Lebih rendah dari default
- **Terendah (1):** Buku pengetahuan diaktifkan terakhir

### **Cara Kerjanya**
- Buku pengetahuan dengan prioritas lebih tinggi diproses pertama saat aktivasi World Info
- Hanya berfungsi dengan strategi "evenly"

---

## 📊 Sistem Penyesuaian Urutan

### **Penyesuaian Lebih Lanjut dari Prioritas**
Sistem ini memungkinkan kontrol presisi atas urutan pemrosesan dalam tingkat prioritas yang sama:

- **Rentang Penyesuaian:** -10.000 hingga +10.000 ditambahkan ke perhitungan prioritas
- **Kontrol Presisi:** Sesuaikan urutan tanpa mengubah tingkat prioritas
- **Rumus Matematika:** `Urutan Akhir = Prioritas × 10.000 + Penyesuaian Urutan + Urutan Asli`

### **Contoh Penggunaan**
```
Buku A: Prioritas 3, Penyesuaian Urutan +250
Buku B: Prioritas 3, Penyesuaian Urutan -100
Buku C: Prioritas 3, Penyesuaian Urutan 0 (default)

Urutan Akhir:
1. Buku A: 30.250 + urutan asli (diproses dulu)
2. Buku C: 30.000 + urutan asli (default)
3. Buku B: 29.900 + urutan asli (diproses terakhir)
```

### **Kontrol Obrolan Grup**
- **Selalu Aktif:** Penyesuaian urutan berfungsi untuk obrolan tunggal & grup (default)
- **Hanya Obrolan Grup:** Terapkan penyesuaian hanya saat obrolan grup
- **Atur untuk Karakter:** Pengaturan unik untuk karakter tertentu

### **Kapan Menggunakan Penyesuaian Urutan**
- **Karakter vs Dunia:** Utamakan buku khusus karakter di atas umum
- **Hierarki Pengetahuan:** Pastikan info penting didahulukan
- **Manajemen Memori:** Atur kapan memori/LTM diaktifkan
- **Dialog:** Kontrol kapan buku terkait dialog diaktifkan

---

## 🎭 Pengaturan Individu untuk Karakter

![Group Chat Specific Settings](https://github.com/aikohanasaki/imagehost/blob/main/STLO%20group.png)

### **Kustomisasi Per-Karakter**
Dalam obrolan grup, karakter dapat memiliki perilaku buku pengetahuan yang berbeda:

- **Prioritas Karakter:** Contoh, Ali menggunakan buku dengan prioritas 5, Budi dengan prioritas 2
- **Penyesuaian Khusus:** Atur urutan unik setiap karakter
- **Integrasi Mulus:** Berfungsi otomatis dalam obrolan grup

### **Cara Kerjanya**
1. **Setel:** Di pengaturan buku, buka bagian "Group Chat Overrides"
2. **Pilih Karakter:** Pilih karakter yang butuh pengaturan khusus
3. **Setel Nilai:** Atur prioritas & penyesuaian unik tiap karakter
4. **Auto Aktif:** Berlaku saat giliran karakter di obrolan

### **Contoh**
- **Buku Pribadi:** Prioritas 5 untuk pemilik, 1 untuk lain-lain
- **Keahlian:** Ilmuwan prioritas tinggi pada buku sains, pejuang prioritas rendah
- **Penyesuaian Halus:** Tegaskan konten karakter tertentu

### **Catatan Penting**
- **Obrolan Tunggal:** Penyesuaian diabaikan, pakai default
- **Logika Default:** Jika tak ada pengaturan khusus, pakai default
- **Tidak Ada Konflik:** Beralih dari grup ke tunggal akan reset kondisi

---

## ⚙️ Pengaturan & Konfigurasi

### **Pengaturan per Buku**
- **Prioritas:** Skala 1-5 dengan label
- **Penyesuaian Urutan:** Atur di tingkat prioritas
- **Kontrol Anggaran:** Batas penggunaan konteks/anggaran
  - **Default:** Tanpa batas (STLO tidak memangkas); SillyTavern mengatur sendiri
  - **% Anggaran World Info:** Batasi sesuai persentase
  - **% Maksimal Konteks:** Batasi sesuai persentase jendela model
  - **Token Tetap:** Tetapkan batas spesifik
  - Perhitungan berdasar getMaxContextSize(), aktif hanya dengan "evenly"
  - **Tips:** 0 = SillyTavern atur, 1 = batasi sepenuhnya
- **Auto-Simpan:** Semua langsung disimpan

### **Perilaku Global**
- **Validasi Strategi:** Periksa kebutuhan "evenly" otomatis
- **Peringatan Cerdas:** Hanya saat proses generate, bukan saat load
- **Pelacakan:** Bedakan salam otomatis & generate manual

---

## 🚨 Kompatibilitas & Peringatan

### **Persyaratan Strategi**
STLO butuh "evenly". Jika:
- Ada pengaturan khusus untuk buku
- Strategi BUKAN "evenly"

Akan muncul peringatan:
- **Hentikan Generate:** Benahi pengaturan dulu
- **Nonaktifkan STLO:** Lanjut tanpa penjajaran

### **Praktik Terbaik**
- Selalu pakai "evenly" jika STLO aktif
- Uji pengaturan dengan obrolan pendek
- Gunakan penyesuaian urutan secukupnya

---

## 🔧 Penggunaan Lanjutan

### **Skenario Multi-Buku**
- **Karakter + Dunia:** Buku karakter prioritas tinggi/tertinggi
- **Memori/LTM:** Buku memori prioritas terendah
- **Kontrol Urutan:** Gunakan penyesuaian untuk kontrol presisi

### **Strategi Grup**
- **Keahlian Karakter:** Setiap karakter dapat prioritas pada buku terkait
  - Ilmuwan: tinggi di "Teori Magis", normal di "Taktik Pertempuran"
  - Pejuang: tinggi di "Taktik Pertempuran", rendah di "Teori Magis"
- **Penyesuaian Halus:** Tegaskan konten khusus +500
  - Buku khusus karakter: penyesuaian +500
  - Buku umum: 0 (default)
- **Konsistensi Pengetahuan:** Konten khusus hanya muncul saat giliran sendiri
  - Sejarah karakter: prioritas 5 untuk diri, 1 untuk lain-lain

---

*Dikodekan dengan Vibe oleh Cline dan berbagai LLM.* 🎯✨
