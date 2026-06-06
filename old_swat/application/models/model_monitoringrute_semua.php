<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_monitoringrute_semua extends CI_Model {
    //Begin of Constructor ------------------------------------------------------------
    function __construct() {

    }
    //End of Constructor ------------------------------------------------------------

    //Begin of Get Data Kendaraan ------------------------------------------------------------
    function get_all_rute($tanggal)
    {
        return $this->db->query("
           SELECT DATA1.NOPOL, DATA1.NAMA, DATA1.RUTE_ASAL, DATA1.RUTE_TUJUAN, DATA2.WAKTU, DATA1.TARGET
FROM (SELECT trayek_id, kendaraan_nomorpolisi AS  'NOPOL', pengemudi_nama AS  'NAMA', TIME_FORMAT( TIME( trayek_wakturealisasi ) ,  '%H:%i' ) AS  'WAKTU', spot_asal.spot_nama AS  'RUTE_ASAL', spot_tujuan.spot_nama AS  'RUTE_TUJUAN', TIME_FORMAT( TIME( trayek_waktutarget ) ,  '%H:%i' ) AS  'TARGET'
FROM trayek
JOIN detailtransaksiangkutsampah ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
JOIN transaksiangkutsampah ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
JOIN kendaraan ON transaksiangkutsampah.kendaraan_id = kendaraan.kendaraan_id
JOIN pengemudi ON pengemudi.pengemudi_id = detailtransaksiangkutsampah.pengemudi_id
JOIN haritransaksi ON transaksiangkutsampah.haritransaksi_id = haritransaksi.haritransaksi_id
JOIN rute ON trayek.rute_id = rute.rute_id
JOIN spot AS spot_tujuan ON spot_tujuan.spot_id = rute.spot_tujuan_id
JOIN spot AS spot_asal ON spot_asal.spot_id = rute.spot_asal_id
WHERE DATE( haritransaksi_tanggal ) = DATE( '".$tanggal."' )
AND spot_asal.spot_nama != spot_tujuan.spot_nama
AND trayek_wakturealisasi = '0000-00-00 00:00:00'
)AS DATA1

JOIN (
SELECT MAX(trayek_id) AS 'TRAYEK_ID', kendaraan_nomorpolisi AS  'NOPOL', pengemudi_nama AS  'NAMA', MAX( TIME_FORMAT( TIME( trayek_wakturealisasi ) ,  '%H:%i' ) ) AS  'WAKTU'
FROM trayek
JOIN detailtransaksiangkutsampah ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
JOIN transaksiangkutsampah ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
JOIN kendaraan ON transaksiangkutsampah.kendaraan_id = kendaraan.kendaraan_id
JOIN pengemudi ON pengemudi.pengemudi_id = detailtransaksiangkutsampah.pengemudi_id
JOIN haritransaksi ON transaksiangkutsampah.haritransaksi_id = haritransaksi.haritransaksi_id
JOIN rute ON trayek.rute_id = rute.rute_id
JOIN spot AS spot_tujuan ON spot_tujuan.spot_id = rute.spot_tujuan_id
JOIN spot AS spot_asal ON spot_asal.spot_id = rute.spot_asal_id
WHERE DATE( haritransaksi_tanggal ) = DATE( '".$tanggal."' )
AND spot_asal.spot_nama != spot_tujuan.spot_nama
AND trayek_wakturealisasi != '0000-00-00 00:00:00'
GROUP BY kendaraan_nomorpolisi
ORDER BY MAX( trayek_id ) DESC) AS DATA2
ON DATA1.NOPOL = DATA2.NOPOL
WHERE DATA1.TRAYEK_ID > DATA2.TRAYEK_ID
GROUP BY DATA1.NOPOL
ORDER BY DATA2.WAKTU DESC
        ");
    }

    function get_rute_antar_spot($data, $tanggal){
        return $this->db->query("
            SELECT DATA1.TRAYEK_ID, DATA1.NOPOL, DATA2.WAKTU, DATA1.ASAL_RUTE_LATITUDE, DATA1.ASAL_RUTE_LONGITUDE,DATA1.TUJUAN_RUTE_LATITUDE, DATA1.TUJUAN_RUTE_LONGITUDE, DATA1.KATEGORI_TUJUAN
FROM (SELECT trayek_id, kendaraan_nomorpolisi AS  'NOPOL', TIME_FORMAT( TIME( trayek_wakturealisasi ) ,  '%H:%i' ) AS  'WAKTU', spot_asal.spot_latitude AS  'ASAL_RUTE_LATITUDE', spot_asal.spot_longitude AS  'ASAL_RUTE_LONGITUDE', spot_tujuan.spot_latitude AS  'TUJUAN_RUTE_LATITUDE', spot_tujuan.spot_longitude AS  'TUJUAN_RUTE_LONGITUDE', kategorispot_nama AS 'KATEGORI_TUJUAN'
FROM trayek
JOIN detailtransaksiangkutsampah ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
JOIN transaksiangkutsampah ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
JOIN kendaraan ON transaksiangkutsampah.kendaraan_id = kendaraan.kendaraan_id
JOIN pengemudi ON pengemudi.pengemudi_id = detailtransaksiangkutsampah.pengemudi_id
JOIN haritransaksi ON transaksiangkutsampah.haritransaksi_id = haritransaksi.haritransaksi_id
JOIN rute ON trayek.rute_id = rute.rute_id
JOIN spot AS spot_tujuan ON spot_tujuan.spot_id = rute.spot_tujuan_id
JOIN spot AS spot_asal ON spot_asal.spot_id = rute.spot_asal_id
JOIN kategorispot ON spot_tujuan.kategorispot_id = kategorispot.kategorispot_id
WHERE DATE( haritransaksi_tanggal ) = DATE( '".$tanggal."' )
AND spot_asal.spot_nama != spot_tujuan.spot_nama
AND trayek_wakturealisasi = '0000-00-00 00:00:00'
and kendaraan_nomorpolisi = '".$data."'
)AS DATA1

JOIN (
SELECT MAX(trayek_id) AS 'TRAYEK_ID', kendaraan_nomorpolisi AS  'NOPOL', pengemudi_nama AS  'NAMA', MAX( TIME_FORMAT( TIME( trayek_wakturealisasi ) ,  '%H:%i' ) ) AS  'WAKTU'
FROM trayek
JOIN detailtransaksiangkutsampah ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
JOIN transaksiangkutsampah ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
JOIN kendaraan ON transaksiangkutsampah.kendaraan_id = kendaraan.kendaraan_id
JOIN pengemudi ON pengemudi.pengemudi_id = detailtransaksiangkutsampah.pengemudi_id
JOIN haritransaksi ON transaksiangkutsampah.haritransaksi_id = haritransaksi.haritransaksi_id
JOIN rute ON trayek.rute_id = rute.rute_id
JOIN spot AS spot_tujuan ON spot_tujuan.spot_id = rute.spot_tujuan_id
JOIN spot AS spot_asal ON spot_asal.spot_id = rute.spot_asal_id
WHERE DATE( haritransaksi_tanggal ) = DATE('".$tanggal."' )
AND spot_asal.spot_nama != spot_tujuan.spot_nama
AND trayek_wakturealisasi != '0000-00-00 00:00:00'
and kendaraan_nomorpolisi = '".$data."'
GROUP BY kendaraan_nomorpolisi
ORDER BY MAX( trayek_id ) DESC) AS DATA2
ON DATA1.NOPOL = DATA2.NOPOL
WHERE DATA1.TRAYEK_ID > DATA2.TRAYEK_ID
ORDER BY DATA1.TRAYEK_ID ASC
LIMIT 1
        ");
    }

    function get_total_jenis_kendaraan_aktif($tanggal){
        return $this->db->query("
SELECT JENIS_KENDARAAN, COUNT(JUMLAH) AS TOTAL FROM (SELECT kategorisumbersampah_nama AS  'JENIS_KENDARAAN' , count(kategorisumbersampah_nama) AS 'JUMLAH'
FROM trayek
JOIN detailtransaksiangkutsampah ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
JOIN transaksiangkutsampah ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
JOIN kendaraan ON transaksiangkutsampah.kendaraan_id = kendaraan.kendaraan_id
JOIN kategorisumbersampahkendaraan on kategorisumbersampahkendaraan.kendaraan_id = kendaraan.kendaraan_id
JOIN kategorisumbersampah on kategorisumbersampah.kategorisumbersampah_id = kategorisumbersampahkendaraan.kategorisumbersampah_id
WHERE DATE( trayek_wakturealisasi ) = DATE( '".$tanggal."' )
GROUP BY kendaraan_nomorpolisi, kategorisumbersampah_kode
ORDER BY MAX( trayek_wakturealisasi ) DESC) AS ASELOLE
GROUP BY JENIS_KENDARAAN
        ");
    }
	function get_location_tpa(){
		return $this->db->query("
		select spot_nama as 'NAMA', spot_latitude as 'TPA_LATITUDE', spot_longitude as 'TPA_LONGITUDE' from spot
		join kategorispot on spot.kategorispot_id = kategorispot.kategorispot_id
		where kategorispot_nama = 'TPA'
		");
	}
}

?>
