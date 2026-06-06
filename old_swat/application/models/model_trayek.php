<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_trayek extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {

	}
	//End of Constructor ------------------------------------------------------------

	//Begin of Get Data Trayek ------------------------------------------------------------
	function get_all_trayek(){
		$this->db->from('trayek');
		return $this->db->get();
	}

	function get_all_trayek_with_detailtransaksiangkutsampah_and_rute_and_statustrayek(){
		return $this->db->query("select detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID,trayek.TRAYEK_ID, asal.KATEGORISPOT_ID as KATEGORI_SPOT_ASAL_ID,asal.SPOT_ID as SPOT_ASAL_ID, asal.SPOT_NAMA as SPOT_ASAL_NAMA, tujuan.KATEGORISPOT_ID as KATEGORI_SPOT_TUJUAN_ID,tujuan.SPOT_ID as SPOT_TUJUAN_ID, tujuan.SPOT_NAMA as SPOT_TUJUAN_NAMA, trayek.TRAYEK_NAMA,trayek.TRAYEK_WAKTUTARGET, trayek.TRAYEK_WAKTUREALISASI, trayek.TRAYEK_KMTARGET, trayek.TRAYEK_KMREALISASI, trayek.TRAYEK_BERATKOSONGKENDARAAN, trayek.TRAYEK_BERATKOTORTIMBANGAN, trayek.TRAYEK_BERATBERSIHSAMPAH, trayek.TRAYEK_JUMLAHISIBBMDIAJUKAN,trayek.TRAYEK_JUMLAHISIBBMDISETUJUI, statustrayek.STATUSTRAYEK_NAMA, trayek.TRAYEK_WAKTUENTRIPENJADWALAN, trayek.TRAYEK_KETERANGAN  from trayek
join detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
join rute on trayek.RUTE_ID = rute.RUTE_ID
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
join statustrayek on trayek.STATUSTRAYEK_ID = statustrayek.STATUSTRAYEK_ID
ORDER BY trayek.TRAYEK_WAKTUREALISASI ASC,trayek.TRAYEK_WAKTUTARGET ASC");
		/*$this->db->from('trayek');
		$this->db->join('detailtransaksiangkutsampah','trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID');
		$this->db->join('rute','trayek.RUTE_ID = rute.RUTE_ID');
		$this->db->join('statustrayek','trayek.STATUSTRAYEK_ID = statustrayek.STATUSTRAYEK_ID');*/
		return $this->db->get();
	}

	function get_all_trayek_with_detailtransaksiangkutsampah_and_rute_and_statustrayek_by_filter($detailTransaksiID,$statusTrayek){
		$clause = "WHERE 1=1";
		if($detailTransaksiID){
			$clause.=" AND trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID='".$detailTransaksiID."'";
		}
		if($statusTrayek){
			$clause.=" AND statustrayek.STATUSTRAYEK_ID='".$statusTrayek."'";
		}
		return $this->db->query("
			SELECT  detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID,trayek.TRAYEK_ID, asal.KATEGORISPOT_ID as KATEGORI_SPOT_ASAL_ID,asal.SPOT_ID as SPOT_ASAL_ID, asal.SPOT_NAMA as SPOT_ASAL_NAMA, tujuan.KATEGORISPOT_ID as KATEGORI_SPOT_TUJUAN_ID,tujuan.SPOT_ID as SPOT_TUJUAN_ID, tujuan.SPOT_NAMA as SPOT_TUJUAN_NAMA, trayek.TRAYEK_NAMA,trayek.TRAYEK_WAKTUTARGET, trayek.TRAYEK_WAKTUREALISASI, trayek.TRAYEK_KMTARGET, trayek.TRAYEK_KMREALISASI, trayek.TRAYEK_BERATKOSONGKENDARAAN, trayek.TRAYEK_BERATKOTORTIMBANGAN, trayek.TRAYEK_BERATBERSIHSAMPAH, trayek.TRAYEK_JUMLAHISIBBMDIAJUKAN,trayek.TRAYEK_JUMLAHISIBBMDISETUJUI, statustrayek.STATUSTRAYEK_ID,statustrayek.STATUSTRAYEK_NAMA, trayek.TRAYEK_WAKTUENTRIPENJADWALAN,trayek.TRAYEK_WAKTUENTRIREALISASI, trayek.TRAYEK_KETERANGAN  from trayek
			JOIN detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
			JOIN rute on trayek.RUTE_ID = rute.RUTE_ID
			JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
			JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
			JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
			JOIN statustrayek on trayek.STATUSTRAYEK_ID = statustrayek.STATUSTRAYEK_ID
			".$clause."
			ORDER BY trayek.TRAYEK_WAKTUREALISASI ASC,trayek.TRAYEK_WAKTUTARGET ASC");
		return $this->db->get();
	}

	function get_all_paging_sorting_trayek_with_detailtransaksiangkutsampah_and_rute_and_statustrayek_by_filter($detailTransaksiID,$statusTrayek,$jtStartIndex,$jtPageSize,$jtSorting){
		$clause = "WHERE 1=1";
		if($detailTransaksiID){
			$clause.=" AND trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID='".$detailTransaksiID."'";
		}
		if($statusTrayek){
			$clause.=" AND statustrayek.STATUSTRAYEK_ID='".$statusTrayek."'";
		}
		return $this->db->query("
			SELECT  detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID,trayek.TRAYEK_ID, asal.KATEGORISPOT_ID as KATEGORI_SPOT_ASAL_ID,asal.SPOT_ID as SPOT_ASAL_ID, asal.SPOT_NAMA as SPOT_ASAL_NAMA, tujuan.KATEGORISPOT_ID as KATEGORI_SPOT_TUJUAN_ID,tujuan.SPOT_ID as SPOT_TUJUAN_ID, tujuan.SPOT_NAMA as SPOT_TUJUAN_NAMA, trayek.TRAYEK_NAMA,trayek.TRAYEK_WAKTUTARGET, trayek.TRAYEK_WAKTUREALISASI, trayek.TRAYEK_KMTARGET, trayek.TRAYEK_KMREALISASI, trayek.TRAYEK_BERATKOSONGKENDARAAN, trayek.TRAYEK_BERATKOTORTIMBANGAN, trayek.TRAYEK_BERATBERSIHSAMPAH, trayek.TRAYEK_JUMLAHISIBBMDIAJUKAN,trayek.TRAYEK_JUMLAHISIBBMDISETUJUI, statustrayek.STATUSTRAYEK_ID,statustrayek.STATUSTRAYEK_NAMA, trayek.TRAYEK_WAKTUENTRIPENJADWALAN,trayek.TRAYEK_WAKTUENTRIREALISASI, trayek.TRAYEK_KETERANGAN  from trayek
			JOIN detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
			JOIN rute on trayek.RUTE_ID = rute.RUTE_ID
			JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
			JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
			JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
			JOIN statustrayek on trayek.STATUSTRAYEK_ID = statustrayek.STATUSTRAYEK_ID
			".$clause."
			ORDER BY ".$jtSorting."
			LIMIT ".$jtStartIndex.",".$jtPageSize.";
		");
		return $this->db->get();
	}

	function get_trayek_by_trayek_id_with_detailtransaksiangkutsampah_and_rute_and_statustrayek($trayekID){
		return $this->db->query("select detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID,trayek.TRAYEK_ID, asal.KATEGORISPOT_ID as KATEGORI_SPOT_ASAL_ID,asal.SPOT_ID as SPOT_ASAL_ID, asal.SPOT_NAMA as SPOT_ASAL_NAMA, tujuan.KATEGORISPOT_ID as KATEGORI_SPOT_TUJUAN_ID,tujuan.SPOT_ID as SPOT_TUJUAN_ID, tujuan.SPOT_NAMA as SPOT_TUJUAN_NAMA, trayek.TRAYEK_NAMA,trayek.TRAYEK_WAKTUTARGET, trayek.TRAYEK_WAKTUREALISASI, trayek.TRAYEK_KMTARGET, trayek.TRAYEK_KMREALISASI, trayek.TRAYEK_BERATKOSONGKENDARAAN, trayek.TRAYEK_BERATKOTORTIMBANGAN, trayek.TRAYEK_BERATBERSIHSAMPAH, trayek.TRAYEK_JUMLAHISIBBMDIAJUKAN,trayek.TRAYEK_JUMLAHISIBBMDISETUJUI, statustrayek.STATUSTRAYEK_ID,statustrayek.STATUSTRAYEK_NAMA, trayek.TRAYEK_WAKTUENTRIPENJADWALAN,trayek.TRAYEK_WAKTUENTRIREALISASI, trayek.TRAYEK_KETERANGAN  from trayek
JOIN detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
JOIN rute on trayek.RUTE_ID = rute.RUTE_ID
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
JOIN statustrayek on trayek.STATUSTRAYEK_ID = statustrayek.STATUSTRAYEK_ID
WHERE trayek.TRAYEK_ID = ".$trayekID."
ORDER BY trayek.TRAYEK_WAKTUREALISASI ASC,trayek.TRAYEK_WAKTUTARGET ASC");
		return $this->db->get();
	}

	function get_trayek_by_detailtransaksiangkutsampah_id_with_detailtransaksiangkutsampah_and_rute_and_statustrayek($detailTransaksiID){
		return $this->db->query("select detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID,trayek.TRAYEK_ID, asal.KATEGORISPOT_ID as KATEGORI_SPOT_ASAL_ID,asal.SPOT_ID as SPOT_ASAL_ID, asal.SPOT_NAMA as SPOT_ASAL_NAMA, tujuan.KATEGORISPOT_ID as KATEGORI_SPOT_TUJUAN_ID,tujuan.SPOT_ID as SPOT_TUJUAN_ID, tujuan.SPOT_NAMA as SPOT_TUJUAN_NAMA, trayek.TRAYEK_NAMA,trayek.TRAYEK_WAKTUTARGET, trayek.TRAYEK_WAKTUREALISASI, trayek.TRAYEK_KMTARGET, trayek.TRAYEK_KMREALISASI, trayek.TRAYEK_BERATKOSONGKENDARAAN, trayek.TRAYEK_BERATKOTORTIMBANGAN, trayek.TRAYEK_BERATBERSIHSAMPAH, trayek.TRAYEK_JUMLAHISIBBMDIAJUKAN,trayek.TRAYEK_JUMLAHISIBBMDISETUJUI, statustrayek.STATUSTRAYEK_ID,statustrayek.STATUSTRAYEK_NAMA, trayek.TRAYEK_WAKTUENTRIPENJADWALAN,trayek.TRAYEK_WAKTUENTRIREALISASI, trayek.TRAYEK_KETERANGAN  from trayek
JOIN detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
JOIN rute on trayek.RUTE_ID = rute.RUTE_ID
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
JOIN statustrayek on trayek.STATUSTRAYEK_ID = statustrayek.STATUSTRAYEK_ID
WHERE detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID = ".$detailTransaksiID."
ORDER BY trayek.TRAYEK_WAKTUREALISASI ASC,trayek.TRAYEK_WAKTUTARGET ASC");
		return $this->db->get();
	}

	function get_trayek_BBM($tanggalHariIni,$kendaraanID){
		return $this->db->query("
			select haritransaksi.HARITRANSAKSI_ID as hariTransaksiID,trayek.TRAYEK_ID as trayekID from haritransaksi
			join transaksiangkutsampah on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
			join detailtransaksiangkutsampah on transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
			join kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
			join trayek on detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID = trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID
			join rute on trayek.RUTE_ID = rute.RUTE_ID
			join kategorirute on rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
			where haritransaksi.HARITRANSAKSI_TANGGAL = '".$tanggalHariIni."' AND
			detailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID = 1 AND
			trayek.STATUSTRAYEK_ID = 1 AND
			kategorirute.KATEGORIRUTE_ID = 2 AND
			kendaraan.KENDARAAN_ID = ".$kendaraanID."
			ORDER BY trayek.TRAYEK_WAKTUREALISASI ASC,trayek.TRAYEK_WAKTUTARGET ASC
		");
	}

	function get_all_trayek_penggunaanbahanbakar_by_filter($tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$bahanBakar,$statusTrayek){
		$clause = "WHERE kategorirute.KATEGORIRUTE_ID = 2";
		if($tanggalTransaksi){
			$clause.=" AND haritransaksi.HARITRANSAKSI_TANGGAL='".$tanggalTransaksi."'";
		}
		if($nopolKendaraan){
			$clause.=" AND kendaraan.KENDARAAN_NOMORPOLISI LIKE '%".$nopolKendaraan."%'";
		}
		if($aplikasiKendaraan){
			$clause.=" AND aplikasikendaraan.APLIKASIKENDARAAN_ID='".$aplikasiKendaraan."'";
		}
		if($kategoriKendaraan){
			$clause.=" AND kategorikendaraan.KATEGORIKENDARAAN_ID='".$kategoriKendaraan."'";
		}
		if($bahanBakar){
			$clause.=" AND bahanbakar.BAHANBAKAR_ID='".$bahanBakar."'";
		}
		if($statusTrayek){
			$clause.=" AND trayek.STATUSTRAYEK_ID='".$statusTrayek."'";
		}
		return $this->db->query("
        	SELECT haritransaksi.HARITRANSAKSI_TANGGAL AS HARITRANSAKSI_TANGGAL, trayek.TRAYEK_ID AS TRAYEK_ID, kendaraan.KENDARAAN_NOMORPOLISI AS KENDARAAN_NOMORPOLISI,kategorikendaraan.KATEGORIKENDARAAN_MERK AS KATEGORIKENDARAAN_MERK,aplikasikendaraan.APLIKASIKENDARAAN_NAMA AS APLIKASIKENDARAAN_NAMA, bahanbakar.BAHANBAKAR_NAMA AS BAHANBAKAR_NAMA,trayek.TRAYEK_JUMLAHISIBBMDIAJUKAN AS JUMLAHBBMDIAJUKAN,trayek.TRAYEK_JUMLAHISIBBMDISETUJUI AS JUMLAHBBMDISETUJUI,trayek.TRAYEK_KMREALISASI AS TRAYEK_KMREALISASI,trayek.TRAYEK_WAKTUREALISASI AS TRAYEK_WAKTUREALISASI ,trayek.TRAYEK_WAKTUENTRIREALISASI AS TRAYEK_WAKTUENTRIREALISASI, trayek.TRAYEK_KETERANGAN AS TRAYEK_KETERANGAN
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
			".$clause.";
        ");
	}

	function get_all_paging_sorting_trayek_penggunaanbahanbakar_by_filter($tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$bahanBakar,$statusTrayek,$jtStartIndex,$jtPageSize,$jtSorting){
		$clause = "WHERE kategorirute.KATEGORIRUTE_ID = 2";
		if($tanggalTransaksi){
			$clause.=" AND haritransaksi.HARITRANSAKSI_TANGGAL='".$tanggalTransaksi."'";
		}
		if($nopolKendaraan){
			$clause.=" AND kendaraan.KENDARAAN_NOMORPOLISI LIKE '%".$nopolKendaraan."%'";
		}
		if($aplikasiKendaraan){
			$clause.=" AND aplikasikendaraan.APLIKASIKENDARAAN_ID='".$aplikasiKendaraan."'";
		}
		if($kategoriKendaraan){
			$clause.=" AND kategorikendaraan.KATEGORIKENDARAAN_ID='".$kategoriKendaraan."'";
		}
		if($bahanBakar){
			$clause.=" AND bahanbakar.BAHANBAKAR_ID='".$bahanBakar."'";
		}
		if($statusTrayek){
			$clause.=" AND trayek.STATUSTRAYEK_ID='".$statusTrayek."'";
		}
		return $this->db->query("
        	SELECT haritransaksi.HARITRANSAKSI_TANGGAL AS HARITRANSAKSI_TANGGAL, trayek.TRAYEK_ID AS TRAYEK_ID, kendaraan.KENDARAAN_NOMORPOLISI AS KENDARAAN_NOMORPOLISI,kategorikendaraan.KATEGORIKENDARAAN_MERK AS KATEGORIKENDARAAN_MERK,aplikasikendaraan.APLIKASIKENDARAAN_NAMA AS APLIKASIKENDARAAN_NAMA, bahanbakar.BAHANBAKAR_NAMA AS BAHANBAKAR_NAMA,trayek.TRAYEK_JUMLAHISIBBMDIAJUKAN AS JUMLAHBBMDIAJUKAN,trayek.TRAYEK_JUMLAHISIBBMDISETUJUI AS JUMLAHBBMDISETUJUI,trayek.TRAYEK_KMREALISASI AS TRAYEK_KMREALISASI,trayek.TRAYEK_WAKTUREALISASI AS TRAYEK_WAKTUREALISASI ,trayek.TRAYEK_WAKTUENTRIREALISASI AS TRAYEK_WAKTUENTRIREALISASI, trayek.TRAYEK_KETERANGAN AS TRAYEK_KETERANGAN
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
			ORDER BY " . $jtSorting .
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
        ");
	}

	function get_trayek_pembuangan($tanggalHariIni,$kendaraanID,$tpsID){
		return $this->db->query("
			select haritransaksi.HARITRANSAKSI_ID as hariTransaksiID,trayek.TRAYEK_ID as trayekID from haritransaksi
			join transaksiangkutsampah on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
			join detailtransaksiangkutsampah on transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
			join kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
			join trayek on detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID = trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID
			join rute on trayek.RUTE_ID = rute.RUTE_ID
			join spot on rute.SPOT_ASAL_ID = spot.SPOT_ID
			join kategorirute on rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
			where haritransaksi.HARITRANSAKSI_TANGGAL = '".$tanggalHariIni."' AND
			detailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID = 1 AND
			trayek.STATUSTRAYEK_ID = 1 AND
			kategorirute.KATEGORIRUTE_ID = 4 AND
			kendaraan.KENDARAAN_ID = ".$kendaraanID."
			AND spot.SPOT_ID = ".$tpsID."
			ORDER BY trayek.TRAYEK_WAKTUREALISASI ASC,trayek.TRAYEK_WAKTUTARGET ASC
		");
	}

	function get_trayek_pembuangan_terverifikasi($tanggal){
		return $this->db->query("
			select kendaraan.KENDARAAN_ID ,kendaraan.KENDARAAN_NOMORPOLISI, spot.SPOT_NAMA, trayek.TRAYEK_ID, trayek.TRAYEK_WAKTUREALISASI, trayek.TRAYEK_WAKTUENTRIREALISASI from haritransaksi
			join transaksiangkutsampah on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
			join detailtransaksiangkutsampah on transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
			join kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
			join trayek on detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID = trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID
			join rute on trayek.RUTE_ID = rute.RUTE_ID
			join spot on rute.SPOT_ASAL_ID = spot.SPOT_ID
			join kategorirute on rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
			where haritransaksi.HARITRANSAKSI_TANGGAL = '".$tanggal."' AND
			kategorirute.KATEGORIRUTE_ID = 4 AND
			trayek.STATUSTRAYEK_ID = 3
			ORDER BY trayek.TRAYEK_WAKTUREALISASI ASC
		");
	}

	function get_trayek_pembuangan_terverifikasi_with_nopol($tanggal, $nopol){
		return $this->db->query("
			select kendaraan.KENDARAAN_ID ,kendaraan.KENDARAAN_NOMORPOLISI, spot.SPOT_NAMA, trayek.TRAYEK_ID, trayek.TRAYEK_WAKTUREALISASI, trayek.TRAYEK_WAKTUENTRIREALISASI from haritransaksi
			join transaksiangkutsampah on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
			join detailtransaksiangkutsampah on transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
			join kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
			join trayek on detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID = trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID
			join rute on trayek.RUTE_ID = rute.RUTE_ID
			join spot on rute.SPOT_ASAL_ID = spot.SPOT_ID
			join kategorirute on rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
			where haritransaksi.HARITRANSAKSI_TANGGAL = '".$tanggal."' AND
			kategorirute.KATEGORIRUTE_ID = 4 AND
			trayek.STATUSTRAYEK_ID = 3 AND
			kendaraan.KENDARAAN_NOMORPOLISI = '".$nopol."'
			ORDER BY trayek.TRAYEK_WAKTUREALISASI DESC
		");
	}

	function get_all_trayek_pembuangansampah_by_filterJSON($tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$tps,$statusTrayek,$jtStartIndex,$jtPageSize,$jtSorting){
		$clause = "WHERE kategorirute.KATEGORIRUTE_ID = 4";
		if($tanggalTransaksi){
			$clause.=" AND haritransaksi.HARITRANSAKSI_TANGGAL='".$tanggalTransaksi."'";
		}
		if($nopolKendaraan){
			$clause.=" AND kendaraan.KENDARAAN_NOMORPOLISI LIKE '%".$nopolKendaraan."%'";
		}
		if($aplikasiKendaraan){
			$clause.=" AND aplikasikendaraan.APLIKASIKENDARAAN_ID='".$aplikasiKendaraan."'";
		}
		if($kategoriKendaraan){
			$clause.=" AND kategorikendaraan.KATEGORIKENDARAAN_ID='".$kategoriKendaraan."'";
		}
		if($tps){
			$clause.=" AND asal.SPOT_ID='".$tps."'";
		}
		if($statusTrayek){
			$clause.=" AND trayek.STATUSTRAYEK_ID='".$statusTrayek."'";
		}
		return $this->db->query("
        	SELECT haritransaksi.HARITRANSAKSI_TANGGAL AS HARITRANSAKSI_TANGGAL, trayek.TRAYEK_ID AS TRAYEK_ID, kendaraan.KENDARAAN_NOMORPOLISI AS KENDARAAN_NOMORPOLISI,kategorikendaraan.KATEGORIKENDARAAN_MERK AS KATEGORIKENDARAAN_MERK,aplikasikendaraan.APLIKASIKENDARAAN_NAMA AS APLIKASIKENDARAAN_NAMA, asal.KATEGORISPOT_ID as KATEGORI_SPOT_ASAL_ID,asal.SPOT_ID as SPOT_ASAL_ID, asal.SPOT_NAMA as SPOT_ASAL_NAMA, tujuan.KATEGORISPOT_ID as KATEGORI_SPOT_TUJUAN_ID,tujuan.SPOT_ID as SPOT_TUJUAN_ID, tujuan.SPOT_NAMA as SPOT_TUJUAN_NAMA,trayek.TRAYEK_KMREALISASI AS TRAYEK_KMREALISASI,trayek.TRAYEK_WAKTUREALISASI AS TRAYEK_WAKTUREALISASI ,trayek.TRAYEK_WAKTUENTRIREALISASI AS TRAYEK_WAKTUENTRIREALISASI,trayek.TRAYEK_BERATBERSIHSAMPAH AS TRAYEK_BERATBERSIHSAMPAH, trayek.TRAYEK_BERATKOSONGKENDARAAN AS TRAYEK_BERATKOSONGKENDARAAN, trayek.TRAYEK_BERATKOTORTIMBANGAN AS TRAYEK_BERATKOTORTIMBANGAN, trayek.TRAYEK_KETERANGAN AS TRAYEK_KETERANGAN
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
			".$clause."
			ORDER BY " . $jtSorting .
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
        ");
	}

	function get_all_trayek_pembuangansampah_by_filter($tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$tps,$statusTrayek){
		$clauseNumbering = " WHERE rute.KATEGORIRUTE_ID = 4";
		if($tanggalTransaksi){
			$clauseNumbering.=" AND haritransaksi.HARITRANSAKSI_TANGGAL='".$tanggalTransaksi."'";
		}

		$clause = " WHERE 1 = 1";
		if($nopolKendaraan){
			$clause.=" AND kendaraan.KENDARAAN_NOMORPOLISI LIKE '%".$nopolKendaraan."%'";
		}
		if($aplikasiKendaraan){
			$clause.=" AND aplikasikendaraan.APLIKASIKENDARAAN_ID='".$aplikasiKendaraan."'";
		}
		if($kategoriKendaraan){
			$clause.=" AND kategorikendaraan.KATEGORIKENDARAAN_ID='".$kategoriKendaraan."'";
		}
		if($tps){
			$clause.=" AND asal.SPOT_ID='".$tps."'";
		}
		if($statusTrayek){
			$clause.=" AND completenumberedpembuangan.STATUSTRAYEK_ID='".$statusTrayek."'";
		}
		return $this->db->query("
        	SELECT completenumberedpembuangan.row_number AS URUTANPEMBUANGAN,
        		haritransaksi.HARITRANSAKSI_TANGGAL AS HARITRANSAKSI_TANGGAL,
        		completenumberedpembuangan.TRAYEK_ID AS TRAYEK_ID,
        		kendaraan.KENDARAAN_NOMORPOLISI AS KENDARAAN_NOMORPOLISI,
        		kategorikendaraan.KATEGORIKENDARAAN_MERK AS KATEGORIKENDARAAN_MERK,
        		aplikasikendaraan.APLIKASIKENDARAAN_NAMA AS APLIKASIKENDARAAN_NAMA,
        		asal.KATEGORISPOT_ID AS KATEGORI_SPOT_ASAL_ID,
        		asal.SPOT_ID AS SPOT_ASAL_ID,
        		asal.SPOT_NAMA as SPOT_ASAL_NAMA,
        		tujuan.KATEGORISPOT_ID AS KATEGORI_SPOT_TUJUAN_ID,
        		tujuan.SPOT_ID AS SPOT_TUJUAN_ID,
        		tujuan.SPOT_NAMA AS SPOT_TUJUAN_NAMA,
        		completenumberedpembuangan.TRAYEK_KMREALISASI AS TRAYEK_KMREALISASI,
        		completenumberedpembuangan.TRAYEK_WAKTUREALISASI AS TRAYEK_WAKTUREALISASI ,
        		completenumberedpembuangan.TRAYEK_WAKTUENTRIREALISASI AS TRAYEK_WAKTUENTRIREALISASI,
        		completenumberedpembuangan.TRAYEK_BERATBERSIHSAMPAH AS TRAYEK_BERATBERSIHSAMPAH,
        		completenumberedpembuangan.TRAYEK_BERATKOSONGKENDARAAN AS TRAYEK_BERATKOSONGKENDARAAN,
        		completenumberedpembuangan.TRAYEK_BERATKOTORTIMBANGAN AS TRAYEK_BERATKOTORTIMBANGAN,
        		completenumberedpembuangan.PENGGUNA_ID AS PENGGUNA_ID,
        		pengguna.PENGGUNA_NAMA AS PENGGUNA_NAMA,
        		completenumberedpembuangan.TRAYEK_KETERANGAN AS TRAYEK_KETERANGAN
			FROM(
				SELECT @row_number:=@row_number+1 AS row_number,numberedpembuangan.*
			    FROM(
			    	SELECT pembuangan.TRAYEK_ID, pembuangan.DETAILTRANSAKSIANGKUTSAMPAH_ID, pembuangan.PENGGUNA_ID, pembuangan.RUTE_ID,pembuangan.TRAYEK_WAKTUREALISASI, pembuangan.TRAYEK_WAKTUENTRIREALISASI,pembuangan.TRAYEK_KMREALISASI, pembuangan.TRAYEK_BERATBERSIHSAMPAH, pembuangan.TRAYEK_BERATKOSONGKENDARAAN, pembuangan.TRAYEK_BERATKOTORTIMBANGAN, pembuangan.STATUSTRAYEK_ID, pembuangan.TRAYEK_KETERANGAN
			    	FROM(
				        SELECT trayek.TRAYEK_ID, trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID, trayek.PENGGUNA_ID, trayek.RUTE_ID,trayek.TRAYEK_WAKTUREALISASI, trayek.TRAYEK_WAKTUENTRIREALISASI,trayek.TRAYEK_KMREALISASI, trayek.TRAYEK_BERATBERSIHSAMPAH, trayek.TRAYEK_BERATKOSONGKENDARAAN, trayek.TRAYEK_BERATKOTORTIMBANGAN, trayek.STATUSTRAYEK_ID, trayek.TRAYEK_KETERANGAN
				        FROM trayek
				        JOIN detailtransaksiangkutsampah ON trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
				        JOIN transaksiangkutsampah ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
				        JOIN haritransaksi ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
				        JOIN rute ON trayek.RUTE_ID = rute.RUTE_ID
				        ".$clauseNumbering."
					) AS pembuangan
					WHERE pembuangan.STATUSTRAYEK_ID='2' OR pembuangan.STATUSTRAYEK_ID='3'
					ORDER BY pembuangan.TRAYEK_WAKTUREALISASI ASC
			    ) AS numberedpembuangan,(SELECT @row_number:=0) AS t
			) AS completenumberedpembuangan
			LEFT JOIN pengguna ON completenumberedpembuangan.PENGGUNA_ID = pengguna.PENGGUNA_ID
			JOIN rute ON completenumberedpembuangan.RUTE_ID = rute.RUTE_ID
			JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
			JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
			JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
			JOIN detailtransaksiangkutsampah ON completenumberedpembuangan.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
			JOIN transaksiangkutsampah ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
			JOIN haritransaksi ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
			JOIN kendaraan ON transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
			JOIN kategorikendaraan ON kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
			JOIN aplikasikendaraan ON kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
			".$clause.";
        ");
	}


function get_all_paging_sorting_trayek_pembuangansampah_by_filter($tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$tps,$statusTrayek,$jtStartIndex,$jtPageSize,$jtSorting){
		$clauseNumbering = " WHERE rute.KATEGORIRUTE_ID = 4";
		if($tanggalTransaksi){
			$clauseNumbering.=" AND haritransaksi.HARITRANSAKSI_TANGGAL='".$tanggalTransaksi."'";
		}

		$clause = " WHERE 1 = 1";
		if($nopolKendaraan){
			$clause.=" AND kendaraan.KENDARAAN_NOMORPOLISI LIKE '%".$nopolKendaraan."%'";
		}
		if($aplikasiKendaraan){
			$clause.=" AND aplikasikendaraan.APLIKASIKENDARAAN_ID='".$aplikasiKendaraan."'";
		}
		if($kategoriKendaraan){
			$clause.=" AND kategorikendaraan.KATEGORIKENDARAAN_ID='".$kategoriKendaraan."'";
		}
		if($tps){
			$clause.=" AND asal.SPOT_ID='".$tps."'";
		}
		if($statusTrayek){
			$clause.=" AND completenumberedpembuangan.STATUSTRAYEK_ID='".$statusTrayek."'";
		}
		return $this->db->query("
			SELECT completenumberedpembuangan.row_number AS URUTANPEMBUANGAN,
        		haritransaksi.HARITRANSAKSI_TANGGAL AS HARITRANSAKSI_TANGGAL,
        		completenumberedpembuangan.TRAYEK_ID AS TRAYEK_ID,
        		kendaraan.KENDARAAN_NOMORPOLISI AS KENDARAAN_NOMORPOLISI,
        		kategorikendaraan.KATEGORIKENDARAAN_MERK AS KATEGORIKENDARAAN_MERK,
        		aplikasikendaraan.APLIKASIKENDARAAN_NAMA AS APLIKASIKENDARAAN_NAMA,
        		asal.KATEGORISPOT_ID AS KATEGORI_SPOT_ASAL_ID,
        		asal.SPOT_ID AS SPOT_ASAL_ID,
        		asal.SPOT_NAMA as SPOT_ASAL_NAMA,
        		tujuan.KATEGORISPOT_ID AS KATEGORI_SPOT_TUJUAN_ID,
        		tujuan.SPOT_ID AS SPOT_TUJUAN_ID,
        		tujuan.SPOT_NAMA AS SPOT_TUJUAN_NAMA,
        		completenumberedpembuangan.TRAYEK_KMREALISASI AS TRAYEK_KMREALISASI,
        		completenumberedpembuangan.TRAYEK_WAKTUREALISASI AS TRAYEK_WAKTUREALISASI ,
        		completenumberedpembuangan.TRAYEK_WAKTUENTRIREALISASI AS TRAYEK_WAKTUENTRIREALISASI,
        		completenumberedpembuangan.TRAYEK_BERATBERSIHSAMPAH AS TRAYEK_BERATBERSIHSAMPAH,
        		completenumberedpembuangan.TRAYEK_BERATKOSONGKENDARAAN AS TRAYEK_BERATKOSONGKENDARAAN,
        		completenumberedpembuangan.TRAYEK_BERATKOTORTIMBANGAN AS TRAYEK_BERATKOTORTIMBANGAN,
        		completenumberedpembuangan.PENGGUNA_ID AS PENGGUNA_ID,
        		pengguna.PENGGUNA_NAMA AS PENGGUNA_NAMA,
        		completenumberedpembuangan.TRAYEK_KETERANGAN AS TRAYEK_KETERANGAN
			FROM(
				SELECT @row_number:=@row_number+1 AS row_number,numberedpembuangan.*
			    FROM(
			    	SELECT pembuangan.TRAYEK_ID, pembuangan.DETAILTRANSAKSIANGKUTSAMPAH_ID, pembuangan.PENGGUNA_ID, pembuangan.RUTE_ID,pembuangan.TRAYEK_WAKTUREALISASI, pembuangan.TRAYEK_WAKTUENTRIREALISASI,pembuangan.TRAYEK_KMREALISASI, pembuangan.TRAYEK_BERATBERSIHSAMPAH, pembuangan.TRAYEK_BERATKOSONGKENDARAAN, pembuangan.TRAYEK_BERATKOTORTIMBANGAN, pembuangan.STATUSTRAYEK_ID, pembuangan.TRAYEK_KETERANGAN
			    	FROM(
				        SELECT trayek.TRAYEK_ID, trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID, trayek.PENGGUNA_ID, trayek.RUTE_ID,trayek.TRAYEK_WAKTUREALISASI, trayek.TRAYEK_WAKTUENTRIREALISASI,trayek.TRAYEK_KMREALISASI, trayek.TRAYEK_BERATBERSIHSAMPAH, trayek.TRAYEK_BERATKOSONGKENDARAAN, trayek.TRAYEK_BERATKOTORTIMBANGAN, trayek.STATUSTRAYEK_ID, trayek.TRAYEK_KETERANGAN
				        FROM trayek
				        JOIN detailtransaksiangkutsampah ON trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
				        JOIN transaksiangkutsampah ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
				        JOIN haritransaksi ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
				        JOIN rute ON trayek.RUTE_ID = rute.RUTE_ID
				        ".$clauseNumbering."
					) AS pembuangan
					WHERE pembuangan.STATUSTRAYEK_ID='2' OR pembuangan.STATUSTRAYEK_ID='3'
					ORDER BY pembuangan.TRAYEK_WAKTUREALISASI ASC
			    ) AS numberedpembuangan,(SELECT @row_number:=0) AS t
			) AS completenumberedpembuangan
			LEFT JOIN pengguna ON completenumberedpembuangan.PENGGUNA_ID = pengguna.PENGGUNA_ID
			JOIN rute ON completenumberedpembuangan.RUTE_ID = rute.RUTE_ID
			JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
			JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
			JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
			JOIN detailtransaksiangkutsampah ON completenumberedpembuangan.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
			JOIN transaksiangkutsampah ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
			JOIN haritransaksi ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
			JOIN kendaraan ON transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
			JOIN kategorikendaraan ON kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
			JOIN aplikasikendaraan ON kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
			".$clause."
			ORDER BY " . $jtSorting .
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
        ");
	}

	function get_all_trayek_pembuangansampah_by_filterbulan($bulan,$tahun,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$tps,$statusTrayek){
		$clauseNumbering = " WHERE rute.KATEGORIRUTE_ID = 4 AND trayek.STATUSTRAYEK_ID='2'";
		if($tahun){
			$clauseNumbering.=" AND year(HARITRANSAKSI_TANGGAL)='".$tahun."'";
		}

		if($bulan){
			$clauseNumbering.=" AND month(HARITRANSAKSI_TANGGAL)='".$bulan."'";
		}

		$clause = " WHERE kategorirute.KATEGORIRUTE_ID = 4";
		if($tahun){
			$clause.=" AND year(HARITRANSAKSI_TANGGAL)='".$tahun."'";
		}

		if($bulan){
			$clause.=" AND month(HARITRANSAKSI_TANGGAL)='".$bulan."'";
		}
		if($nopolKendaraan){
			$clause.=" AND kendaraan.KENDARAAN_NOMORPOLISI LIKE '%".$nopolKendaraan."%'";
		}
		if($aplikasiKendaraan){
			$clause.=" AND aplikasikendaraan.APLIKASIKENDARAAN_ID='".$aplikasiKendaraan."'";
		}
		if($kategoriKendaraan){
			$clause.=" AND kategorikendaraan.KATEGORIKENDARAAN_ID='".$kategoriKendaraan."'";
		}
		if($tps){
			$clause.=" AND asal.SPOT_ID='".$tps."'";
		}
		if($statusTrayek){
			$clause.=" AND numberedPembuangan.STATUSTRAYEK_ID='".$statusTrayek."'";
		}
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
        ".$clauseNumbering."
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
			".$clause.";
        ");
	}

	function get_all_trayek_pembuangansampah_by_filterJSONbulan($bulan,$tahun,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$tps,$statusTrayek,$jtStartIndex,$jtPageSize,$jtSorting){
		$clause = "WHERE kategorirute.KATEGORIRUTE_ID = 4";
		/*if($tanggalTransaksi){
			$clause.=" AND haritransaksi.HARITRANSAKSI_TANGGAL='".$tanggalTransaksi."'";
		}*/
		if($tahun){
			$clause.=" AND year(haritransaksi.HARITRANSAKSI_TANGGAL)='".$tahun."'";
		}

		if($bulan){
			$clause.=" AND month(haritransaksi.HARITRANSAKSI_TANGGAL)='".$bulan."'";
		}
		if($nopolKendaraan){
			$clause.=" AND kendaraan.KENDARAAN_NOMORPOLISI LIKE '%".$nopolKendaraan."%'";
		}
		if($aplikasiKendaraan){
			$clause.=" AND aplikasikendaraan.APLIKASIKENDARAAN_ID='".$aplikasiKendaraan."'";
		}
		if($kategoriKendaraan){
			$clause.=" AND kategorikendaraan.KATEGORIKENDARAAN_ID='".$kategoriKendaraan."'";
		}
		if($tps){
			$clause.=" AND asal.SPOT_ID='".$tps."'";
		}
		if($statusTrayek){
			$clause.=" AND trayek.STATUSTRAYEK_ID='".$statusTrayek."'";
		}
		return $this->db->query("
        	SELECT haritransaksi.HARITRANSAKSI_TANGGAL AS HARITRANSAKSI_TANGGAL, trayek.TRAYEK_ID AS TRAYEK_ID, kendaraan.KENDARAAN_NOMORPOLISI AS KENDARAAN_NOMORPOLISI,kategorikendaraan.KATEGORIKENDARAAN_MERK AS KATEGORIKENDARAAN_MERK,aplikasikendaraan.APLIKASIKENDARAAN_NAMA AS APLIKASIKENDARAAN_NAMA, asal.KATEGORISPOT_ID as KATEGORI_SPOT_ASAL_ID,asal.SPOT_ID as SPOT_ASAL_ID, asal.SPOT_NAMA as SPOT_ASAL_NAMA, tujuan.KATEGORISPOT_ID as KATEGORI_SPOT_TUJUAN_ID,tujuan.SPOT_ID as SPOT_TUJUAN_ID, tujuan.SPOT_NAMA as SPOT_TUJUAN_NAMA,trayek.TRAYEK_KMREALISASI AS TRAYEK_KMREALISASI,trayek.TRAYEK_WAKTUREALISASI AS TRAYEK_WAKTUREALISASI ,trayek.TRAYEK_WAKTUENTRIREALISASI AS TRAYEK_WAKTUENTRIREALISASI,trayek.TRAYEK_BERATBERSIHSAMPAH AS TRAYEK_BERATBERSIHSAMPAH, trayek.TRAYEK_BERATKOSONGKENDARAAN AS TRAYEK_BERATKOSONGKENDARAAN, trayek.TRAYEK_BERATKOTORTIMBANGAN AS TRAYEK_BERATKOTORTIMBANGAN, trayek.TRAYEK_KETERANGAN AS TRAYEK_KETERANGAN
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
			".$clause."
			ORDER BY " . $jtSorting .
			" LIMIT " . $jtPageSize . "," . $jtStartIndex . ";
        ");
	}

	function get_all_paging_sorting_trayek_pembuangansampah_by_filterbulan($bulan,$tahun,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$tps,$statusTrayek,$jtStartIndex,$jtPageSize,$jtSorting){
		$clauseNumbering = " WHERE rute.KATEGORIRUTE_ID = 4 AND trayek.STATUSTRAYEK_ID='2'";
		if($tahun){
			$clauseNumbering.=" AND year(HARITRANSAKSI_TANGGAL)='".$tahun."'";
		}

		if($bulan){
			$clauseNumbering.=" AND month(HARITRANSAKSI_TANGGAL)='".$bulan."'";
		}

		$clause = " WHERE kategorirute.KATEGORIRUTE_ID = 4";
		if($tahun){
			$clause.=" AND year(HARITRANSAKSI_TANGGAL)='".$tahun."'";
		}

		if($bulan){
			$clause.=" AND month(HARITRANSAKSI_TANGGAL)='".$bulan."'";
		}

		if($nopolKendaraan){
			$clause.=" AND kendaraan.KENDARAAN_NOMORPOLISI LIKE '%".$nopolKendaraan."%'";
		}
		if($aplikasiKendaraan){
			$clause.=" AND aplikasikendaraan.APLIKASIKENDARAAN_ID='".$aplikasiKendaraan."'";
		}
		if($kategoriKendaraan){
			$clause.=" AND kategorikendaraan.KATEGORIKENDARAAN_ID='".$kategoriKendaraan."'";
		}
		if($tps){
			$clause.=" AND asal.SPOT_ID='".$tps."'";
		}
		if($statusTrayek){
			$clause.=" AND numberedPembuangan.STATUSTRAYEK_ID='".$statusTrayek."'";
		}
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
        ".$clauseNumbering."
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
			".$clause."
			ORDER BY " . $jtSorting .
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
        ");
	}
		
	function get_trayek_pengambilan($tanggalHariIni,$kendaraanID,$tpsID){
		return $this->db->query("
			select haritransaksi.HARITRANSAKSI_ID as hariTransaksiID,trayek.TRAYEK_ID as trayekID from haritransaksi
			join transaksiangkutsampah on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
			join detailtransaksiangkutsampah on transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
			join kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
			join trayek on detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID = trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID
			join rute on trayek.RUTE_ID = rute.RUTE_ID
			join spot on rute.SPOT_TUJUAN_ID = spot.SPOT_ID
			join kategorirute on rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
			where haritransaksi.HARITRANSAKSI_TANGGAL = '".$tanggalHariIni."' AND
			detailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID = 1 AND
			trayek.STATUSTRAYEK_ID = 1 AND
			kategorirute.KATEGORIRUTE_ID = 3 AND
			kendaraan.KENDARAAN_ID = ".$kendaraanID."
			AND spot.SPOT_ID = ".$tpsID."
			ORDER BY trayek.TRAYEK_WAKTUREALISASI ASC,trayek.TRAYEK_WAKTUTARGET ASC
		");
	}

	function get_scheduled_trayekBBM($tanggalHariIni,$kategoriRute){
		return $this->db->query("
			select haritransaksi.HARITRANSAKSI_ID as hariTransaksiID,trayek.TRAYEK_ID as trayekID, kendaraan.KENDARAAN_ID as kendaraanID, kendaraan.KENDARAAN_NOMORPOLISI as kendaraanNopol from haritransaksi
			join transaksiangkutsampah on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
			join detailtransaksiangkutsampah on transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
			join kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
			join trayek on detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID = trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID
			join rute on trayek.RUTE_ID = rute.RUTE_ID
			join spot on rute.SPOT_TUJUAN_ID = spot.SPOT_ID
			join kategorirute on rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
			where haritransaksi.HARITRANSAKSI_TANGGAL = '".$tanggalHariIni."' AND
			detailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID = 1 AND
			trayek.STATUSTRAYEK_ID = 1 AND
			kategorirute.KATEGORIRUTE_ID = ".$kategoriRute."
			order by kendaraan.KENDARAAN_NOMORPOLISI
		");
	}

	function get_scheduled_trayek($tanggalHariIni,$kategoriRute,$lokasiPool){
		return $this->db->query("
			select haritransaksi.HARITRANSAKSI_ID as hariTransaksiID,trayek.TRAYEK_ID as trayekID, kendaraan.KENDARAAN_ID as kendaraanID, kendaraan.KENDARAAN_NOMORPOLISI as kendaraanNopol from haritransaksi
			join transaksiangkutsampah on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
			join detailtransaksiangkutsampah on transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
			join kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
			join trayek on detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID = trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID
			join rute on trayek.RUTE_ID = rute.RUTE_ID
			join spot on rute.SPOT_TUJUAN_ID = spot.SPOT_ID
			join kategorirute on rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
			where haritransaksi.HARITRANSAKSI_TANGGAL = '".$tanggalHariIni."' AND
			detailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID = 1 AND
			trayek.STATUSTRAYEK_ID = 1 AND
			kategorirute.KATEGORIRUTE_ID = ".$kategoriRute." AND
			spot.SPOT_ID = ".$lokasiPool."
			order by kendaraan.KENDARAAN_NOMORPOLISI
		");
	}

	function get_trayek_aktivitaspool($tanggalHariIni,$kendaraanID,$kategoriRute,$lokasiPool){
		return $this->db->query("
			select haritransaksi.HARITRANSAKSI_ID as hariTransaksiID,trayek.TRAYEK_ID as trayekID from haritransaksi
			join transaksiangkutsampah on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
			join detailtransaksiangkutsampah on transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
			join kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
			join trayek on detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID = trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID
			join rute on trayek.RUTE_ID = rute.RUTE_ID
			join spot on rute.SPOT_TUJUAN_ID = spot.SPOT_ID
			join kategorirute on rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
			where haritransaksi.HARITRANSAKSI_TANGGAL = '".$tanggalHariIni."' AND
			detailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID = 1 AND
			trayek.STATUSTRAYEK_ID = 1 AND
			kategorirute.KATEGORIRUTE_ID = ".$kategoriRute." AND
			kendaraan.KENDARAAN_ID = ".$kendaraanID." AND
			spot.SPOT_ID = ".$lokasiPool."
			ORDER BY trayek.TRAYEK_WAKTUREALISASI ASC,trayek.TRAYEK_WAKTUTARGET ASC
		");
	}

	function get_trayek_by_id($trayek_id){
		$this->db->where('TRAYEK_ID',$trayek_id);
		return $this->db->get('trayek');
	}

	function get_last_inserted_trayek(){
		return $this->db->query("
			SELECT * FROM trayek
			WHERE trayek.TRAYEK_ID = LAST_INSERT_ID();
		");
	}
	//End of Get Data Trayek------------------------------------------------------------

	//Begin of Insert Data Trayek ------------------------------------------------------------
	function insert_trayek($new_trayek){
		$this->db->insert('trayek',$new_trayek);
	}
	//End of Insert Data Trayek  ------------------------------------------------------------

	//Begin of Update Data Trayek ------------------------------------------------------------
	function update_trayek_by_id($trayek_id,$updated_trayek){
		$this->db->where('TRAYEK_ID',$trayek_id);
		$this->db->update('trayek',$updated_trayek);
	}
	//End of Update Data Trayek ------------------------------------------------------------

	//Begin of Delete Data Trayek ------------------------------------------------------------
	function delete_trayek_by_id($trayek_id){
		$this->db->where('TRAYEK_ID',$trayek_id);
		$this->db->delete('trayek');
	}
	//End of Delete Data Trayek ------------------------------------------------------------

	function get_all_trayek_id_to_edit($tgltrayek) {
        $tgltrayek = explode("-", $tgltrayek);
        $tahun = $tgltrayek[2];
        $bulan = $tgltrayek[1];
        $tgl = $tgltrayek[0];
        $squery = "SELECT trayek.TRAYEK_ID FROM trayek WHERE YEAR(trayek.TRAYEK_WAKTUREALISASI) = " . $tahun . " AND MONTH(trayek.TRAYEK_WAKTUREALISASI) = " . $bulan . " AND DAY(trayek.TRAYEK_WAKTUREALISASI) = " . $tgl . " AND trayek.TRAYEK_BERATBERSIHSAMPAH >= 0 AND trayek.TRAYEK_BERATBERSIHSAMPAH IS NOT NULL ORDER BY trayek.TRAYEK_ID ASC;";
        return $this->db->query($squery);
        /*
        $this->db->from('trayek');
        $this->db->where('trayek.TRAYEK_WAKTUENTRIREALISASI is NOT NULL', NULL, FALSE);
        $this->db->where('trayek.TRAYEK_BERATBERSIHSAMPAH >', '0');
        $this->db->like('trayek.TRAYEK_WAKTUENTRIREALISASI',$tgltrayek);
        $this->db->order_by('trayek.TRAYEK_ID');
        return $this->db->get();
        */
    }
	
	function edit_trayek_from_imported_excel($trayek_id,$bkotor,$bkosong,$bbersih) {
        $value=array('TRAYEK_BERATBERSIHSAMPAH'=>$bbersih,'TRAYEK_BERATKOTORTIMBANGAN'=>$bkotor,'TRAYEK_BERATKOSONGKENDARAAN'=>$bkosong);
        $this->db->where('TRAYEK_ID',$trayek_id);
        $this->db->update('trayek',$value);
    }
	
	function delete_trayek_before_replace_si($tgltrayek) {
        $tgltrayek = explode("-", $tgltrayek);
        $tahun = $tgltrayek[2];
        $bulan = $tgltrayek[1];
        $tgl = $tgltrayek[0];
        //$squery = "delete from trayek WHERE YEAR(trayek.TRAYEK_WAKTUREALISASI) = " . $tahun . " AND MONTH(trayek.TRAYEK_WAKTUREALISASI) = " . $bulan . " AND DAY(trayek.TRAYEK_WAKTUREALISASI) = " . $tgl . ";";
        $squery = "UPDATE trayek SET trayek.TRAYEK_BERATBERSIHSAMPAH = 0, trayek.TRAYEK_BERATKOSONGKENDARAAN = 0, trayek.TRAYEK_BERATKOTORTIMBANGAN = 0 WHERE YEAR(trayek.TRAYEK_WAKTUREALISASI) = " . $tahun . " AND MONTH(trayek.TRAYEK_WAKTUREALISASI) = " . $bulan . " AND DAY(trayek.TRAYEK_WAKTUREALISASI) = " . $tgl . ";";

        //echo $squery . "<br>";
        $this->db->query($squery);
    }
}

?>
