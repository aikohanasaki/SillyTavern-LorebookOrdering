[Tautan ke ST Memory Books (STMB)](https://github.com/aikohanasaki/SillyTavern-MemoryBooks) | [Tautan ke ST Lorebook Ordering (STLO)](https://github.com/aikohanasaki/SillyTavern-LorebookOrdering)

# 🧠 Panduan Memori Terbaik: STMB + STLO

ST Memory Books (STMB) sangat penting untuk **menghasilkan konten memori**, dan ST Lorebook Ordering (STLO) sangat penting untuk **menjamin bahwa konten tersebut benar-benar digunakan** oleh AI. Ketika digunakan bersama, keduanya memecahkan masalah inti **Pengecualian Memori**.

## Langkah 1: Siapkan Panggung (Dasar)

**Paksa "Diurutkan Merata":** Anda harus memastikan pengaturan default World Info (WI) SillyTavern dikonfigurasi agar STLO bisa mengambil alih. Di **Pengaturan World Info** SillyTavern Anda, atur **Strategi Penyisipan World Info** ke **"Diurutkan Merata."** STLO membutuhkan strategi ini untuk melewati penyortiran kategori kaku dari kode dasar SillyTavern (Obrolan $\rightarrow$ Persona $\rightarrow$ dll.).

## Langkah 2: Buat Konten Memori (Tugas STMB)

Gunakan STMB untuk secara otomatis membuat memori jangka panjang Anda.

1.  **Aktifkan Ringkasan Otomatis:** Buka panel STMB (tongkat ajaib 🪄) dan aktifkan **Ringkasan Otomatis**. Atur interval yang Anda inginkan (misal, **30 pesan**).
2.  **Ikat/Buat Buku Memori:** Pastikan obrolan Anda memiliki Lorebook khusus untuk memori. STMB biasanya menempatkan memori di buku tipe Global, tapi sering juga memakai lorebook yang terikat pada chat demi kemudahan.
3.  **Ngobrol seperti biasa:** Seiring berjalannya chat, STMB secara otomatis membuat ringkasan yang padat, terstruktur, dan berkualitas. Memori-memori ini adalah "penumpang" yang berusaha naik ke "penerbangan" konteks AI yang terbatas.

## Langkah 3: Jamin Prioritas (Tugas STLO)

Ini adalah langkah yang paling krusial. Anda harus memakai STLO untuk secara manual menurunkan prioritas **buku STMB yang terikat chat** Anda, sambil menaikkan prioritas **Esensi Karakter**.

### A. Hancurkan Jebakan "Chat-Pertama"
Secara default, buku memori yang terikat chat diberi **prioritas tertinggi** (Chat-Pertama), berisiko memakai terlalu banyak ruang konteks dan memblokir lorebook Dunia, Karakter, dan/atau Persona lain. STLO memungkinkan Anda memperbaikinya dengan menetapkan tingkat prioritas khusus.

### B. Tumpukan Prioritas yang Direkomendasikan

Gunakan STLO untuk menetapkan prioritas khusus bagi semua lorebook terkait:

### Memahami Perbedaan Priority vs Position

**Position** menentukan *di mana* konten muncul dalam konteks (Char up, Char down, AN up/down, @D).  
**Priority** menentukan *perlindungan anggaran*—apa yang dipertahankan saat batas konteks terpenuhi.

Semakin tinggi angka prioritas = semakin terlindungi dari pemotongan. Prioritas berlaku **di dalam setiap posisi**, bukan antar posisi.

---

### Rekomendasi Pengaturan Prioritas STLO

| Tipe Lorebook/Memori | Prioritas yang Direkomendasikan | Alasan |
|:---------------------|:---------------------|:--------------|
| **Esensi Karakter** (Kepribadian, Deskripsi, Sifat Inti) | **Prioritas 5** (Tertinggi) | **Perlindungan maksimum.** Informasi kartu karakter adalah dasar identitas dan perilaku bot. Tidak boleh terpotong, agar karakter tidak “rusak”. Posisi biasanya diatur oleh pembuat bot (Char/AN down atau @D). |
| **Lore Dunia** (Setting, Faksi, Lokasi, Aturan) | **Prioritas 4** (Tinggi, dengan batas anggaran) | **Perlindungan tinggi namun terkendali.** Lore dunia memberikan konteks penting untuk bot. Harus dibatasi agar tidak membengkak, tapi cukup dilindungi agar informasi inti dunia tidak hilang. Terpotong setelah esensi karakter jika perlu. |
| **Persona** (Identitas Anda) | **Prioritas 3** (Sedang) | **Perlindungan sedang.** Identitas pengguna penting untuk respons personalisasi, tapi bot tetap bisa berjalan jika beberapa detail persona dipotong. Kurang kritis dibandingkan fondasi karakter/dunia. |
| **Perintah/Instruksi Umum** | **Prioritas 3** (Sedang) | **Perlindungan sedang.** Instruksi perilaku umum dan perintah format. Penting untuk kualitas respons, terutama jika ditempatkan di @D oleh pembuat bot, tapi tidak sepenting integritas karakter. |
| **Memori** (STMB, Peristiwa yang Diingat) | **Prioritas 1** (Terendah, dengan batas anggaran) | **Perlindungan minimal, trimming agresif.** Memori sebaiknya ditempatkan di Char up (awal konteks) dan berfungsi sebagai pelengkap, bukan informasi utama. Jika banyak memori aktif, sebagian besar boleh dipotong tanpa merusak bot. Batas anggaran mencegah memori membengkak menyingkirkan info kritis. |

---

### Prinsip Utama

1. **Lindungi yang tak tergantikan:** Esensi karakter tidak bisa direkonstruksi jika hilang.
2. **Anggarkan yang bisa membengkak:** Lore dunia dan memori bisa memicu banyak entri—batasi jumlahnya.
3. **Position itu terpisah:** Item Prioritas 1 di @D tetap muncul di bawah; tapi terpotong lebih dulu saat konteks penuh.
4. **Percayai pembuat bot:** Bot yang baik menempatkan instruksi kritis di @D terlepas dari pengaturan prioritas Anda.

---

## C. Tetapkan Batas Anggaran

- **Esensi Karakter**: Tanpa batas (biasanya sudah ringkas)
- **Lore Dunia**: 15000–25000 token maksimal
- **Persona**: Tanpa batas (biasanya ringkas)
- **Perintah/Umum**: Tanpa batas (biasanya ringkas)
- **Memori**: 5000–15000 token maksimal (pemangkasan agresif)

1.  Buka konfigurasi STLO untuk lorebook STMB Anda.
2.  Atur batas **Anggaran** (misal, **token tetap** seperti `5000`, atau **Persentase Konteks** seperti `15%`).
3.  Ini menjamin bahkan ketika lorebook diproses lebih awal, ia **memangkas dirinya sendiri** otomatis untuk mematuhi batas kapasitas Anda, menyisakan ruang untuk lorebook Prioritas 3, 2, dan 1 lainnya.

---

**Catatan:** Beberapa istilah dan bagian teknis sebaiknya ditinjau ulang oleh penerjemah Indonesia yang mahir untuk memastikan akurasi dan konsistensi dengan istilah SillyTavern/STMB/STLO.
