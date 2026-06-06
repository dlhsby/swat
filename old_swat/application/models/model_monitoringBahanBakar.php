<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_monitoringBahanBakar extends CI_Model {
    //Begin of Constructor ------------------------------------------------------------
    function __construct() {

    }
    //End of Constructor ------------------------------------------------------------

    //Begin of Get Data Kendaraan ------------------------------------------------------------
	function get_all_penggunaanbahanbakar(){
        return $this->db->query("
        	select haritransaksi.HARITRANSAKSI_TANGGAL AS HARITRANSAKSI_TANGGAL, trayek.TRAYEK_ID AS TRAYEK_ID, kendaraan.KENDARAAN_NOMORPOLISI AS KENDARAAN_NOMORPOLISI,kategorikendaraan.KATEGORIKENDARAAN_MERK, bahanbakar.BAHANBAKAR_NAMA AS BAHANBAKAR_NAMA, SUM(trayek.TRAYEK_JUMLAHISIBBMDIAJUKAN) AS JUMLAHBBMDIAJUKAN,SUM(trayek.TRAYEK_JUMLAHISIBBMDISETUJUI) AS JUMLAHBBMDISETUJUI from trayek
join rute on trayek.RUTE_ID = rute.RUTE_ID
join kategorirute on rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
join detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
join transaksiangkutsampah on detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
join haritransaksi on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
join kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
join kategorikendaraan on kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
join bahanbakar on kategorikendaraan.BAHANBAKAR_ID = bahanbakar.BAHANBAKAR_ID
where kategorirute.KATEGORIRUTE_ID = 2
GROUP BY kendaraan.KENDARAAN_NOMORPOLISI
ORDER BY kendaraan.KENDARAAN_NOMORPOLISI;
        ");		
    }
	
	function get_all_penggunaanbahanbakar_by_filter($jenisWaktu,$bulanTransaksi,$mingguTransaksi,$tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$bahanBakar){
		$clause = "WHERE kategorirute.KATEGORIRUTE_ID = 2";
		if($jenisWaktu==3){
			if($tanggalTransaksi)
			$clause.=" AND haritransaksi.HARITRANSAKSI_TANGGAL='".$tanggalTransaksi."'";
		}
		if($nopolKendaraan){
			$clause.=" AND kendaraan.KENDARAAN_NOMORPOLISI='".$nopolKendaraan."'";
		}
		if($aplikasiKendaraan){
			$clause.=" AND aplikasikendaraan.APLIKASIKENDARAAN_NAMA='".$aplikasiKendaraan."'";
		}
		if($kategoriKendaraan){
			$clause.=" AND kategorikendaraan.KATEGORIKENDARAAN_MERK='".$kategoriKendaraan."'";
		}
		if($bahanBakar){
			$clause.=" AND bahanbakar.BAHANBAKAR_NAMA='".$bahanBakar."'";
		}
		return $this->db->query("
        	select haritransaksi.HARITRANSAKSI_TANGGAL AS HARITRANSAKSI_TANGGAL, trayek.TRAYEK_ID AS TRAYEK_ID, kendaraan.KENDARAAN_NOMORPOLISI AS KENDARAAN_NOMORPOLISI,kategorikendaraan.KATEGORIKENDARAAN_MERK AS KATEGORIKENDARAAN_MERK,aplikasikendaraan.APLIKASIKENDARAAN_NAMA AS APLIKASIKENDARAAN_NAMA, bahanbakar.BAHANBAKAR_NAMA AS BAHANBAKAR_NAMA,
SUM(trayek.TRAYEK_JUMLAHISIBBMDIAJUKAN) AS JUMLAHBBMDIAJUKAN,SUM(trayek.TRAYEK_JUMLAHISIBBMDISETUJUI) AS JUMLAHBBMDISETUJUI 
			from trayek
			join rute on trayek.RUTE_ID = rute.RUTE_ID
			join kategorirute on rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
			join detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
			join transaksiangkutsampah on detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
			join haritransaksi on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
			join kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
			join kategorikendaraan on kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
			join aplikasikendaraan on kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
			join bahanbakar on kategorikendaraan.BAHANBAKAR_ID = bahanbakar.BAHANBAKAR_ID
			".$clause."
			GROUP BY kendaraan.KENDARAAN_NOMORPOLISI
			ORDER BY kendaraan.KENDARAAN_NOMORPOLISI;
        ");	
	}
	
	function get_all_paging_sorting_penggunaanbahanbakar($jtStartIndex,$jtPageSize,$jtSorting){
        return $this->db->query("
        	select haritransaksi.HARITRANSAKSI_TANGGAL AS HARITRANSAKSI_TANGGAL, trayek.TRAYEK_ID AS TRAYEK_ID, kendaraan.KENDARAAN_NOMORPOLISI AS KENDARAAN_NOMORPOLISI,kategorikendaraan.KATEGORIKENDARAAN_MERK, bahanbakar.BAHANBAKAR_NAMA AS BAHANBAKAR_NAMA, SUM(trayek.TRAYEK_JUMLAHISIBBMDIAJUKAN) AS JUMLAHBBMDIAJUKAN,SUM(trayek.TRAYEK_JUMLAHISIBBMDISETUJUI) AS JUMLAHBBMDISETUJUI from trayek
			join rute on trayek.RUTE_ID = rute.RUTE_ID
			join kategorirute on rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
			join detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
			join transaksiangkutsampah on detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
			join haritransaksi on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
			join kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
			join kategorikendaraan on kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
			join bahanbakar on kategorikendaraan.BAHANBAKAR_ID = bahanbakar.BAHANBAKAR_ID
			where kategorirute.KATEGORIRUTE_ID = 2
			GROUP BY kendaraan.KENDARAAN_NOMORPOLISI
			ORDER BY " . $jtSorting .
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
        ");
    }
	
	function get_all_paging_sorting_penggunaanbahanbakar_by_filter($jenisWaktu,$bulanTransaksi,$mingguTransaksi,$tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$bahanBakar,$jtStartIndex,$jtPageSize,$jtSorting){
		$clause = " WHERE kategorirute.KATEGORIRUTE_ID = 2";
		if($jenisWaktu==3){
			if($tanggalTransaksi)
			$clause.=" AND haritransaksi.HARITRANSAKSI_TANGGAL='".$tanggalTransaksi."'";
		}
		else if($jenisWaktu==2){
			if($mingguTransaksi && $bulanTransaksi){
				$trim = explode("-", $bulanTransaksi);
				$clause.=" AND haritransaksi.HARITRANSAKSI_TANGGAL='".$tanggalTransaksi."'";	
			}
		}
		else if($jenisWaktu==1){
			if($bulanTransaksi){
				$trim = explode("-", $bulanTransaksi);
				$clause.=" AND YEAR(haritransaksi.HARITRANSAKSI_TANGGAL)='".$trim[0]."'";
				$clause.=" AND MONTH(haritransaksi.HARITRANSAKSI_TANGGAL)='".$trim[1]."'";
			}
		}
		if($nopolKendaraan){
			$clause.=" AND kendaraan.KENDARAAN_NOMORPOLISI='".$nopolKendaraan."'";
		}
		if($aplikasiKendaraan){
			$clause.=" AND aplikasikendaraan.APLIKASIKENDARAAN_NAMA='".$aplikasiKendaraan."'";
		}
		if($kategoriKendaraan){
			$clause.=" AND kategorikendaraan.KATEGORIKENDARAAN_MERK='".$kategoriKendaraan."'";
		}
		if($bahanBakar){
			$clause.=" AND bahanbakar.BAHANBAKAR_NAMA='".$bahanBakar."'";
		}
		return $this->db->query("
        	select haritransaksi.HARITRANSAKSI_TANGGAL AS HARITRANSAKSI_TANGGAL, trayek.TRAYEK_ID AS TRAYEK_ID, kendaraan.KENDARAAN_NOMORPOLISI AS KENDARAAN_NOMORPOLISI,kategorikendaraan.KATEGORIKENDARAAN_MERK AS KATEGORIKENDARAAN_MERK,aplikasikendaraan.APLIKASIKENDARAAN_NAMA AS APLIKASIKENDARAAN_NAMA, bahanbakar.BAHANBAKAR_NAMA AS BAHANBAKAR_NAMA,
SUM(trayek.TRAYEK_JUMLAHISIBBMDIAJUKAN) AS JUMLAHBBMDIAJUKAN,SUM(trayek.TRAYEK_JUMLAHISIBBMDISETUJUI) AS JUMLAHBBMDISETUJUI 
		from trayek
		join rute on trayek.RUTE_ID = rute.RUTE_ID
		join kategorirute on rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
		join detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
		join transaksiangkutsampah on detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
		join haritransaksi on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
		join kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
		join kategorikendaraan on kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
		join aplikasikendaraan on kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
			join bahanbakar on kategorikendaraan.BAHANBAKAR_ID = bahanbakar.BAHANBAKAR_ID
			".$clause."
			GROUP BY kendaraan.KENDARAAN_NOMORPOLISI
			ORDER BY " . $jtSorting .
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
        ");
	}
	
    function get_all_bahan_bakar_bulan($tanggal){
        return $this->db->query("
        SELECT SUM(`TRAYEK_JUMLAHISIBBMDISETUJUI`) AS TOTAL FROM `trayek` WHERE
YEAR(`TRAYEK_WAKTUREALISASI`)=YEAR('".$tanggal."') AND
MONTH(`TRAYEK_WAKTUREALISASI`)=MONTH('".$tanggal."');
        ");
    }
    function get_all_bahan_bakar_minggu($tanggal){
        return $this->db->query("
        SELECT SUM(`TRAYEK_JUMLAHISIBBMDISETUJUI`) AS TOTAL FROM `trayek` WHERE
YEAR(`TRAYEK_WAKTUREALISASI`)=YEAR('".$tanggal."') AND
WEEK(`TRAYEK_WAKTUREALISASI`)=WEEK('".$tanggal."');
        ");
    }
    function get_all_bahan_bakar_hari($tanggal){
        return $this->db->query("
        SELECT SUM(`TRAYEK_JUMLAHISIBBMDISETUJUI`) AS TOTAL FROM `trayek` 
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
WHERE DATE(haritransaksi.HARITRANSAKSI_TANGGAL)=DATE('".$tanggal."')
        ");
    }
	
	function get_all_bahan_bakar_satu_bulan($tanggal){
        return $this->db->query("
            SELECT SUM( TRAYEK_JUMLAHISIBBMDISETUJUI ) AS BERAT, DATE_FORMAT(DATE( haritransaksi.haritransaksi_tanggal ),'%Y-%m-%d') AS TANGGAL FROM  `trayek`
			JOIN rute ON trayek.rute_id = rute.rute_id
            JOIN spot ON spot.spot_id = rute.spot_asal_id
            JOIN kategorirute ON kategorirute.kategorirute_id = rute.kategorirute_id
            JOIN detailtransaksiangkutsampah ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
            JOIN transaksiangkutsampah ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
            JOIN haritransaksi ON haritransaksi.haritransaksi_id = transaksiangkutsampah.haritransaksi_id
			WHERE MONTH(haritransaksi.haritransaksi_tanggal) = MONTH('".$tanggal."')
			AND YEAR (haritransaksi.haritransaksi_tanggal) = YEAR('".$tanggal."')
            GROUP BY haritransaksi_tanggal
            ORDER BY TANGGAL DESC
        ");
    }

    function get_all_paging_sorting_kendaraan($jtStartIndex,$jtPageSize,$jtSorting){
        return $this->db->query("
			SELECT * FROM kendaraan 
			ORDER BY " . $jtSorting .
            " LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
		");
    }
}

?>