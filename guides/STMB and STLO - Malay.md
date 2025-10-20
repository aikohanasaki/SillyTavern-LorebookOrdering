[Pautan ke ST Memory Books (STMB)](https://github.com/aikohanasaki/SillyTavern-MemoryBooks) | [Pautan ke ST Lorebook Ordering (STLO)](https://github.com/aikohanasaki/SillyTavern-LorebookOrdering)

# 🧠 Panduan Memori Terunggul: STMB + STLO

ST Memory Books (STMB) adalah penting untuk **menjana kandungan memori**, dan ST Lorebook Ordering (STLO) adalah penting untuk **menjamin kandungan tersebut benar-benar digunakan** oleh AI. Apabila digunakan bersama, mereka menyelesaikan masalah teras **Pengecualian Memori**.

## Langkah 1: Sediakan Peringkat (Asas)

**Paksa "Disusun Sama Rata":** Anda mesti terlebih dahulu memastikan persediaan Maklumat Dunia (WI) lalai SillyTavern dikonfigurasikan untuk membenarkan STLO mengambil alih. Dalam **Tetapan Maklumat Dunia** SillyTavern anda, tetapkan **Strategi Sisipan Maklumat Dunia** kepada **"Disusun Sama Rata."** STLO memerlukan strategi ini untuk memintas pengisihan kategori tegar kod asas SillyTavern (Sembang $\rightarrow$ Persona $\rightarrow$ dll.).

## Langkah 2: Cipta Kandungan Memori (Tugas STMB)

Gunakan STMB untuk mencipta memori jangka panjang anda secara automatik.

1.  **Dayakan Ringkasan Auto:** Pergi ke panel STMB (tongkat sakti 🪄) dan hidupkan **Ringkasan Auto**. Tetapkan selang pilihan anda (cth., **30 mesej**).
2.  **Ikat/Cipta Buku Memori:** Pastikan sembang anda mempunyai Lorebook khusus untuk memori. STMB biasanya akan meletakkan memori dalam buku jenis Global, tetapi sering menggunakan lorebook yang terikat dengan sembang untuk kesederhanaan.
3.  **Berbual Seperti Biasa:** Semasa sembang anda berjalan, STMB secara automatik menjana ringkasan yang padat, berkualiti tinggi dan berstruktur. Memori ini kini menjadi "penumpang" yang cuba menaiki "penerbangan" konteks terhad AI.

## Langkah 3: Jamin Keutamaan (Tugas STLO)

Ini adalah langkah yang paling kritikal. Anda mesti menggunakan STLO untuk menurunkan keutamaan **buku STMB yang terikat dengan sembang** anda secara manual sambil meningkatkan **Keperluan Watak** anda.

### A. Pecahkan Perangkap "Sembang Dahulu"
Secara lalai, buku memori yang terikat dengan sembang diberi **keutamaan tertinggi** (Sembang Dahulu), berisiko menggunakan terlalu banyak ruang konteks dan mengunci lorebook Dunia, Watak dan/atau Persona yang lain. STLO membolehkan anda membetulkan ini dengan menugaskan semula tahap keutamaan yang disesuaikan dan spesifik.

### B. Timbunan Keutamaan yang Disyorkan

Gunakan STLO untuk menetapkan keutamaan tersuai untuk semua lorebook yang berkaitan:

| Lorebook/Memori | Keutamaan STLO Tersuai | Mengapa? (TIMBUNAN) |
| :--- | :--- | :--- |
| **Keperluan Watak** (Personaliti, Penerangan) | **Keutamaan 5** (Tertinggi) | **Dimuatkan Dahulu** untuk mengunci identiti dan suara watak teras sebelum apa-apa lagi dimuatkan. |
| **Buku Memori STMB** (Memori Anda) | **Keutamaan 4** (Tinggi) | **Dimuatkan Kedua.** Cukup tinggi untuk memastikan memori disertakan, tetapi cukup rendah untuk menjamin keperluan dimuatkan terlebih dahulu. |
| **Lore Persona** (Identiti Anda) | **Keutamaan 3** (Lalai/Biasa) | **Dimuatkan Ketiga.** Maklumat identiti pengguna dilihat selepas persediaan teras watak dan memori kritikal. |
| **Lore Umum/Rawak** (Memori Peristiwa, Lore Dunia) | **Keutamaan 1-2** (Terendah) | **Dimuatkan Terakhir.** Maklumat yang kurang kritikal hanya disertakan jika ruang masih ada. |

### C. Tetapkan Had Belanjawan
Untuk Buku Memori STMB (dan mana-mana lorebook padat yang lain), gunakan fungsi **Belanjawan** STLO untuk menghalangnya daripada menggunakan semua ruang, walaupun keutamaannya tinggi.

1.  Buka konfigurasi STLO untuk lorebook STMB anda.
2.  Tetapkan had **Belanjawan** (cth., **token tetap** seperti `5000`, atau **Peratusan Konteks** seperti `15%`).
3.  Ini menjamin bahawa walaupun lorebook diproses awal, ia akan **memangkas dirinya sendiri** secara automatik untuk mematuhi had kapasiti anda, meninggalkan ruang untuk semua lorebook Keutamaan 3, 2, dan 1 yang lain.
