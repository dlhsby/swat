<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_laporantonasesampah extends CI_Model {
    //Begin of Constructor ------------------------------------------------------------
    function __construct() {

    }

    function get_laporan_tonase_by_hari($tanggal){
          return $this->db->query("
  SELECT kendaraan.KENDARAAN_NOMORPOLISI AS KENDARAAN_NOMORPOLISI,
  kategorikendaraan.KATEGORIKENDARAAN_MERK AS KATEGORIKENDARAAN_MERK,aplikasikendaraan.APLIKASIKENDARAAN_NAMA AS APLIKASIKENDARAAN_NAMA,
  asal.SPOT_NAMA as SPOT_ASAL_NAMA, trayek.TRAYEK_KMREALISASI AS TRAYEK_KMREALISASI,trayek.TRAYEK_WAKTUREALISASI AS TRAYEK_WAKTUREALISASI,
  trayek.TRAYEK_WAKTUENTRIREALISASI AS TRAYEK_WAKTUENTRIREALISASI,trayek.TRAYEK_BERATBERSIHSAMPAH AS TRAYEK_BERATBERSIHSAMPAH
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
  JOIN aplikasikendaraan on kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
  WHERE kategorirute.KATEGORIRUTE_ID = 4
  AND trayek.TRAYEK_BERATBERSIHSAMPAH >0
  AND haritransaksi.HARITRANSAKSI_TANGGAL='".$tanggal."'
  ORDER BY TRAYEK_WAKTUREALISASI ASC
          ");
      }

	function get_laporan_tonase_by_tanggal($tanggal,$bulan,$tahun){
        return $this->db->query("
SELECT kendaraan.KENDARAAN_NOMORPOLISI AS KENDARAAN_NOMORPOLISI,
kategorikendaraan.KATEGORIKENDARAAN_MERK AS KATEGORIKENDARAAN_MERK,aplikasikendaraan.APLIKASIKENDARAAN_NAMA AS APLIKASIKENDARAAN_NAMA,
asal.SPOT_NAMA as SPOT_ASAL_NAMA, trayek.TRAYEK_KMREALISASI AS TRAYEK_KMREALISASI,trayek.TRAYEK_WAKTUREALISASI AS TRAYEK_WAKTUREALISASI,
trayek.TRAYEK_WAKTUENTRIREALISASI AS TRAYEK_WAKTUENTRIREALISASI,trayek.TRAYEK_BERATBERSIHSAMPAH AS TRAYEK_BERATBERSIHSAMPAH
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
JOIN aplikasikendaraan on kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
WHERE kategorirute.KATEGORIRUTE_ID = 4
AND trayek.TRAYEK_BERATBERSIHSAMPAH >0
AND year(haritransaksi.HARITRANSAKSI_TANGGAL)='".$tahun."'
AND month(haritransaksi.HARITRANSAKSI_TANGGAL)='".$bulan."'
ORDER BY TRAYEK_WAKTUREALISASI ASC
        ");
    }

	function get_laporan_tonase_by_tanggal_pdf($tanggal){
		return $this->db->query("
SELECT numberedPembuangan.row_number AS URUTANPEMBUANGAN, haritransaksi.HARITRANSAKSI_TANGGAL AS HARITRANSAKSI_TANGGAL, numberedPembuangan.TRAYEK_ID AS TRAYEK_ID, kendaraan.KENDARAAN_NOMORPOLISI AS KENDARAAN_NOMORPOLISI,kategorikendaraan.KATEGORIKENDARAAN_MERK AS KATEGORIKENDARAAN_MERK,aplikasikendaraan.APLIKASIKENDARAAN_NAMA AS APLIKASIKENDARAAN_NAMA, asal.KATEGORISPOT_ID AS KATEGORI_SPOT_ASAL_ID,asal.SPOT_ID AS SPOT_ASAL_ID, asal.SPOT_NAMA as SPOT_ASAL_NAMA, tujuan.KATEGORISPOT_ID AS KATEGORI_SPOT_TUJUAN_ID,tujuan.SPOT_ID AS SPOT_TUJUAN_ID, tujuan.SPOT_NAMA AS SPOT_TUJUAN_NAMA,numberedPembuangan.TRAYEK_KMREALISASI AS TRAYEK_KMREALISASI,numberedPembuangan.TRAYEK_WAKTUREALISASI AS TRAYEK_WAKTUREALISASI ,numberedPembuangan.TRAYEK_WAKTUENTRIREALISASI AS TRAYEK_WAKTUENTRIREALISASI,numberedPembuangan.TRAYEK_BERATBERSIHSAMPAH AS TRAYEK_BERATBERSIHSAMPAH, numberedPembuangan.TRAYEK_BERATKOSONGKENDARAAN AS TRAYEK_BERATKOSONGKENDARAAN, numberedPembuangan.TRAYEK_BERATKOTORTIMBANGAN AS TRAYEK_BERATKOTORTIMBANGAN, numberedPembuangan.PENGGUNA_ID AS PENGGUNA_ID, pengguna.PENGGUNA_NAMA AS PENGGUNA_NAMA, numberedPembuangan.TRAYEK_KETERANGAN AS TRAYEK_KETERANGAN
FROM(
    SELECT @row_number:=@row_number+1 AS row_number,pembuangan.*
    FROM (
        SELECT trayek.TRAYEK_ID, trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID, trayek.PENGGUNA_ID, trayek.RUTE_ID,trayek.TRAYEK_WAKTUREALISASI, trayek.TRAYEK_WAKTUENTRIREALISASI,trayek.TRAYEK_KMREALISASI, trayek.TRAYEK_BERATBERSIHSAMPAH, trayek.TRAYEK_BERATKOSONGKENDARAAN, trayek.TRAYEK_BERATKOTORTIMBANGAN, trayek.STATUSTRAYEK_ID, trayek.TRAYEK_KETERANGAN
        FROM trayek
        JOIN detailtransaksiangkutsampah ON trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
        JOIN transaksiangkutsampah ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
        JOIN haritransaksi ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
        JOIN rute ON trayek.RUTE_ID = rute.RUTE_ID
        WHERE rute.KATEGORIRUTE_ID = 4 AND trayek.STATUSTRAYEK_ID='2' AND haritransaksi.HARITRANSAKSI_TANGGAL = '".$tanggal."'
        ORDER BY trayek.TRAYEK_WAKTUREALISASI ASC
    ) AS pembuangan,(SELECT @row_number:=0) AS t
) AS numberedPembuangan
LEFT JOIN pengguna ON numberedPembuangan.PENGGUNA_ID = pengguna.PENGGUNA_ID
JOIN rute ON numberedPembuangan.RUTE_ID = rute.RUTE_ID
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
JOIN detailtransaksiangkutsampah ON numberedPembuangan.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
JOIN transaksiangkutsampah ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
JOIN haritransaksi ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
JOIN kendaraan ON transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
JOIN kategorikendaraan ON kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
JOIN aplikasikendaraan ON kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
WHERE kategorirute.KATEGORIRUTE_ID = 4
AND haritransaksi.HARITRANSAKSI_TANGGAL='".$tanggal."'
ORDER BY TRAYEK_WAKTUREALISASI ASC
        ");
	}


  function get_laporan_tonase_by_tanggal_bulan_pdf($bulan,$tahun){
		return $this->db->query("
SELECT numberedPembuangan.row_number AS URUTANPEMBUANGAN, haritransaksi.HARITRANSAKSI_TANGGAL AS HARITRANSAKSI_TANGGAL, numberedPembuangan.TRAYEK_ID AS TRAYEK_ID, kendaraan.KENDARAAN_NOMORPOLISI AS KENDARAAN_NOMORPOLISI,kategorikendaraan.KATEGORIKENDARAAN_MERK AS KATEGORIKENDARAAN_MERK,aplikasikendaraan.APLIKASIKENDARAAN_NAMA AS APLIKASIKENDARAAN_NAMA, asal.KATEGORISPOT_ID AS KATEGORI_SPOT_ASAL_ID,asal.SPOT_ID AS SPOT_ASAL_ID, asal.SPOT_NAMA as SPOT_ASAL_NAMA, tujuan.KATEGORISPOT_ID AS KATEGORI_SPOT_TUJUAN_ID,tujuan.SPOT_ID AS SPOT_TUJUAN_ID, tujuan.SPOT_NAMA AS SPOT_TUJUAN_NAMA,numberedPembuangan.TRAYEK_KMREALISASI AS TRAYEK_KMREALISASI,numberedPembuangan.TRAYEK_WAKTUREALISASI AS TRAYEK_WAKTUREALISASI ,numberedPembuangan.TRAYEK_WAKTUENTRIREALISASI AS TRAYEK_WAKTUENTRIREALISASI,numberedPembuangan.TRAYEK_BERATBERSIHSAMPAH AS TRAYEK_BERATBERSIHSAMPAH, numberedPembuangan.TRAYEK_BERATKOSONGKENDARAAN AS TRAYEK_BERATKOSONGKENDARAAN, numberedPembuangan.TRAYEK_BERATKOTORTIMBANGAN AS TRAYEK_BERATKOTORTIMBANGAN, numberedPembuangan.PENGGUNA_ID AS PENGGUNA_ID, pengguna.PENGGUNA_NAMA AS PENGGUNA_NAMA, numberedPembuangan.TRAYEK_KETERANGAN AS TRAYEK_KETERANGAN
FROM(
    SELECT @row_number:=@row_number+1 AS row_number,pembuangan.*
    FROM (
        SELECT trayek.TRAYEK_ID, trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID, trayek.PENGGUNA_ID, trayek.RUTE_ID,trayek.TRAYEK_WAKTUREALISASI, trayek.TRAYEK_WAKTUENTRIREALISASI,trayek.TRAYEK_KMREALISASI, trayek.TRAYEK_BERATBERSIHSAMPAH, trayek.TRAYEK_BERATKOSONGKENDARAAN, trayek.TRAYEK_BERATKOTORTIMBANGAN, trayek.STATUSTRAYEK_ID, trayek.TRAYEK_KETERANGAN
        FROM trayek
        JOIN detailtransaksiangkutsampah ON trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
        JOIN transaksiangkutsampah ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
        JOIN haritransaksi ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
        JOIN rute ON trayek.RUTE_ID = rute.RUTE_ID
        WHERE rute.KATEGORIRUTE_ID = 4 AND trayek.STATUSTRAYEK_ID='2'
        AND year(haritransaksi.HARITRANSAKSI_TANGGAL)='".$tahun."'
        AND month(haritransaksi.HARITRANSAKSI_TANGGAL)='".$bulan."'
        ORDER BY trayek.TRAYEK_WAKTUREALISASI ASC
    ) AS pembuangan,(SELECT @row_number:=0) AS t
) AS numberedPembuangan
LEFT JOIN pengguna ON numberedPembuangan.PENGGUNA_ID = pengguna.PENGGUNA_ID
JOIN rute ON numberedPembuangan.RUTE_ID = rute.RUTE_ID
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
JOIN detailtransaksiangkutsampah ON numberedPembuangan.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
JOIN transaksiangkutsampah ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
JOIN haritransaksi ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
JOIN kendaraan ON transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
JOIN kategorikendaraan ON kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
JOIN aplikasikendaraan ON kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
WHERE kategorirute.KATEGORIRUTE_ID = 4
AND year(haritransaksi.HARITRANSAKSI_TANGGAL)='".$tahun."'
AND month(haritransaksi.HARITRANSAKSI_TANGGAL)='".$bulan."'
ORDER BY TRAYEK_WAKTUREALISASI ASC
        ");
	}


	function get_jenis_sampah_by_tanggal($tanggal){
		return $this->db->query("
		SELECT kategorisumbersampah_nama AS  'JENIS'
FROM trayek
JOIN detailtransaksiangkutsampah ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
JOIN transaksiangkutsampah ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
JOIN kendaraan ON transaksiangkutsampah.kendaraan_id = kendaraan.kendaraan_id
JOIN kategorisumbersampahkendaraan on kategorisumbersampahkendaraan.kendaraan_id = kendaraan.kendaraan_id
JOIN kategorisumbersampah on kategorisumbersampah.kategorisumbersampah_id = kategorisumbersampahkendaraan.kategorisumbersampah_id
JOIN haritransaksi on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
WHERE haritransaksi.HARITRANSAKSI_TANGGAL='".$tanggal."'
GROUP BY kategorisumbersampah_kode
ORDER BY MAX( trayek_wakturealisasi ) DESC
		");
	}
}
?>
