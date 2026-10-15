# Hazır akademik takvimler

Üniversitelerin resmî sitelerinden alınmış 2026-2027 önlisans/lisans akademik takvimleri.
Sunucu bunları ilk ihtiyaç duyduğunda (bir öğrenci ders takibini açtığında ya da Yönetici Paneli ›
Üniversiteler açıldığında) **kendiliğinden yayınlar**; o okulun öğrencilerinin ders takibine dönem
tarihleri, sınav haftaları ve okulun kendi tatilleri otomatik eklenir. Milli ve dinî bayramlar
uygulamada ayrıca hesaplandığı için burada yer almaz.

- `<universityId>.json`: takvim (kimlik `src/lib/universities.ts` listesindeki ile aynı).
  - `sourceUrl`: resmî kaynak adresi.
  - `kaynak`: indirilen orijinal dosya (`kaynak/` klasöründe).
- Yönetici bir okulun takvimini panelde düzenler ya da yayından kaldırırsa, hazır takvim o okul için
  bir daha uygulanmaz. Yeni bir öğretim yılının dosyası (`year` değişince) eklendiğinde yeniden yayınlanır.
- Kapsam: genel önlisans/lisans takvimi. Tıp, diş hekimliği, hukuk, hazırlık sınıfı gibi ayrı
  takvimi olan birimler dahil değildir.

Yeni okul eklemek için JSON dosyasını aynı biçimde ekleyip `src/lib/bundledCalendars.ts` içine
import edin.

| Okul | Güz dersleri | Bahar dersleri |
| --- | --- | --- |
| Ankara Üniversitesi | 21.09.2026 – 31.12.2026 | 15.02.2027 – 04.06.2027 |
| Avrasya Üniversitesi | 21.09.2026 – 01.01.2027 | 15.02.2027 – 11.06.2027 |
| Atatürk Üniversitesi | 28.09.2026 – 03.01.2027 | 08.02.2027 – 30.05.2027 |
| Boğaziçi Üniversitesi | 21.09.2026 – 11.12.2026 | 18.01.2027 – 22.04.2027 |
| Bursa Uludağ Üniversitesi | 28.09.2026 – 08.01.2027 | 22.02.2027 – 11.06.2027 |
| Çanakkale Onsekiz Mart Üniversitesi | 14.09.2026 – 25.12.2026 | 15.02.2027 – 04.06.2027 |
| Çukurova Üniversitesi | 14.09.2026 – 25.12.2026 | 01.02.2027 – 28.05.2027 |
| Dokuz Eylül Üniversitesi | 14.09.2026 – 31.12.2026 | 08.02.2027 – 04.06.2027 |
| Ege Üniversitesi | 14.09.2026 – 28.12.2026 | 08.02.2027 – 01.06.2027 |
| Gazi Üniversitesi | 21.09.2026 – 31.12.2026 | 08.02.2027 – 28.05.2027 |
| Hacettepe Üniversitesi | 21.09.2026 – 27.12.2026 | 15.02.2027 – 06.06.2027 |
| İstanbul Teknik Üniversitesi | 28.09.2026 – 31.12.2026 | 01.02.2027 – 30.04.2027 |
| İstanbul Üniversitesi | 14.09.2026 – 18.12.2026 | 25.01.2027 – 30.04.2027 |
| Karadeniz Teknik Üniversitesi | 21.09.2026 – 02.01.2027 | 08.02.2027 – 04.06.2027 |
| Marmara Üniversitesi | 28.09.2026 – 03.01.2027 | 25.01.2027 – 02.05.2027 |
| Ondokuz Mayıs Üniversitesi | 21.09.2026 – 31.12.2026 | 08.02.2027 – 28.05.2027 |
| Orta Doğu Teknik Üniversitesi | 28.09.2026 – 31.12.2026 | 15.02.2027 – 04.06.2027 |
| Selçuk Üniversitesi | 14.09.2026 – 25.12.2026 | 25.01.2027 – 14.05.2027 |
| Trabzon Üniversitesi | 21.09.2026 – 02.01.2027 | 08.02.2027 – 04.06.2027 |
| Yıldız Teknik Üniversitesi | 28.09.2026 – 26.12.2026 | 01.02.2027 – 30.04.2027 |
