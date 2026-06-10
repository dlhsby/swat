/**
 * Typed shapes for the legacy MySQL rows the migration reads. Column names match
 * the legacy `dkp_swat` schema (UPPER_SNAKE) exactly so mysql2 result objects map
 * directly. Only the columns the migration consumes are typed.
 */

export interface LegacyVehicleApplication {
  APLIKASIKENDARAAN_ID: number;
  APLIKASIKENDARAAN_NAMA: string;
}

export interface LegacyFuelCategory {
  KATEGORIBAHANBAKAR_ID: number;
  KATEGORIBAHANBAKAR_NAMA: string;
}

export interface LegacyFuel {
  BAHANBAKAR_ID: number;
  KATEGORIBAHANBAKAR_ID: number;
  BAHANBAKAR_NAMA: string;
  BAHANBAKAR_HARGAPERLITER: number;
}

export interface LegacyLicenseClass {
  SIM_ID: number;
  SIM_NAMA: string;
}

export interface LegacySite {
  SPOT_ID: number;
  KATEGORISPOT_ID: number;
  SPOT_NAMA: string;
  SPOT_ALAMAT: string;
  SPOT_FOTO: string | null;
  SPOT_LATITUDE: string | number | null;
  SPOT_LONGITUDE: string | number | null;
}

export interface LegacyRoute {
  RUTE_ID: number;
  KATEGORIRUTE_ID: number;
  SPOT_ASAL_ID: number;
  SPOT_TUJUAN_ID: number;
  RUTE_JARAK: number;
}

export interface LegacyWasteSource {
  KATEGORISUMBERSAMPAH_ID: number;
  KATEGORISUMBERSAMPAH_KODE: string;
  KATEGORISUMBERSAMPAH_NAMA: string;
  KATEGORISUMBERSAMPAH_KETERANGAN: string | null;
}

export interface LegacyVehicleModel {
  KATEGORIKENDARAAN_ID: number;
  APLIKASIKENDARAAN_ID: number;
  BAHANBAKAR_ID: number;
  KATEGORIKENDARAAN_MERK: string;
  KATEGORIKENDARAAN_KAPASITASBAHANBAKAR: number;
  KATEGORIKENDARAAN_RASIOBAHANBAKARNORMAL: number;
  KATEGORIKENDARAAN_BERATKOSONGNORMAL: number;
  KATEGORIKENDARAAN_BERATBERSIHMUATANMAKSIMUM: number | null;
  KATEGORIKENDARAAN_VOLUMEBERSIHMUATANMAKSIMUM: number | null;
  KATEGORIKENDARAAN_JUMLAHRODA: number;
}

export interface LegacyVehicle {
  KENDARAAN_ID: number;
  SPOT_POOL_ID: number;
  STATUSKENDARAAN_ID: number;
  KATEGORIKENDARAAN_ID: number;
  KENDARAAN_NOMORPOLISI: string;
  KENDARAAN_NOMORRANGKA: string;
  KENDARAAN_NOMORMESIN: string;
  KENDARAAN_TAHUNPEMBUATAN: number | string | null;
  KENDARAAN_RASIOBAHANBAKARTERKINI: number;
  KENDARAAN_BERATKOSONGTERKINI: number;
  KENDARAAN_KMTERKINI: number;
  KENDARAAN_MASABERLAKUSTNK: string | null;
  KENDARAAN_MASABERLAKUPAJAKSTNK: string | null;
  KENDARAAN_KETERANGAN: string | null;
}

export interface LegacyVehicleWasteSource {
  KATEGORISUMBERSAMPAHKENDARAAN_ID: number;
  KATEGORISUMBERSAMPAH_ID: number;
  KENDARAAN_ID: number;
}

export interface LegacyDriver {
  PENGEMUDI_ID: number;
  SPOT_POOL_ID: number;
  STATUSKEPEGAWAIAN_ID: number;
  PENGEMUDI_NAMA: string;
  PENGEMUDI_NOMORKTP: string;
  PENGEMUDI_ALAMATASAL: string;
  PENGEMUDI_ALAMATDOMISILI: string;
  PENGEMUDI_TANGGALLAHIR: string | null;
  PENGEMUDI_KONTAK: string;
  PENGEMUDI_PELATIHANSAFETY: string | null;
  PENGEMUDI_KETERANGAN: string | null;
}

export interface LegacyDriverLicense {
  KEPEMILIKANSIM_ID: number;
  PENGEMUDI_ID: number;
  SIM_ID: number;
  KEPEMILIKANSIM_NOMORSIM: string;
  KEPEMILIKANSIM_MASABERLAKUSIM: string | null;
}

export interface LegacyRole {
  HAKAKSES_ID: number;
  HAKAKSES_NAMA: string;
}

export interface LegacyUser {
  PENGGUNA_ID: number;
  HAKAKSES_ID: number;
  PENGGUNA_NAMA: string;
  PENGGUNA_USERNAME: string;
}

export interface LegacyCrewSchedule {
  MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID: number;
  KENDARAAN_ID: number;
  PENGEMUDI_ID: number;
  MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUBERANGKATKANDANG: string;
  MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUKEMBALIKANDANG: string;
}

export interface LegacyTripTemplate {
  MASTERTRAYEK_ID: number;
  MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID: number;
  RUTE_ID: number;
  MASTERTRAYEK_WAKTUTARGET: string;
  MASTERTRAYEK_JUMLAHISIBBMDIAJUKAN: number | null;
}

export interface LegacyDisposalPermit {
  JATAHKITIR_ID: number;
  STATUSJATAHKITIR_ID: number;
  SPOT_ID: number;
  KENDARAAN_ID: number;
  JATAHKITIR_WAKTUDITERBITKAN: string | null;
  JATAHKITIR_MASABERLAKUAWAL: string | null;
  JATAHKITIR_MASABERLAKUAKHIR: string | null;
}

export interface LegacyDailyTonnage {
  TONASE_ID: number;
  TONASE_TANGGAL: string | null;
  TONASE_NOMINAL: number;
}

export interface LegacyLevy {
  ID_KATEGORI_RETRIBUSI: number;
  NAMA_KATEGORI_RETRIBUSI: string;
  TANGGAL: string | null;
  JUMLAH: number | null;
}

export interface LegacyNameMapRow {
  id: number;
  si: string | null;
  swat: string | null;
}

export interface LegacyTpaInbound {
  id: number;
  tgltitle: string | null;
  tgl: number | null;
  nopol: string | null;
  lpsdepo: string | null;
  trukasal: string | null;
  bkotor: number | null;
  bkosong: number | null;
  bbersih: number | null;
}
