<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_monitoringtonasesampah extends CI_Model {
    //Begin of Constructor ------------------------------------------------------------
    function __construct() {

    }
    //End of Constructor ------------------------------------------------------------

    //Begin of Get Data Kendaraan ------------------------------------------------------------
    function get_all_tonase_sampah_lima_hari($tanggal){
        return $this->db->query("
            SELECT SUM( TRAYEK_BERATBERSIHSAMPAH ) AS BERAT, DATE_FORMAT(DATE( haritransaksi.haritransaksi_tanggal ),'%Y-%m-%d') AS TANGGAL FROM  `trayek`
			JOIN rute on trayek.RUTE_ID = rute.RUTE_ID
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
JOIN detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
JOIN transaksiangkutsampah on detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
JOIN haritransaksi on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
JOIN kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
JOIN kategorikendaraan on kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
JOIN aplikasikendaraan on kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
JOIN kategorisumbersampahkendaraan on kategorisumbersampahkendaraan.kendaraan_id = kendaraan.kendaraan_id
JOIN kategorisumbersampah on kategorisumbersampah.kategorisumbersampah_id = kategorisumbersampahkendaraan.kategorisumbersampah_id
			WHERE DATE(haritransaksi.haritransaksi_tanggal) <= DATE('".$tanggal."')
      AND kategorisumbersampah.KATEGORISUMBERSAMPAH_NAMA != 'Swasta'
            GROUP BY haritransaksi_tanggal
            ORDER BY TANGGAL DESC
            LIMIT 0 , 5
        ");
    }
	function get_all_tonase_sampah_satu_bulan($tanggal){
        return $this->db->query("
            SELECT SUM( TRAYEK_BERATBERSIHSAMPAH ) AS BERAT, DATE_FORMAT(DATE( haritransaksi.haritransaksi_tanggal ),'%Y-%m-%d') AS TANGGAL FROM  `trayek`
			JOIN rute on trayek.RUTE_ID = rute.RUTE_ID
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
JOIN detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
JOIN transaksiangkutsampah on detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
JOIN haritransaksi on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
JOIN kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
JOIN kategorikendaraan on kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
JOIN aplikasikendaraan on kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
JOIN kategorisumbersampahkendaraan on kategorisumbersampahkendaraan.kendaraan_id = kendaraan.kendaraan_id
JOIN kategorisumbersampah on kategorisumbersampah.kategorisumbersampah_id = kategorisumbersampahkendaraan.kategorisumbersampah_id
			WHERE MONTH(haritransaksi.haritransaksi_tanggal) = MONTH('".$tanggal."')
			AND YEAR (haritransaksi.haritransaksi_tanggal) = YEAR('".$tanggal."')
      AND kategorisumbersampah.KATEGORISUMBERSAMPAH_NAMA != 'Swasta'
            GROUP BY haritransaksi_tanggal
            ORDER BY TANGGAL DESC
        ");
    }
    function get_tonase_sampah_lima_hari_TPS($tanggal){
        return $this->db->query("
            SELECT spot_nama AS NAMA, DATE_FORMAT(haritransaksi_tanggal,'%Y-%m-%d' ) AS TANGGAL, SUM( trayek_beratbersihsampah ) AS BERAT
            FROM  `trayek`
            JOIN rute ON trayek.rute_id = rute.rute_id
            JOIN spot ON spot.spot_id = rute.spot_asal_id
            JOIN kategorirute ON kategorirute.kategorirute_id = rute.kategorirute_id
            JOIN detailtransaksiangkutsampah ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
            JOIN transaksiangkutsampah ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
            JOIN haritransaksi ON haritransaksi.haritransaksi_id = transaksiangkutsampah.haritransaksi_id
            JOIN kendaraan ON transaksiangkutsampah.kendaraan_id = kendaraan.kendaraan_id
            JOIN kategorisumbersampahkendaraan on kategorisumbersampahkendaraan.kendaraan_id = kendaraan.kendaraan_id
            JOIN kategorisumbersampah on kategorisumbersampah.kategorisumbersampah_id = kategorisumbersampahkendaraan.kategorisumbersampah_id
            WHERE DATE(haritransaksi_tanggal) = DATE('".$tanggal."')
            AND kategorisumbersampah.KATEGORISUMBERSAMPAH_NAMA != 'Swasta'
            GROUP BY spot_nama, haritransaksi_tanggal DESC
            ORDER BY SUM( trayek_beratbersihsampah ) DESC
            LIMIT 5
        ");
    }
    function get_detail_tonase_sampah_lima_hari_TPS($data, $tanggal){
        return $this->db->query("
            SELECT spot_nama AS NAMA, haritransaksi_tanggal AS TANGGAL, SUM( trayek_beratbersihsampah ) AS TONASE
            FROM  `trayek`
            JOIN rute ON trayek.rute_id = rute.rute_id
            JOIN spot ON spot.spot_id = rute.spot_asal_id
            JOIN kategorirute ON kategorirute.kategorirute_id = rute.kategorirute_id
            JOIN detailtransaksiangkutsampah ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
            JOIN transaksiangkutsampah ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
            JOIN haritransaksi ON haritransaksi.haritransaksi_id = transaksiangkutsampah.haritransaksi_id
            JOIN kendaraan ON transaksiangkutsampah.kendaraan_id = kendaraan.kendaraan_id
            JOIN kategorisumbersampahkendaraan on kategorisumbersampahkendaraan.kendaraan_id = kendaraan.kendaraan_id
            JOIN kategorisumbersampah on kategorisumbersampah.kategorisumbersampah_id = kategorisumbersampahkendaraan.kategorisumbersampah_id
            AND kategorisumbersampah.KATEGORISUMBERSAMPAH_NAMA != 'Swasta'
            WHERE (
            DATE(haritransaksi.haritransaksi_tanggal) = DATE('".$tanggal."')
            OR DATE(haritransaksi.haritransaksi_tanggal) = DATE('".$tanggal."') - INTERVAL 1 DAY
			OR DATE(haritransaksi.haritransaksi_tanggal) = DATE('".$tanggal."') - INTERVAL 2 DAY
			or DATE(haritransaksi.haritransaksi_tanggal) = DATE('".$tanggal."') - INTERVAL 3 DAY
			or DATE(haritransaksi.haritransaksi_tanggal) = DATE('".$tanggal."') - INTERVAL 4 DAY
            )
            AND spot_nama =  '".$data."'
            GROUP BY spot_nama, haritransaksi_tanggal DESC
            LIMIT 0 , 5
        ");
    }

    function get_selisih_tonase($tanggal)
    {
        return $this->db->query("
            SELECT DATE_FORMAT( haritransaksi.HARITRANSAKSI_TANGGAL,  '%Y-%m-%d' ) AS  'WAKTU', SUM( trayek_beratbersihsampah ) AS  'BERAT'
FROM  `trayek`
JOIN rute on trayek.RUTE_ID = rute.RUTE_ID
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
JOIN detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
JOIN transaksiangkutsampah on detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
JOIN haritransaksi on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
JOIN kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
JOIN kategorikendaraan on kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
JOIN aplikasikendaraan on kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
JOIN kategorisumbersampahkendaraan on kategorisumbersampahkendaraan.kendaraan_id = kendaraan.kendaraan_id
JOIN kategorisumbersampah on kategorisumbersampah.kategorisumbersampah_id = kategorisumbersampahkendaraan.kategorisumbersampah_id
WHERE kategorirute.KATEGORIRUTE_ID = 4
AND trayek.TRAYEK_BERATBERSIHSAMPAH >0
AND kategorisumbersampah.KATEGORISUMBERSAMPAH_NAMA != 'Swasta'
and DATE(haritransaksi.HARITRANSAKSI_TANGGAL) >= DATE( '".$tanggal."' ) -1
    AND DATE(haritransaksi.HARITRANSAKSI_TANGGAL) <= DATE( '".$tanggal."' )
GROUP BY DATE(haritransaksi.HARITRANSAKSI_TANGGAL)
ORDER BY DATE(haritransaksi.HARITRANSAKSI_TANGGAL) DESC
        ");
    }

    /*function get_tonase_jenis_sampah($tanggal){
        return $this->db->query("
SELECT kategorisumbersampah_nama AS  'label' , sum(trayek_beratbersihsampah) AS 'data'
FROM trayek
JOIN detailtransaksiangkutsampah ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
JOIN transaksiangkutsampah ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
JOIN kendaraan ON transaksiangkutsampah.kendaraan_id = kendaraan.kendaraan_id
JOIN kategorisumbersampahkendaraan on kategorisumbersampahkendaraan.kendaraan_id = kendaraan.kendaraan_id
JOIN kategorisumbersampah on kategorisumbersampah.kategorisumbersampah_id = kategorisumbersampahkendaraan.kategorisumbersampah_id
WHERE DATE( trayek_wakturealisasi ) = DATE( '".$tanggal."' )
GROUP BY kategorisumbersampah_kode
ORDER BY MAX( trayek_wakturealisasi ) DESC
        ");
    }																																																																																																											*/
    function get_tonase_jenis_sampah($tanggal){
        return $this->db->query("
SELECT kategorisumbersampah_nama AS  'label' , sum(trayek_beratbersihsampah) AS 'data'
FROM trayek
JOIN detailtransaksiangkutsampah ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
JOIN transaksiangkutsampah ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
JOIN kendaraan ON transaksiangkutsampah.kendaraan_id = kendaraan.kendaraan_id
JOIN kategorisumbersampahkendaraan on kategorisumbersampahkendaraan.kendaraan_id = kendaraan.kendaraan_id
JOIN kategorisumbersampah on kategorisumbersampah.kategorisumbersampah_id = kategorisumbersampahkendaraan.kategorisumbersampah_id
WHERE DATE( trayek_wakturealisasi ) = DATE( '2014-04-22' )
AND kategorisumbersampah.KATEGORISUMBERSAMPAH_NAMA != 'Swasta'
GROUP BY kategorisumbersampah_kode
ORDER BY MAX( trayek_wakturealisasi ) DESC
        ");
    }
}

?>
