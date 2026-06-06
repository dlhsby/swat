<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_laporanbahanbakar extends CI_Model {
    //Begin of Constructor ------------------------------------------------------------
    function __construct() {

    }
	
	function get_laporan_bahan_bakar_by_tanggal($tanggal,$jenis){
        return $this->db->query("
            SELECT kendaraan.KENDARAAN_NOMORPOLISI AS KENDARAAN_NOMORPOLISI,kategorikendaraan.KATEGORIKENDARAAN_MERK AS KATEGORIKENDARAAN_MERK,aplikasikendaraan.APLIKASIKENDARAAN_NAMA AS APLIKASIKENDARAAN_NAMA, asal.SPOT_NAMA as SPOT_ASAL_NAMA, trayek.TRAYEK_KMREALISASI AS TRAYEK_KMREALISASI,trayek.TRAYEK_WAKTUREALISASI AS TRAYEK_WAKTUREALISASI ,trayek.TRAYEK_WAKTUENTRIREALISASI AS TRAYEK_WAKTUENTRIREALISASI,trayek.TRAYEK_JUMLAHISIBBMDISETUJUI AS TRAYEK_JUMLAHISIBBMDISETUJUI, trayek.TRAYEK_JUMLAHISIBBMDIAJUKAN AS TRAYEK_JUMLAHISIBBMDIAJUKAN, bahanbakar.BAHANBAKAR_NAMA
from trayek
JOIN rute on trayek.RUTE_ID = rute.RUTE_ID
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
JOIN detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
JOIN transaksiangkutsampah on detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
JOIN haritransaksi on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
JOIN kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
JOIN kategorikendaraan on kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
JOIN bahanbakar on kategorikendaraan.BAHANBAKAR_ID = bahanbakar.BAHANBAKAR_ID
JOIN aplikasikendaraan on kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
WHERE kategorirute.KATEGORIRUTE_ID = 2
AND trayek.TRAYEK_JUMLAHISIBBMDISETUJUI >0
AND DATE(haritransaksi.HARITRANSAKSI_TANGGAL) = DATE('".$tanggal."')
AND bahanbakar.BAHANBAKAR_NAMA = '".$jenis."'
ORDER BY TRAYEK_WAKTUREALISASI ASC
        ");
    }
	
	function get_laporan_bahan_bakar_by_dua_tanggal($awal,$akhir,$jenis){
		return $this->db->query("
		SELECT kendaraan.KENDARAAN_NOMORPOLISI AS KENDARAAN_NOMORPOLISI,kategorikendaraan.KATEGORIKENDARAAN_MERK AS KATEGORIKENDARAAN_MERK,aplikasikendaraan.APLIKASIKENDARAAN_NAMA AS APLIKASIKENDARAAN_NAMA, asal.SPOT_NAMA as SPOT_ASAL_NAMA, trayek.TRAYEK_KMREALISASI AS TRAYEK_KMREALISASI,trayek.TRAYEK_WAKTUREALISASI AS TRAYEK_WAKTUREALISASI ,trayek.TRAYEK_WAKTUENTRIREALISASI AS TRAYEK_WAKTUENTRIREALISASI,trayek.TRAYEK_JUMLAHISIBBMDISETUJUI AS TRAYEK_JUMLAHISIBBMDISETUJUI, trayek.TRAYEK_JUMLAHISIBBMDIAJUKAN AS TRAYEK_JUMLAHISIBBMDIAJUKAN, bahanbakar.BAHANBAKAR_NAMA
from trayek
JOIN rute on trayek.RUTE_ID = rute.RUTE_ID
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
JOIN detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
JOIN transaksiangkutsampah on detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
JOIN haritransaksi on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
JOIN kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
JOIN kategorikendaraan on kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
JOIN bahanbakar on kategorikendaraan.BAHANBAKAR_ID = bahanbakar.BAHANBAKAR_ID
JOIN aplikasikendaraan on kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
WHERE kategorirute.KATEGORIRUTE_ID = 2
AND trayek.TRAYEK_JUMLAHISIBBMDISETUJUI >0
AND trayek.TRAYEK_WAKTUREALISASI between '".$awal."' and '".$akhir."'
AND bahanbakar.BAHANBAKAR_NAMA = '".$jenis."'
ORDER BY TRAYEK_WAKTUREALISASI ASC
		");
	}
	
	function get_jenis_bahan_bakar_by_dua_tanggal($awal, $akhir){
		return $this->db->query("
		SELECT bahanbakar.BAHANBAKAR_NAMA
from trayek
JOIN rute on trayek.RUTE_ID = rute.RUTE_ID
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
JOIN detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
JOIN transaksiangkutsampah on detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
JOIN haritransaksi on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
JOIN kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
JOIN kategorikendaraan on kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
JOIN bahanbakar on kategorikendaraan.BAHANBAKAR_ID = bahanbakar.BAHANBAKAR_ID
JOIN aplikasikendaraan on kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
WHERE kategorirute.KATEGORIRUTE_ID = 2
AND trayek.TRAYEK_JUMLAHISIBBMDISETUJUI >0
AND trayek.TRAYEK_WAKTUREALISASI between '".$awal."' and '".$akhir."'
GROUP BY bahanbakar.BAHANBAKAR_NAMA
ORDER BY bahanbakar.BAHANBAKAR_NAMA ASC
		");
	}
	
	function get_jenis_bahan_bakar_by_tanggal($tanggal){
		return $this->db->query("
		SELECT bahanbakar.BAHANBAKAR_NAMA
from trayek
JOIN rute on trayek.RUTE_ID = rute.RUTE_ID
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
JOIN detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
JOIN transaksiangkutsampah on detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
JOIN haritransaksi on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
JOIN kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
JOIN kategorikendaraan on kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
JOIN bahanbakar on kategorikendaraan.BAHANBAKAR_ID = bahanbakar.BAHANBAKAR_ID
JOIN aplikasikendaraan on kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
WHERE kategorirute.KATEGORIRUTE_ID = 2
AND trayek.TRAYEK_JUMLAHISIBBMDISETUJUI >0
AND DATE(haritransaksi.HARITRANSAKSI_TANGGAL) = DATE('".$tanggal."')
GROUP BY bahanbakar.BAHANBAKAR_NAMA
ORDER BY bahanbakar.BAHANBAKAR_NAMA ASC
		");
	}
}
?>