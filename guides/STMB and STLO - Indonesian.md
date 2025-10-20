[Tautan ke ST Memory Books (STMB)](https://github.com/aikohanasaki/SillyTavern-MemoryBooks) | [Tautan ke ST Lorebook Ordering (STLO)](https://github.com/aikohanasaki/SillyTavern-LorebookOrdering)

# 🧠 Panduan Memori Terbaik: STMB + STLO

ST Memory Books (STMB) sangat penting untuk **menghasilkan konten memori**, dan ST Lorebook Ordering (STLO) sangat penting untuk **menjamin bahwa konten tersebut benar-benar digunakan** oleh AI. Ketika digunakan bersama, keduanya memecahkan masalah inti **Pengecualian Memori**.

## Langkah 1: Siapkan Panggung (Dasar)

**Paksa "Diurutkan Merata":** Anda harus terlebih dahulu memastikan pengaturan Informasi Dunia (WI) default SillyTavern dikonfigurasi untuk memungkinkan STLO mengambil kendali. Di **Pengaturan Informasi Dunia** SillyTavern Anda, atur **Strategi Penyisipan Informasi Dunia** ke **"Diurutkan Merata."** STLO memerlukan strategi ini untuk melewati penyortiran kategori yang kaku dari kode dasar SillyTavern (Obrolan $\rightarrow$ Persona $\rightarrow$ dll.).

## Langkah 2: Buat Konten Memori (Tugas STMB)

Gunakan STMB untuk membuat memori jangka panjang Anda secara otomatis.

1.  **Aktifkan Ringkasan Otomatis:** Buka panel STMB (tongkat ajaib 🪄) dan aktifkan **Ringkasan Otomatis**. Atur interval yang Anda inginkan (mis., **30 pesan**).
2.  **Ikat/Buat Buku Memori:** Pastikan obrolan Anda memiliki Lorebook khusus untuk memori. STMB biasanya akan menempatkan memori di buku tipe Global, tetapi sering menggunakan lorebook yang terikat obrolan untuk kesederhanaan.
3.  **Mengobrol Secara Normal:** Seiring berjalannya obrolan Anda, STMB secara otomatis menghasilkan ringkasan yang padat, berkualitas tinggi, dan terstruktur. Memori-memori ini sekarang adalah "penumpang" yang mencoba naik "penerbangan" konteks terbatas AI.

## Langkah 3: Jamin Prioritas (Tugas STLO)

Ini adalah langkah paling penting. Anda harus menggunakan STLO untuk secara manual menurunkan prioritas **buku STMB yang terikat obrolan** Anda sambil meningkatkan **Esensi Karakter** Anda.

### A. Hancurkan Jebakan "Obrolan-Pertama"
Secara default, buku memori yang terikat obrolan diberi **prioritas tertinggi** (Obrolan-Pertama), yang berisiko menggunakan terlalu banyak ruang konteks dan mengunci lorebook Dunia, Karakter, dan/atau Persona lainnya. STLO memungkinkan Anda memperbaiki ini dengan menetapkan kembali tingkat prioritas kustom yang spesifik.

### B. Tumpukan Prioritas yang Direkomendasikan

Gunakan STLO untuk menetapkan prioritas kustom untuk semua lorebook yang relevan:

| Lorebook/Memori | Prioritas STLO Kustom | Mengapa? (TUMPUKAN) |
| :--- | :--- | :--- |
| **Esensi Karakter** (Kepribadian, Deskripsi) | **Prioritas 5** (Tertinggi) | **Dimuat Pertama** untuk mengunci identitas dan suara inti karakter sebelum hal lain dimuat. |
| **Buku Memori STMB** (Memori Anda) | **Prioritas 4** (Tinggi) | **Dimuat Kedua.** Cukup tinggi untuk memastikan memori disertakan, tetapi cukup rendah untuk menjamin esensi dimuat terlebih dahulu. |
| **Lore Persona** (Identitas Anda) | **Prioritas 3** (Default/Normal) | **Dimuat Ketiga.** Informasi identitas pengguna dilihat setelah pengaturan inti karakter dan memori kritis. |
| **Lore Umum/Acak** (Memori Peristiwa, Lore Dunia) | **Prioritas 1-2** (Terendah) | **Dimuat Terakhir.** Informasi yang kurang penting hanya disertakan jika masih ada ruang. |

### C. Tetapkan Batas Anggaran
Untuk Buku Memori STMB (dan lorebook padat lainnya), gunakan fungsi **Anggaran** STLO untuk mencegahnya menghabiskan semua ruang, bahkan jika prioritasnya tinggi.

1.  Buka konfigurasi STLO untuk lorebook STMB Anda.
2.  Tetapkan batas **Anggaran** (mis., **token tetap** seperti `5000`, atau **Persentase Konteks** seperti `15%`).
3.  Ini menjamin bahwa bahkan ketika lorebook diproses lebih awal, ia akan **memangkas dirinya sendiri** secara otomatis untuk mematuhi batas kapasitas Anda, menyisakan ruang untuk semua lorebook Prioritas 3, 2, dan 1 lainnya.
