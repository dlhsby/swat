<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_transaksiangkutsampah extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	function get_imported_excel_range_date(){
	    $q="SELECT * FROM (SELECT tgltitle FROM sampahmasuktpa ORDER BY id ASC LIMIT 1) AS a UNION ALL SELECT * FROM (SELECT tgltitle FROM sampahmasuktpa ORDER BY id DESC LIMIT 1) AS b;";
        return $this->db->query($q);
    }
    
	function get_all_imported_excel($daritanggalTransaksi){
    //function get_all_imported_excel($daritanggalTransaksi, $sampaitanggalTransaksi){
        /*
		$this->db->from('sampahmasuktpa');
        $this->db->where('sampahmasuktpa.tgl >=', $daritanggalTransaksi);
        $this->db->where('sampahmasuktpa.tgl <=', $sampaitanggalTransaksi);
        $this->db->order_by('id');
        return $this->db->get();
		*/
		
		$this->db->from('sampahmasuktpa');
        $this->db->where('sampahmasuktpa.tgltitle =', $daritanggalTransaksi);
        $this->db->order_by('id');
        return $this->db->get();
		
    }

    //function get_all_paging_sorting_all_imported_excel($jtStartIndex, $jtPageSize, $jtSorting, $daritanggalTransaksi, $sampaitanggalTransaksi){
    function get_all_paging_sorting_all_imported_excel($jtStartIndex, $jtPageSize, $jtSorting, $daritanggalTransaksi){    
		/*
		$this->db->from('sampahmasuktpa');
        $this->db->where('sampahmasuktpa.tgl >=', $daritanggalTransaksi);
        $this->db->where('sampahmasuktpa.tgl <=', $sampaitanggalTransaksi);
        $this->db->order_by('id');
        return $this->db->get();
		*/
		$this->db->from('sampahmasuktpa');
        $this->db->where('sampahmasuktpa.tgltitle =', $daritanggalTransaksi);
        $this->db->order_by('id');
        return $this->db->get();
    }
	
	//Begin of Get Data Transaksi Angkut Sampah ------------------------------------------------------------
	function get_all_transaksiangkutsampah(){
		$this->db->from('transaksiangkutsampah');
		return $this->db->get();
	}
	
	function get_all_transaksiangkutsampah_by_filter($tanggalHariTransaksi,$nomorPolisiKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$poolKendaraan,$kodeKendaraan,$statusTransaksi){
		$this->db->from('transaksiangkutsampah');
		$this->db->join('haritransaksi','transaksiangkutsampah.HARITRANSAKSI_ID= haritransaksi.HARITRANSAKSI_ID');
		$this->db->join('kendaraan','transaksiangkutsampah.KENDARAAN_ID= kendaraan.KENDARAAN_ID');
		$this->db->join('statustransaksiangkutsampah','transaksiangkutsampah.STATUSTRANSAKSIANGKUTSAMPAH_ID= statustransaksiangkutsampah.STATUSTRANSAKSIANGKUTSAMPAH_ID');
		$this->db->join('kategorikendaraan','kategorikendaraan.KATEGORIKENDARAAN_ID = kendaraan.KATEGORIKENDARAAN_ID');
		$this->db->join('aplikasikendaraan','kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID');
		$this->db->join('statuskendaraan','statuskendaraan.STATUSKENDARAAN_ID = kendaraan.STATUSKENDARAAN_ID');
		$this->db->join('kategorisumbersampahkendaraan','kendaraan.KENDARAAN_ID = kategorisumbersampahkendaraan.KENDARAAN_ID');
		$this->db->join('kategorisumbersampah','kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID = kategorisumbersampah.KATEGORISUMBERSAMPAH_ID');
		$this->db->join('spot','spot.SPOT_ID = kendaraan.SPOT_POOL_ID');
		if($tanggalHariTransaksi){
			$this->db->like('haritransaksi.HARITRANSAKSI_TANGGAL',$tanggalHariTransaksi);
		}
		if($nomorPolisiKendaraan){
			$this->db->like('kendaraan.KENDARAAN_NOMORPOLISI',$nomorPolisiKendaraan);
		}
		if($aplikasiKendaraan){
			$this->db->like('aplikasikendaraan.APLIKASIKENDARAAN_NAMA',$aplikasiKendaraan);
		}
		if($kategoriKendaraan){
			$this->db->like('kategorikendaraan.KATEGORIKENDARAAN_MERK',$kategoriKendaraan);
		}
		if($poolKendaraan){
			$this->db->where('kendaraan.SPOT_POOL_ID',$poolKendaraan);
		}
		if($kodeKendaraan){
			$this->db->where('kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID',$kodeKendaraan);
		}
		if($statusTransaksi){
			$this->db->where('transaksiangkutsampah.STATUSTRANSAKSIANGKUTSAMPAH_ID',$statusTransaksi);
		}
		return $this->db->get();
	}
	
	function get_all_paging_sorting_transaksiangkutsampah($jtStartIndex,$jtPageSize,$jtSorting){
		$this->db->from('transaksiangkutsampah');
		$this->db->join('kendaraan','transaksiangkutsampah.KENDARAAN_ID= kendaraan.KENDARAAN_ID');
		$this->db->order_by($jtSorting);	
		$this->db->limit($jtPageSize,$jtStartIndex) ;
		return $this->db->get();
	}
	
	function get_all_paging_sorting_transaksiangkutsampah_by_filter($tanggalHariTransaksi,$nomorPolisiKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$poolKendaraan,$kodeKendaraan,$statusTransaksi,$jtStartIndex,$jtPageSize,$jtSorting){
		$this->db->from('transaksiangkutsampah');
		$this->db->join('haritransaksi','transaksiangkutsampah.HARITRANSAKSI_ID= haritransaksi.HARITRANSAKSI_ID');
		$this->db->join('kendaraan','transaksiangkutsampah.KENDARAAN_ID= kendaraan.KENDARAAN_ID');
		$this->db->join('statustransaksiangkutsampah','transaksiangkutsampah.STATUSTRANSAKSIANGKUTSAMPAH_ID= statustransaksiangkutsampah.STATUSTRANSAKSIANGKUTSAMPAH_ID');
		$this->db->join('kategorikendaraan','kategorikendaraan.KATEGORIKENDARAAN_ID = kendaraan.KATEGORIKENDARAAN_ID');
		$this->db->join('aplikasikendaraan','kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID');
		$this->db->join('statuskendaraan','statuskendaraan.STATUSKENDARAAN_ID = kendaraan.STATUSKENDARAAN_ID');
		$this->db->join('kategorisumbersampahkendaraan','kendaraan.KENDARAAN_ID = kategorisumbersampahkendaraan.KENDARAAN_ID');
		$this->db->join('kategorisumbersampah','kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID = kategorisumbersampah.KATEGORISUMBERSAMPAH_ID');
		$this->db->join('spot','spot.SPOT_ID = kendaraan.SPOT_POOL_ID');
		if($tanggalHariTransaksi){
			$this->db->like('haritransaksi.HARITRANSAKSI_TANGGAL',$tanggalHariTransaksi);
		}
		if($nomorPolisiKendaraan){
			$this->db->like('kendaraan.KENDARAAN_NOMORPOLISI',$nomorPolisiKendaraan);
		}
		if($aplikasiKendaraan){
			$this->db->like('aplikasikendaraan.APLIKASIKENDARAAN_NAMA',$aplikasiKendaraan);
		}
		if($kategoriKendaraan){
			$this->db->like('kategorikendaraan.KATEGORIKENDARAAN_MERK',$kategoriKendaraan);
		}
		if($poolKendaraan){
			$this->db->where('kendaraan.SPOT_POOL_ID',$poolKendaraan);
		}
		if($kodeKendaraan){
			$this->db->where('kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID',$kodeKendaraan);
		}
		if($statusTransaksi){
			$this->db->where('transaksiangkutsampah.STATUSTRANSAKSIANGKUTSAMPAH_ID',$statusTransaksi);
		}
		$this->db->order_by($jtSorting);	
		$this->db->limit($jtPageSize,$jtStartIndex) ;
		return $this->db->get();
	}
	
	function get_all_transaksiangkutsampah_with_haritransaksi_and_status_and_kendaraan(){
		$this->db->from('transaksiangkutsampah');
		$this->db->join('haritransaksi','transaksiangkutsampah.HARITRANSAKSI_ID = haritransaksi.HARITRANSAKSI_ID');
		$this->db->join('statustransaksiangkutsampah','transaksiangkutsampah.STATUSTRANSAKSIANGKUTSAMPAH_ID = statustransaksiangkutsampah.STATUSTRANSAKSIANGKUTSAMPAH_ID');
		$this->db->join('kendaraan','transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID');
		$this->db->join('kategorikendaraan','kategorikendaraan.KATEGORIKENDARAAN_ID = kendaraan.KATEGORIKENDARAAN_ID');
		$this->db->join('aplikasikendaraan','kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID');
		$this->db->join('statuskendaraan','statuskendaraan.STATUSKENDARAAN_ID = kendaraan.STATUSKENDARAAN_ID');
		$this->db->join('kategorisumbersampahkendaraan','kendaraan.KENDARAAN_ID = kategorisumbersampahkendaraan.KENDARAAN_ID');
		$this->db->join('kategorisumbersampah','kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID = kategorisumbersampah.KATEGORISUMBERSAMPAH_ID');
		$this->db->join('spot','spot.SPOT_ID = kendaraan.SPOT_POOL_ID');
		$this->db->order_by('haritransaksi.HARITRANSAKSI_TANGGAL');
		return $this->db->get();
	}
	
	function get_transaksiangkutsampah_by_id($transaksiangkutsampah_id){
		$this->db->where('TRANSAKSIANGKUTSAMPAH_ID',$transaksiangkutsampah_id);
		return $this->db->get('transaksiangkutsampah');
	}	
	
	function get_transaksiangkutsampah_by_haritransaksi_id($haritransaksi_id){
		$this->db->where('HARITRANSAKSI_ID',$haritransaksi_id);
		return $this->db->get('transaksiangkutsampah');
	}
	
	function get_transaksiangkutsampah_by_transaksi_id_with_haritransaksi_and_status_and_kendaraan($transaksiangkutsampah_id){
		$this->db->where('transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID',$transaksiangkutsampah_id);
		$this->db->from('transaksiangkutsampah');
		$this->db->join('haritransaksi','transaksiangkutsampah.HARITRANSAKSI_ID = haritransaksi.HARITRANSAKSI_ID');
		$this->db->join('statustransaksiangkutsampah','transaksiangkutsampah.STATUSTRANSAKSIANGKUTSAMPAH_ID = statustransaksiangkutsampah.STATUSTRANSAKSIANGKUTSAMPAH_ID');
		$this->db->join('kendaraan','transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID');
		return $this->db->get();
	}
	
	function get_transaksiangkutsampah_by_haritransaksi_id_and_kendaraan_id($haritransaksi_id,$kendaraanID){
		$this->db->where('HARITRANSAKSI_ID',$haritransaksi_id);
		$this->db->where('KENDARAAN_ID',$kendaraanID);
		return $this->db->get('transaksiangkutsampah');
	}	
	
	function get_transaksiangkutsampah_by_transaksi_id_with_haritransaksi_kendaraan_statustransaksi($transaksiangkutsampah_id){
		$this->db->where('transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID',$transaksiangkutsampah_id);
		$this->db->join('haritransaksi','transaksiangkutsampah.HARITRANSAKSI_ID= haritransaksi.HARITRANSAKSI_ID');
		$this->db->join('kendaraan','transaksiangkutsampah.KENDARAAN_ID= kendaraan.KENDARAAN_ID');
		$this->db->join('statustransaksiangkutsampah','transaksiangkutsampah.STATUSTRANSAKSIANGKUTSAMPAH_ID= statustransaksiangkutsampah.STATUSTRANSAKSIANGKUTSAMPAH_ID');
		$this->db->join('kategorikendaraan','kategorikendaraan.KATEGORIKENDARAAN_ID = kendaraan.KATEGORIKENDARAAN_ID');
		$this->db->join('aplikasikendaraan','kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID');
		$this->db->join('statuskendaraan','statuskendaraan.STATUSKENDARAAN_ID = kendaraan.STATUSKENDARAAN_ID');
		$this->db->join('kategorisumbersampahkendaraan','kendaraan.KENDARAAN_ID = kategorisumbersampahkendaraan.KENDARAAN_ID');
		$this->db->join('kategorisumbersampah','kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID = kategorisumbersampah.KATEGORISUMBERSAMPAH_ID');
		$this->db->join('spot','spot.SPOT_ID = kendaraan.SPOT_POOL_ID');
		$this->db->order_by('kendaraan.KENDARAAN_NOMORPOLISI');
		return $this->db->get('transaksiangkutsampah');
	}
	
	function get_transaksiangkutsampah_by_haritransaksi_id_with_haritransaksi_kendaraan_statustransaksi($haritransaksi_id){
		$this->db->where('haritransaksi.HARITRANSAKSI_ID',$haritransaksi_id);
		$this->db->join('haritransaksi','transaksiangkutsampah.HARITRANSAKSI_ID= haritransaksi.HARITRANSAKSI_ID');
		$this->db->join('kendaraan','transaksiangkutsampah.KENDARAAN_ID= kendaraan.KENDARAAN_ID');
		$this->db->join('statustransaksiangkutsampah','transaksiangkutsampah.STATUSTRANSAKSIANGKUTSAMPAH_ID= statustransaksiangkutsampah.STATUSTRANSAKSIANGKUTSAMPAH_ID');
		$this->db->join('kategorikendaraan','kategorikendaraan.KATEGORIKENDARAAN_ID = kendaraan.KATEGORIKENDARAAN_ID');
		$this->db->join('aplikasikendaraan','kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID');
		$this->db->join('statuskendaraan','statuskendaraan.STATUSKENDARAAN_ID = kendaraan.STATUSKENDARAAN_ID');
		$this->db->join('kategorisumbersampahkendaraan','kendaraan.KENDARAAN_ID = kategorisumbersampahkendaraan.KENDARAAN_ID');
		$this->db->join('kategorisumbersampah','kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID = kategorisumbersampah.KATEGORISUMBERSAMPAH_ID');
		$this->db->join('spot','spot.SPOT_ID = kendaraan.SPOT_POOL_ID');
		$this->db->order_by('kendaraan.KENDARAAN_NOMORPOLISI');
		return $this->db->get('transaksiangkutsampah');
	}
	
	function get_transaksiangkutsampah_by_haritransaksi_tanggal_with_haritransaksi_kendaraan_statustransaksi($haritransaksi_tanggal){
		$this->db->where('haritransaksi.HARITRANSAKSI_TANGGAL',$haritransaksi_tanggal);
		$this->db->join('haritransaksi','transaksiangkutsampah.HARITRANSAKSI_ID= haritransaksi.HARITRANSAKSI_ID');
		$this->db->join('kendaraan','transaksiangkutsampah.KENDARAAN_ID= kendaraan.KENDARAAN_ID');
		$this->db->join('statustransaksiangkutsampah','transaksiangkutsampah.STATUSTRANSAKSIANGKUTSAMPAH_ID= statustransaksiangkutsampah.STATUSTRANSAKSIANGKUTSAMPAH_ID');
				$this->db->join('kategorikendaraan','kategorikendaraan.KATEGORIKENDARAAN_ID = kendaraan.KATEGORIKENDARAAN_ID');
		$this->db->join('aplikasikendaraan','kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID');
		$this->db->join('statuskendaraan','statuskendaraan.STATUSKENDARAAN_ID = kendaraan.STATUSKENDARAAN_ID');
		$this->db->join('kategorisumbersampahkendaraan','kendaraan.KENDARAAN_ID = kategorisumbersampahkendaraan.KENDARAAN_ID');
		$this->db->join('kategorisumbersampah','kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID = kategorisumbersampah.KATEGORISUMBERSAMPAH_ID');
		$this->db->join('spot','spot.SPOT_ID = kendaraan.SPOT_POOL_ID');
		$this->db->order_by('haritransaksi.HARITRANSAKSI_TANGGAL');
		return $this->db->get('transaksiangkutsampah');
	}
	
	function get_last_inserted_transaksiangkutsampah(){
		return $this->db->query("
			SELECT * FROM transaksiangkutsampah 
			WHERE transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = LAST_INSERT_ID();
		");
	}
	//End of Get Data Transaksi Angkut Sampah------------------------------------------------------------
	
	//Begin of Insert Data Transaksi Angkut Sampah ------------------------------------------------------------
	function insert_transaksiangkutsampah($new_transaksiangkutsampah){
		$this->db->insert('transaksiangkutsampah',$new_transaksiangkutsampah);
	}

	//End of Insert Data Transaksi Angkut Sampah  ------------------------------------------------------------
	
	//Begin of Update Data Transaksi Angkut Sampah ------------------------------------------------------------
	function update_transaksiangkutsampah_by_id($transaksiangkutsampah_id,$updated_transaksiangkutsampah){
		$this->db->where('TRANSAKSIANGKUTSAMPAH_ID',$transaksiangkutsampah_id);
		$this->db->update('transaksiangkutsampah',$updated_transaksiangkutsampah);
	}
	//End of Update Data Transaksi Angkut Sampah ------------------------------------------------------------
	
	//Begin of Delete Data Transaksi Angkut Sampah ------------------------------------------------------------
	function delete_transaksiangkutsampah_by_id($transaksiangkutsampah_id){
		$this->db->where('TRANSAKSIANGKUTSAMPAH_ID',$transaksiangkutsampah_id);
		$this->db->delete('transaksiangkutsampah');
	}
	//End of Delete Data Transaksi Angkut Sampah ------------------------------------------------------------
	
}

?>