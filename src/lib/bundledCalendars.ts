// Academic calendars collected from the universities' official sites (data/akademik-takvimler).
// Published automatically the first time the server needs them; see seedBundledCalendars().
// Add a university: put <universityId>.json next to the others and import it here.

import c_ankara from '../../data/akademik-takvimler/ankara.json';
import c_ataturk from '../../data/akademik-takvimler/ataturk.json';
import c_avrasya from '../../data/akademik-takvimler/avrasya.json';
import c_bogazici from '../../data/akademik-takvimler/bogazici.json';
import c_bursa_uludag from '../../data/akademik-takvimler/bursa-uludag.json';
import c_canakkale_onsekiz_mart from '../../data/akademik-takvimler/canakkale-onsekiz-mart.json';
import c_cukurova from '../../data/akademik-takvimler/cukurova.json';
import c_dokuz_eylul from '../../data/akademik-takvimler/dokuz-eylul.json';
import c_ege from '../../data/akademik-takvimler/ege.json';
import c_gazi from '../../data/akademik-takvimler/gazi.json';
import c_hacettepe from '../../data/akademik-takvimler/hacettepe.json';
import c_istanbul_teknik from '../../data/akademik-takvimler/istanbul-teknik.json';
import c_istanbul from '../../data/akademik-takvimler/istanbul.json';
import c_karadeniz_teknik from '../../data/akademik-takvimler/karadeniz-teknik.json';
import c_marmara from '../../data/akademik-takvimler/marmara.json';
import c_ondokuz_mayis from '../../data/akademik-takvimler/ondokuz-mayis.json';
import c_orta_dogu_teknik from '../../data/akademik-takvimler/orta-dogu-teknik.json';
import c_selcuk from '../../data/akademik-takvimler/selcuk.json';
import c_trabzon from '../../data/akademik-takvimler/trabzon.json';
import c_yildiz_teknik from '../../data/akademik-takvimler/yildiz-teknik.json';

export interface BundledCalendar {
  universityId: string;
  /** Academic year, e.g. 2026-2027; a newer year is published again */
  year: string;
  sourceUrl: string;
  terms: unknown;
}

export const BUNDLED_CALENDARS: BundledCalendar[] = [
  c_ankara,
  c_ataturk,
  c_avrasya,
  c_bogazici,
  c_bursa_uludag,
  c_canakkale_onsekiz_mart,
  c_cukurova,
  c_dokuz_eylul,
  c_ege,
  c_gazi,
  c_hacettepe,
  c_istanbul_teknik,
  c_istanbul,
  c_karadeniz_teknik,
  c_marmara,
  c_ondokuz_mayis,
  c_orta_dogu_teknik,
  c_selcuk,
  c_trabzon,
  c_yildiz_teknik,
];
