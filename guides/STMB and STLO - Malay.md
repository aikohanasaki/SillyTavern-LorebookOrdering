[Pautan ke ST Memory Books (STMB)](https://github.com/aikohanasaki/SillyTavern-MemoryBooks) | [Pautan ke ST Lorebook Ordering (STLO)](https://github.com/aikohanasaki/SillyTavern-LorebookOrdering)

# 🧠 Panduan Memori Terunggul: STMB + STLO

ST Memory Books (STMB) adalah penting untuk **menjana kandungan memori**, dan ST Lorebook Ordering (STLO) adalah penting untuk **menjamin kandungan tersebut benar-benar digunakan** oleh AI. Apabila digunakan bersama, mereka menyelesaikan masalah teras **Pengecualian Memori**.

## Langkah 1: Sediakan Peringkat (Asas)

**Paksa "Disusun Sama Rata":** Anda mesti memastikan tetapan World Info (WI) lalai SillyTavern dikonfigurasi agar STLO dapat mengambil alih. Dalam **Tetapan World Info** SillyTavern anda, tetapkan **Strategi Sisipan World Info** kepada **"Disusun Sama Rata."** STLO memerlukan strategi ini untuk memintas penapisan kategori tegar kod asas SillyTavern (Sembang → Persona → dsb.).

## Langkah 2: Cipta Kandungan Memori (Tugas STMB)

Gunakan STMB untuk menjana memori jangka panjang anda secara automatik.

1.  **Dayakan Ringkasan Auto:** Pergi ke panel STMB (tongkat sakti 🪄) dan hidupkan **Ringkasan Auto**. Tetapkan selang pilihan anda (contoh, **30 mesej**).
2.  **Ikat/Cipta Buku Memori:** Pastikan sembang anda mempunyai Lorebook khusus untuk memori. STMB biasanya letak memori dalam buku jenis Global, tetapi sering menggunakan lorebook terikat sembang untuk kesederhanaan.
3.  **Berbual Seperti Biasa:** Ketika sembang berjalan, STMB secara automatik menjana ringkasan padat, berkualiti tinggi, dan berstruktur. Memori ini adalah "penumpang" yang cuba menaiki "penerbangan" konteks AI yang terhad.

## Langkah 3: Jamin Keutamaan (Tugas STLO)

Langkah ini paling kritikal. Anda mesti gunakan STLO untuk secara manual menurunkan keutamaan **buku STMB terikat sembang** sambil menaikkan **Keutamaan Asas Watak**.

### A. Pecahkan Perangkap "Sembang Dahulu"
Secara lalai, buku memori terikat sembang diberikan **keutamaan tertinggi** (Sembang Dahulu), berisiko menggunakan terlalu banyak ruang konteks dan mengunci lorebook Dunia, Watak, dan/atau Persona lain. STLO membolehkan anda membetulkan ini dengan menetapkan semula tahap keutamaan khusus.

### B. Susunan Keutamaan Disyorkan

Tetapkan keutamaan khusus untuk semua lorebook berkaitan dengan STLO:

### Fahami Perbezaan Keutamaan vs Posisi

**Posisi** menentukan *di mana* kandungan muncul dalam konteks (Char up, Char down, AN up/down, @D).  
**Keutamaan** menentukan *perlindungan bajet*—apa yang kekal apabila had konteks dicapai.

Angka keutamaan lebih tinggi = lebih dilindungi daripada dipotong. Keutamaan berfungsi **dalam setiap posisi**, bukan antara posisi.

---

### Cadangan Tetapan Keutamaan STLO

| Jenis Lorebook/Memori | Keutamaan Disyorkan | Penjelasan |
|:---------------------|:-------------------|:-----------|
| **Asas Watak** (Personaliti, Penerangan, Sifat Teras) | **Keutamaan 5** (Tertinggi) | **Perlindungan maksimum.** Maklumat kad watak adalah asas identiti dan tingkah laku bot. Tidak boleh dipotong atau hilang. Posisi biasanya ditetapkan pembina bot (Char/AN down atau @D). |
| **Lore Dunia** (Tetapan, Faksi, Lokasi, Peraturan) | **Keutamaan 4** (Tinggi, had bajet) | **Perlindungan tinggi, terkawal.** Lore dunia membekalkan konteks penting untuk bot. Wajar dihadkan supaya tidak membesar, tapi cukup dilindungi supaya maklumat penting tidak hilang. Dipotong selepas asas watak jika perlu. |
| **Persona** (Identiti Anda) | **Keutamaan 2-3** (Sederhana) | **Perlindungan sederhana.** Maklumat identiti pengguna penting untuk respons peribadi, tapi bot masih berfungsi jika beberapa butiran persona dipotong. Kurang kritikal dari asas watak/dunia. |
| **Arahan/Umum** | **Keutamaan 2-3** (Sederhana) | **Perlindungan sederhana.** Arahan tingkah laku umum dan pemformatan. Penting untuk kualiti respons, terutama jika ditempatkan di @D oleh pembina bot, tetapi tidak sepenting integriti watak. |
| **Memori** (STMB, Peristiwa Diingati) | **Keutamaan 1** (Terendah, had bajet) | **Perlindungan minimum, trimming agresif.** Memori patut ditempatkan di Char up (awal konteks) dan berfungsi sebagai maklumat tambahan, bukan utama. Jika banyak memori aktif, kebanyakannya boleh dipotong tanpa merosakkan bot. Had bajet mencegah memori membanjiri maklumat kritikal. |

---

### Prinsip Utama

1. **Lindungi yang tidak boleh diganti:** Asas watak tidak boleh dibina semula jika hilang.
2. **Bajet untuk yang mudah membesar:** Lore dunia dan memori boleh mencetuskan banyak entri—hadkan jumlahnya.
3. **Posisi adalah berasingan:** Item Keutamaan 1 di @D tetap muncul di bawah; tapi akan dipotong dahulu jika konteks penuh.
4. **Percayakan pembina bot:** Bot yang baik letak arahan kritikal di @D tanpa mengira tetapan keutamaan anda.

---

## C. Tetapkan Had Bajet

- **Asas Watak:** Tiada had (biasanya padat)
- **Lore Dunia:** 15,000–25,000 token maks
- **Persona:** Tiada had (biasanya padat)
- **Arahan/Umum:** Tiada had (biasanya padat)
- **Memori:** 5,000–15,000 token maks (pemangkasan agresif)

1.  Buka konfigurasi STLO untuk lorebook STMB anda.
2.  Tetapkan had **Bajet** (contoh, **token tetap** seperti `5000`, atau **Peratusan Konteks** seperti `15%`).
3.  Ini menjamin walaupun lorebook diproses awal, ia **memangkas dirinya sendiri** secara automatik untuk mematuhi had kapasiti, meninggalkan ruang untuk semua lorebook Keutamaan 3, 2, dan 1 lain.

---

**Nota:** Beberapa istilah dan bahagian teknikal wajar disemak semula oleh penterjemah Bahasa Melayu yang mahir untuk memastikan ketepatan dan konsistensi dengan istilah SillyTavern/STMB/STLO.
