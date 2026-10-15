import { fold } from './academic/scheduleParser';

// ---------------------------------------------------------------------------
// Universities in Türkiye (YÖK list: 205 state and foundation universities), with city and the
// web / e-mail domain. Source: Wikipedia "Türkiye'deki üniversiteler listesi" + Wikidata (P856).
// Academic calendars are not part of this list: an admin publishes them per university
// (Yönetici Paneli › Üniversiteler) and students of that university receive them automatically.
// ---------------------------------------------------------------------------

export interface University {
  id: string;
  name: string;
  city: string;
  type: 'devlet' | 'vakif';
  /** Web and e-mail domain, e.g. ktu.edu.tr (student addresses such as 123@ogr.ktu.edu.tr match it). */
  domain: string | null;
}

type Row = [id: string, name: string, city: string, type: 'd' | 'v', domain: string | null];

// prettier-ignore
const ROWS: Row[] = [
  ['abdullah-gul', 'Abdullah Gül Üniversitesi', 'Kayseri', 'd', 'agu.edu.tr'],
  ['acibadem', 'Acıbadem Üniversitesi', 'İstanbul', 'v', 'acibadem.edu.tr'],
  ['adana-alparslan-turkes-bilim-ve-teknoloji', 'Adana Alparslan Türkeş Bilim ve Teknoloji Üniversitesi', 'Adana', 'd', 'atu.edu.tr'],
  ['adiyaman', 'Adıyaman Üniversitesi', 'Adıyaman', 'd', 'adiyaman.edu.tr'],
  ['afyon-kocatepe', 'Afyon Kocatepe Üniversitesi', 'Afyonkarahisar', 'd', 'aku.edu.tr'],
  ['afyonkarahisar-saglik-bilimleri', 'Afyonkarahisar Sağlık Bilimleri Üniversitesi', 'Afyonkarahisar', 'd', 'afsu.edu.tr'],
  ['agri-ibrahim-cecen', 'Ağrı İbrahim Çeçen Üniversitesi', 'Ağrı', 'd', 'agri.edu.tr'],
  ['akdeniz', 'Akdeniz Üniversitesi', 'Antalya', 'd', 'akdeniz.edu.tr'],
  ['aksaray', 'Aksaray Üniversitesi', 'Aksaray', 'd', 'aksaray.edu.tr'],
  ['alanya-alaaddin-keykubat', 'Alanya Alaaddin Keykubat Üniversitesi', 'Antalya', 'd', 'alanya.edu.tr'],
  ['alanya', 'Alanya Üniversitesi', 'Antalya', 'v', 'ahep.edu.tr'],
  ['altinbas', 'Altınbaş Üniversitesi', 'İstanbul', 'v', 'altinbas.edu.tr'],
  ['amasya', 'Amasya Üniversitesi', 'Amasya', 'd', 'amasya.edu.tr'],
  ['anadolu', 'Anadolu Üniversitesi', 'Eskişehir', 'd', 'anadolu.edu.tr'],
  ['ankara-bilim', 'Ankara Bilim Üniversitesi', 'Ankara', 'v', 'ankarabilim.edu.tr'],
  ['ankara-haci-bayram-veli', 'Ankara Hacı Bayram Veli Üniversitesi', 'Ankara', 'd', 'hacibayram.edu.tr'],
  ['ankara-medipol', 'Ankara Medipol Üniversitesi', 'Ankara', 'v', 'ankaramedipol.edu.tr'],
  ['ankara-muzik-ve-guzel-sanatlar', 'Ankara Müzik ve Güzel Sanatlar Üniversitesi', 'Ankara', 'd', 'mgu.edu.tr'],
  ['ankara-sosyal-bilimler', 'Ankara Sosyal Bilimler Üniversitesi', 'Ankara', 'd', 'asbu.edu.tr'],
  ['ankara', 'Ankara Üniversitesi', 'Ankara', 'd', 'ankara.edu.tr'],
  ['ankara-yildirim-beyazit', 'Ankara Yıldırım Beyazıt Üniversitesi', 'Ankara', 'd', 'ybu.edu.tr'],
  ['antalya-belek', 'Antalya Belek Üniversitesi', 'Antalya', 'v', 'akev.edu.tr'],
  ['antalya-bilim', 'Antalya Bilim Üniversitesi', 'Antalya', 'v', 'antalya.edu.tr'],
  ['ardahan', 'Ardahan Üniversitesi', 'Ardahan', 'd', 'ardahan.edu.tr'],
  ['artvin-coruh', 'Artvin Çoruh Üniversitesi', 'Artvin', 'd', 'artvin.edu.tr'],
  ['ataturk', 'Atatürk Üniversitesi', 'Erzurum', 'd', 'atauni.edu.tr'],
  ['atilim', 'Atılım Üniversitesi', 'Ankara', 'v', 'atilim.edu.tr'],
  ['avrasya', 'Avrasya Üniversitesi', 'Trabzon', 'v', 'avrasya.edu.tr'],
  ['aydin-adnan-menderes', 'Aydın Adnan Menderes Üniversitesi', 'Aydın', 'd', 'adu.edu.tr'],
  ['bahcesehir', 'Bahçeşehir Üniversitesi', 'İstanbul', 'v', 'bahcesehir.edu.tr'],
  ['balikesir', 'Balıkesir Üniversitesi', 'Balıkesir', 'd', 'balikesir.edu.tr'],
  ['bandirma-onyedi-eylul', 'Bandırma Onyedi Eylül Üniversitesi', 'Balıkesir', 'd', 'bandirma.edu.tr'],
  ['bartin', 'Bartın Üniversitesi', 'Bartın', 'd', 'bartin.edu.tr'],
  ['baskent', 'Başkent Üniversitesi', 'Ankara', 'v', 'baskent.edu.tr'],
  ['batman', 'Batman Üniversitesi', 'Batman', 'd', 'batman.edu.tr'],
  ['bayburt', 'Bayburt Üniversitesi', 'Bayburt', 'd', 'bayburt.edu.tr'],
  ['beykoz', 'Beykoz Üniversitesi', 'İstanbul', 'v', 'beykoz.edu.tr'],
  ['bezmialem-vakif', 'Bezmialem Vakıf Üniversitesi', 'İstanbul', 'v', 'bezmialem.edu.tr'],
  ['bilecik-seyh-edebali', 'Bilecik Şeyh Edebali Üniversitesi', 'Bilecik', 'd', 'bilecik.edu.tr'],
  ['bingol', 'Bingöl Üniversitesi', 'Bingöl', 'd', 'bingol.edu.tr'],
  ['biruni', 'Biruni Üniversitesi', 'İstanbul', 'v', 'biruni.edu.tr'],
  ['bitlis-eren', 'Bitlis Eren Üniversitesi', 'Bitlis', 'd', 'bitliseren.edu.tr'],
  ['bogazici', 'Boğaziçi Üniversitesi', 'İstanbul', 'd', 'bogazici.edu.tr'],
  ['bolu-abant-izzet-baysal', 'Bolu Abant İzzet Baysal Üniversitesi', 'Bolu', 'd', 'ibu.edu.tr'],
  ['burdur-mehmet-akif-ersoy', 'Burdur Mehmet Akif Ersoy Üniversitesi', 'Burdur', 'd', 'mehmetakif.edu.tr'],
  ['bursa-teknik', 'Bursa Teknik Üniversitesi', 'Bursa', 'd', 'btu.edu.tr'],
  ['bursa-uludag', 'Bursa Uludağ Üniversitesi', 'Bursa', 'd', 'uludag.edu.tr'],
  ['cag', 'Çağ Üniversitesi', 'Mersin', 'v', 'cag.edu.tr'],
  ['canakkale-onsekiz-mart', 'Çanakkale Onsekiz Mart Üniversitesi', 'Çanakkale', 'd', 'comu.edu.tr'],
  ['cankaya', 'Çankaya Üniversitesi', 'Ankara', 'v', 'cankaya.edu.tr'],
  ['cankiri-karatekin', 'Çankırı Karatekin Üniversitesi', 'Çankırı', 'd', 'karatekin.edu.tr'],
  ['cukurova', 'Çukurova Üniversitesi', 'Adana', 'd', 'cu.edu.tr'],
  ['demiroglu-bilim', 'Demiroğlu Bilim Üniversitesi', 'İstanbul', 'v', 'istanbulbilim.edu.tr'],
  ['dicle', 'Dicle Üniversitesi', 'Diyarbakır', 'd', 'dicle.edu.tr'],
  ['dogus', 'Doğuş Üniversitesi', 'İstanbul', 'v', 'dogus.edu.tr'],
  ['dokuz-eylul', 'Dokuz Eylül Üniversitesi', 'İzmir', 'd', 'deu.edu.tr'],
  ['duzce', 'Düzce Üniversitesi', 'Düzce', 'd', 'duzce.edu.tr'],
  ['ege', 'Ege Üniversitesi', 'İzmir', 'd', 'ege.edu.tr'],
  ['erciyes', 'Erciyes Üniversitesi', 'Kayseri', 'd', 'erciyes.edu.tr'],
  ['erzincan-binali-yildirim', 'Erzincan Binali Yıldırım Üniversitesi', 'Erzincan', 'd', 'ebyu.edu.tr'],
  ['erzurum-teknik', 'Erzurum Teknik Üniversitesi', 'Erzurum', 'd', 'erzurum.edu.tr'],
  ['eskisehir-osmangazi', 'Eskişehir Osmangazi Üniversitesi', 'Eskişehir', 'd', 'ogu.edu.tr'],
  ['eskisehir-teknik', 'Eskişehir Teknik Üniversitesi', 'Eskişehir', 'd', 'eskisehir.edu.tr'],
  ['fatih-sultan-mehmet-vakif', 'Fatih Sultan Mehmet Vakıf Üniversitesi', 'İstanbul', 'v', 'fsm.edu.tr'],
  ['fenerbahce', 'Fenerbahçe Üniversitesi', 'İstanbul', 'v', 'fbu.edu.tr'],
  ['firat', 'Fırat Üniversitesi', 'Elazığ', 'd', 'firat.edu.tr'],
  ['galatasaray', 'Galatasaray Üniversitesi', 'İstanbul', 'd', 'gsu.edu.tr'],
  ['gazi', 'Gazi Üniversitesi', 'Ankara', 'd', 'gazi.edu.tr'],
  ['gaziantep-islam-bilim-ve-teknoloji', 'Gaziantep İslam Bilim ve Teknoloji Üniversitesi', 'Gaziantep', 'd', 'gibtu.edu.tr'],
  ['gaziantep', 'Gaziantep Üniversitesi', 'Gaziantep', 'd', 'gantep.edu.tr'],
  ['gebze-teknik', 'Gebze Teknik Üniversitesi', 'Kocaeli', 'd', 'gtu.edu.tr'],
  ['giresun', 'Giresun Üniversitesi', 'Giresun', 'd', 'giresun.edu.tr'],
  ['gumushane', 'Gümüşhane Üniversitesi', 'Gümüşhane', 'd', 'gumushane.edu.tr'],
  ['hacettepe', 'Hacettepe Üniversitesi', 'Ankara', 'd', 'hacettepe.edu.tr'],
  ['hakkari', 'Hakkari Üniversitesi', 'Hakkâri', 'd', 'hu.edu.tr'],
  ['halic', 'Haliç Üniversitesi', 'İstanbul', 'v', 'halic.edu.tr'],
  ['harran', 'Harran Üniversitesi', 'Şanlıurfa', 'd', 'harran.edu.tr'],
  ['hasan-kalyoncu', 'Hasan Kalyoncu Üniversitesi', 'Gaziantep', 'v', 'hku.edu.tr'],
  ['hatay-mustafa-kemal', 'Hatay Mustafa Kemal Üniversitesi', 'Hatay', 'd', 'mku.edu.tr'],
  ['hitit', 'Hitit Üniversitesi', 'Çorum', 'd', 'hitit.edu.tr'],
  ['ibn-haldun', 'İbn Haldun Üniversitesi', 'İstanbul', 'v', 'ibnhaldun.edu.tr'],
  ['igdir', 'Iğdır Üniversitesi', 'Iğdır', 'd', 'igdir.edu.tr'],
  ['ihsan-dogramaci-bilkent', 'İhsan Doğramacı Bilkent Üniversitesi', 'Ankara', 'v', 'bilkent.edu.tr'],
  ['inonu', 'İnönü Üniversitesi', 'Malatya', 'd', 'inonu.edu.tr'],
  ['isik', 'Işık Üniversitesi', 'İstanbul', 'v', 'isikun.edu.tr'],
  ['iskenderun-teknik', 'İskenderun Teknik Üniversitesi', 'Hatay', 'd', 'iste.edu.tr'],
  ['isparta-uygulamali-bilimler', 'Isparta Uygulamalı Bilimler Üniversitesi', 'Isparta', 'd', 'isparta.edu.tr'],
  ['istanbul-29-mayis', 'İstanbul 29 Mayıs Üniversitesi', 'İstanbul', 'v', '29mayis.edu.tr'],
  ['istanbul-arel', 'İstanbul Arel Üniversitesi', 'İstanbul', 'v', 'arel.edu.tr'],
  ['istanbul-atlas', 'İstanbul Atlas Üniversitesi', 'İstanbul', 'v', 'atlas.edu.tr'],
  ['istanbul-aydin', 'İstanbul Aydın Üniversitesi', 'İstanbul', 'v', 'aydin.edu.tr'],
  ['istanbul-beykent', 'İstanbul Beykent Üniversitesi', 'İstanbul', 'v', 'beykent.edu.tr'],
  ['istanbul-bilgi', 'İstanbul Bilgi Üniversitesi', 'İstanbul', 'v', 'bilgi.edu.tr'],
  ['istanbul-esenyurt', 'İstanbul Esenyurt Üniversitesi', 'İstanbul', 'v', 'esenyurt.edu.tr'],
  ['istanbul-galata', 'İstanbul Galata Üniversitesi', 'İstanbul', 'v', 'galata.edu.tr'],
  ['istanbul-gedik', 'İstanbul Gedik Üniversitesi', 'İstanbul', 'v', 'gedik.edu.tr'],
  ['istanbul-gelisim', 'İstanbul Gelişim Üniversitesi', 'İstanbul', 'v', 'gelisim.edu.tr'],
  ['istanbul-kent', 'İstanbul Kent Üniversitesi', 'İstanbul', 'v', 'kent.edu.tr'],
  ['istanbul-kultur', 'İstanbul Kültür Üniversitesi', 'İstanbul', 'v', 'iku.edu.tr'],
  ['istanbul-medeniyet', 'İstanbul Medeniyet Üniversitesi', 'İstanbul', 'd', 'medeniyet.edu.tr'],
  ['istanbul-medipol', 'İstanbul Medipol Üniversitesi', 'İstanbul', 'v', 'medipol.edu.tr'],
  ['istanbul-nisantasi', 'İstanbul Nişantaşı Üniversitesi', 'İstanbul', 'v', 'nisantasi.edu.tr'],
  ['istanbul-okan', 'İstanbul Okan Üniversitesi', 'İstanbul', 'v', 'okan.edu.tr'],
  ['istanbul-rumeli', 'İstanbul Rumeli Üniversitesi', 'İstanbul', 'v', 'rumeli.edu.tr'],
  ['istanbul-sabahattin-zaim', 'İstanbul Sabahattin Zaim Üniversitesi', 'İstanbul', 'v', 'izu.edu.tr'],
  ['istanbul-saglik-ve-teknoloji', 'İstanbul Sağlık ve Teknoloji Üniversitesi', 'İstanbul', 'v', 'istun.edu.tr'],
  ['istanbul-teknik', 'İstanbul Teknik Üniversitesi', 'İstanbul', 'd', 'itu.edu.tr'],
  ['istanbul-ticaret', 'İstanbul Ticaret Üniversitesi', 'İstanbul', 'v', 'ticaret.edu.tr'],
  ['istanbul-topkapi', 'İstanbul Topkapı Üniversitesi', 'İstanbul', 'v', 'topkapi.edu.tr'],
  ['istanbul', 'İstanbul Üniversitesi', 'İstanbul', 'd', 'istanbul.edu.tr'],
  ['istanbul-cerrahpasa', 'İstanbul Üniversitesi-Cerrahpaşa', 'İstanbul', 'd', 'iuc.edu.tr'],
  ['istanbul-yeni-yuzyil', 'İstanbul Yeni Yüzyıl Üniversitesi', 'İstanbul', 'v', 'yeniyuzyil.edu.tr'],
  ['istinye', 'İstinye Üniversitesi', 'İstanbul', 'v', 'istinye.edu.tr'],
  ['izmir-bakircay', 'İzmir Bakırçay Üniversitesi', 'İzmir', 'd', 'bakircay.edu.tr'],
  ['izmir-demokrasi', 'İzmir Demokrasi Üniversitesi', 'İzmir', 'd', 'idu.edu.tr'],
  ['izmir-ekonomi', 'İzmir Ekonomi Üniversitesi', 'İzmir', 'v', 'ieu.edu.tr'],
  ['izmir-katip-celebi', 'İzmir Kâtip Çelebi Üniversitesi', 'İzmir', 'd', 'ikc.edu.tr'],
  ['izmir-tinaztepe', 'İzmir Tınaztepe Üniversitesi', 'İzmir', 'v', 'tinaztepe.edu.tr'],
  ['izmir-yuksek-teknoloji-enstitusu', 'İzmir Yüksek Teknoloji Enstitüsü', 'İzmir', 'd', 'iyte.edu.tr'],
  ['jandarma-ve-sahil-guvenlik-akademisi', 'Jandarma ve Sahil Güvenlik Akademisi', 'Ankara', 'd', 'jsga.edu.tr'],
  ['kadir-has', 'Kadir Has Üniversitesi', 'İstanbul', 'v', 'khas.edu.tr'],
  ['kafkas', 'Kafkas Üniversitesi', 'Kars', 'd', 'kafkas.edu.tr'],
  ['kahramanmaras-istiklal', 'Kahramanmaraş İstiklal Üniversitesi', 'Kahramanmaraş', 'd', 'istiklal.edu.tr'],
  ['kahramanmaras-sutcu-imam', 'Kahramanmaraş Sütçü İmam Üniversitesi', 'Kahramanmaraş', 'd', 'ksu.edu.tr'],
  ['kapadokya', 'Kapadokya Üniversitesi', 'Nevşehir', 'v', 'kapadokya.edu.tr'],
  ['karabuk', 'Karabük Üniversitesi', 'Karabük', 'd', 'karabuk.edu.tr'],
  ['karadeniz-teknik', 'Karadeniz Teknik Üniversitesi', 'Trabzon', 'd', 'ktu.edu.tr'],
  ['karamanoglu-mehmetbey', 'Karamanoğlu Mehmetbey Üniversitesi', 'Karaman', 'd', 'kmu.edu.tr'],
  ['kastamonu', 'Kastamonu Üniversitesi', 'Kastamonu', 'd', 'kastamonu.edu.tr'],
  ['kayseri', 'Kayseri Üniversitesi', 'Kayseri', 'd', 'kayseri.edu.tr'],
  ['kilis-7-aralik', 'Kilis 7 Aralık Üniversitesi', 'Kilis', 'd', 'kilis.edu.tr'],
  ['kirikkale', 'Kırıkkale Üniversitesi', 'Kırıkkale', 'd', 'kku.edu.tr'],
  ['kirklareli', 'Kırklareli Üniversitesi', 'Kırklareli', 'd', 'kirklareli.edu.tr'],
  ['kirsehir-ahi-evran', 'Kırşehir Ahi Evran Üniversitesi', 'Kırşehir', 'd', 'ahievran.edu.tr'],
  ['koc', 'Koç Üniversitesi', 'İstanbul', 'v', 'ku.edu.tr'],
  ['kocaeli-saglik-ve-teknoloji', 'Kocaeli Sağlık ve Teknoloji Üniversitesi', 'Kocaeli', 'v', 'kocaelisaglik.edu.tr'],
  ['kocaeli', 'Kocaeli Üniversitesi', 'Kocaeli', 'd', 'kocaeli.edu.tr'],
  ['konya-gida-ve-tarim', 'Konya Gıda ve Tarım Üniversitesi', 'Konya', 'v', 'gidatarim.edu.tr'],
  ['konya-teknik', 'Konya Teknik Üniversitesi', 'Konya', 'd', 'ktun.edu.tr'],
  ['kto-karatay', 'KTO Karatay Üniversitesi', 'Konya', 'v', 'karatay.edu.tr'],
  ['kutahya-dumlupinar', 'Kütahya Dumlupınar Üniversitesi', 'Kütahya', 'd', 'dpu.edu.tr'],
  ['kutahya-saglik-bilimleri', 'Kütahya Sağlık Bilimleri Üniversitesi', 'Kütahya', 'd', 'ksbu.edu.tr'],
  ['lokman-hekim', 'Lokman Hekim Üniversitesi', 'Ankara', 'v', 'lokmanhekim.edu.tr'],
  ['malatya-turgut-ozal', 'Malatya Turgut Özal Üniversitesi', 'Malatya', 'd', 'ozal.edu.tr'],
  ['maltepe', 'Maltepe Üniversitesi', 'İstanbul', 'v', 'maltepe.edu.tr'],
  ['manisa-celal-bayar', 'Manisa Celal Bayar Üniversitesi', 'Manisa', 'd', 'cbu.edu.tr'],
  ['mardin-artuklu', 'Mardin Artuklu Üniversitesi', 'Mardin', 'd', 'artuklu.edu.tr'],
  ['marmara', 'Marmara Üniversitesi', 'İstanbul', 'd', 'marmara.edu.tr'],
  ['mef', 'MEF Üniversitesi', 'İstanbul', 'v', 'mef.edu.tr'],
  ['mersin', 'Mersin Üniversitesi', 'Mersin', 'd', 'mersin.edu.tr'],
  ['milli-savunma', 'Milli Savunma Üniversitesi', 'İstanbul', 'd', 'msu.edu.tr'],
  ['mimar-sinan-guzel-sanatlar', 'Mimar Sinan Güzel Sanatlar Üniversitesi', 'İstanbul', 'd', 'msgsu.edu.tr'],
  ['mudanya', 'Mudanya Üniversitesi', 'Bursa', 'v', 'mudanya.edu.tr'],
  ['mugla-sitki-kocman', 'Muğla Sıtkı Koçman Üniversitesi', 'Muğla', 'd', 'mu.edu.tr'],
  ['munzur', 'Munzur Üniversitesi', 'Tunceli', 'd', 'munzur.edu.tr'],
  ['mus-alparslan', 'Muş Alparslan Üniversitesi', 'Muş', 'd', 'alparslan.edu.tr'],
  ['necmettin-erbakan', 'Necmettin Erbakan Üniversitesi', 'Konya', 'd', 'konya.edu.tr'],
  ['nevsehir-haci-bektas-veli', 'Nevşehir Hacı Bektaş Veli Üniversitesi', 'Nevşehir', 'd', 'nevsehir.edu.tr'],
  ['nigde-omer-halisdemir', 'Niğde Ömer Halisdemir Üniversitesi', 'Niğde', 'd', 'nigde.edu.tr'],
  ['nuh-naci-yazgan', 'Nuh Naci Yazgan Üniversitesi', 'Kayseri', 'v', 'nny.edu.tr'],
  ['ondokuz-mayis', 'Ondokuz Mayıs Üniversitesi', 'Samsun', 'd', 'omu.edu.tr'],
  ['ordu', 'Ordu Üniversitesi', 'Ordu', 'd', 'odu.edu.tr'],
  ['orta-dogu-teknik', 'Orta Doğu Teknik Üniversitesi', 'Ankara', 'd', 'metu.edu.tr'],
  ['osmaniye-korkut-ata', 'Osmaniye Korkut Ata Üniversitesi', 'Osmaniye', 'd', 'osmaniye.edu.tr'],
  ['ostim-teknik', 'Ostim Teknik Üniversitesi', 'Ankara', 'v', 'ostimteknik.edu.tr'],
  ['ozyegin', 'Özyeğin Üniversitesi', 'İstanbul', 'v', 'ozyegin.edu.tr'],
  ['pamukkale', 'Pamukkale Üniversitesi', 'Denizli', 'd', 'pau.edu.tr'],
  ['piri-reis', 'Piri Reis Üniversitesi', 'İstanbul', 'v', 'pirireis.edu.tr'],
  ['polis-akademisi', 'Polis Akademisi', 'Ankara', 'd', 'pa.edu.tr'],
  ['recep-tayyip-erdogan', 'Recep Tayyip Erdoğan Üniversitesi', 'Rize', 'd', 'erdogan.edu.tr'],
  ['sabanci', 'Sabancı Üniversitesi', 'İstanbul', 'v', 'sabanciuniv.edu'],
  ['saglik-bilimleri', 'Sağlık Bilimleri Üniversitesi', 'İstanbul', 'd', 'sbu.edu.tr'],
  ['sakarya', 'Sakarya Üniversitesi', 'Sakarya', 'd', 'sakarya.edu.tr'],
  ['sakarya-uygulamali-bilimler', 'Sakarya Uygulamalı Bilimler Üniversitesi', 'Sakarya', 'd', 'subu.edu.tr'],
  ['samsun', 'Samsun Üniversitesi', 'Samsun', 'd', 'samsun.edu.tr'],
  ['sanko', 'Sanko Üniversitesi', 'Gaziantep', 'v', 'sanko.edu.tr'],
  ['selcuk', 'Selçuk Üniversitesi', 'Konya', 'd', 'selcuk.edu.tr'],
  ['siirt', 'Siirt Üniversitesi', 'Siirt', 'd', 'siirt.edu.tr'],
  ['sinop', 'Sinop Üniversitesi', 'Sinop', 'd', 'sinop.edu.tr'],
  ['sirnak', 'Şırnak Üniversitesi', 'Şırnak', 'd', 'sirnak.edu.tr'],
  ['sivas-bilim-ve-teknoloji', 'Sivas Bilim ve Teknoloji Üniversitesi', 'Sivas', 'd', 'sivas.edu.tr'],
  ['sivas-cumhuriyet', 'Sivas Cumhuriyet Üniversitesi', 'Sivas', 'd', 'cumhuriyet.edu.tr'],
  ['suleyman-demirel', 'Süleyman Demirel Üniversitesi', 'Isparta', 'd', 'sdu.edu.tr'],
  ['tarsus', 'Tarsus Üniversitesi', 'Mersin', 'd', 'tarsus.edu.tr'],
  ['ted', 'TED Üniversitesi', 'Ankara', 'v', 'tedu.edu.tr'],
  ['tekirdag-namik-kemal', 'Tekirdağ Namık Kemal Üniversitesi', 'Tekirdağ', 'd', 'nku.edu.tr'],
  ['tobb-ekonomi-ve-teknoloji', 'TOBB Ekonomi ve Teknoloji Üniversitesi', 'Ankara', 'v', 'etu.edu.tr'],
  ['tokat-gaziosmanpasa', 'Tokat Gaziosmanpaşa Üniversitesi', 'Tokat', 'd', 'gop.edu.tr'],
  ['toros', 'Toros Üniversitesi', 'Mersin', 'v', 'toros.edu.tr'],
  ['trabzon', 'Trabzon Üniversitesi', 'Trabzon', 'd', 'trabzon.edu.tr'],
  ['trakya', 'Trakya Üniversitesi', 'Edirne', 'd', 'trakya.edu.tr'],
  ['turk-hava-kurumu', 'Türk Hava Kurumu Üniversitesi', 'Ankara', 'v', 'thk.edu.tr'],
  ['turk-alman', 'Türk-Alman Üniversitesi', 'İstanbul', 'd', 'tau.edu.tr'],
  ['turk-japon-bilim-ve-teknoloji', 'Türk-Japon Bilim ve Teknoloji Üniversitesi', 'İstanbul', 'd', null],
  ['ufuk', 'Ufuk Üniversitesi', 'Ankara', 'v', 'ufuk.edu.tr'],
  ['usak', 'Uşak Üniversitesi', 'Uşak', 'd', 'usak.edu.tr'],
  ['uskudar', 'Üsküdar Üniversitesi', 'İstanbul', 'v', 'uskudar.edu.tr'],
  ['van-yuzuncu-yil', 'Van Yüzüncü Yıl Üniversitesi', 'Van', 'd', 'yyu.edu.tr'],
  ['yalova', 'Yalova Üniversitesi', 'Yalova', 'd', 'yalova.edu.tr'],
  ['yasar', 'Yaşar Üniversitesi', 'İzmir', 'v', 'yasar.edu.tr'],
  ['yeditepe', 'Yeditepe Üniversitesi', 'İstanbul', 'v', 'yeditepe.edu.tr'],
  ['yildiz-teknik', 'Yıldız Teknik Üniversitesi', 'İstanbul', 'd', 'yildiz.edu.tr'],
  ['yozgat-bozok', 'Yozgat Bozok Üniversitesi', 'Yozgat', 'd', 'bozok.edu.tr'],
  ['yuksek-ihtisas', 'Yüksek İhtisas Üniversitesi', 'Ankara', 'v', 'yuksekihtisasuniversitesi.edu.tr'],
  ['zonguldak-bulent-ecevit', 'Zonguldak Bülent Ecevit Üniversitesi', 'Zonguldak', 'd', 'beun.edu.tr'],];

export const UNIVERSITIES: University[] = ROWS.map(([id, name, city, type, domain]) => ({
  id,
  name,
  city,
  type: type === 'd' ? 'devlet' : 'vakif',
  domain,
}));

const BY_ID = new Map(UNIVERSITIES.map((u) => [u.id, u]));
const key = (s: string) => fold(s).replace(/[^a-z0-9]/g, '');
const BY_NAME = new Map(UNIVERSITIES.map((u) => [key(u.name), u]));

export function universityById(id: string | null | undefined): University | null {
  return (id && BY_ID.get(id)) || null;
}

/** Exact name match, ignoring case, Turkish letters and punctuation. */
export function universityByName(name: string | null | undefined): University | null {
  if (!name) return null;
  return BY_NAME.get(key(name)) ?? BY_NAME.get(key(`${name} Üniversitesi`)) ?? null;
}

/** University whose domain the address belongs to (123@ogr.ktu.edu.tr → KTÜ). */
export function universityByEmail(email: string | null | undefined): University | null {
  const domain = email?.split('@')[1]?.trim().toLowerCase();
  if (!domain) return null;
  return UNIVERSITIES.find((u) => u.domain && (domain === u.domain || domain.endsWith(`.${u.domain}`))) ?? null;
}

/**
 * Profile fields for a submitted school: a catalog entry (picked from the list or typed with its exact
 * name) stores its id and official name; anything else is kept as typed.
 */
export function catalogFields(input: { universityId?: string | null; university: string }): { universityId: string | null; university: string } {
  const u = universityById(input.universityId) ?? universityByName(input.university);
  return u ? { universityId: u.id, university: u.name } : { universityId: null, university: input.university };
}

/** Search by name, city or domain; every word must match. */
export function searchUniversities(query: string, limit = 12): University[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return UNIVERSITIES.slice(0, limit);
  const out: University[] = [];
  for (const u of UNIVERSITIES) {
    const hay = fold(`${u.name} ${u.city} ${u.domain ?? ''}`);
    if (words.every((w) => hay.includes(w))) out.push(u);
    if (out.length >= limit) break;
  }
  return out;
}

export const UNIVERSITY_TYPE_LABEL: Record<University['type'], string> = { devlet: 'Devlet', vakif: 'Vakıf' };
