<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_kendaraan extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Kendaraan ------------------------------------------------------------
	function get_all_kendaraan(){
		$this->db->from('kendaraan');
		$this->db->order_by('KENDARAAN_NOMORPOLISI');
		return $this->db->get();
	}
	
	function get_kendaraan_by_nomorkendaraan($nopolKendaraan){
		$this->db->from('kendaraan');
		$this->db->join('kategorisumbersampahkendaraan','kendaraan.KENDARAAN_ID = kategorisumbersampahkendaraan.KENDARAAN_ID');
		$this->db->like('kendaraan.KENDARAAN_NOMORPOLISI',$nopolKendaraan);
		$this->db->order_by('KENDARAAN_NOMORPOLISI');
		return $this->db->get();
	}
	
	function get_kendaraan_by_kategorisumbersampah_id_and_kendaraan_nomorpolisi($kategoriSumberSampahID,$nopolKendaraan){
		$this->db->from('kendaraan');
		$this->db->join('kategorisumbersampahkendaraan','kendaraan.KENDARAAN_ID = kategorisumbersampahkendaraan.KENDARAAN_ID');
		$this->db->where('kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID',$kategoriSumberSampahID);
		$this->db->like('kendaraan.KENDARAAN_NOMORPOLISI',$nopolKendaraan);
		$this->db->order_by('kendaraan.KENDARAAN_NOMORPOLISI');
		return $this->db->get();
	}
	
	function get_all_kendaraan_by_filter($nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$poolKendaraan,$kodeKendaraan,$statusKendaraan){
		$this->db->select('kendaraan.KENDARAAN_ID, KENDARAAN_NOMORPOLISI, APLIKASIKENDARAAN_NAMA,kategorikendaraan.APLIKASIKENDARAAN_ID,KATEGORIKENDARAAN_MERK,kendaraan.KATEGORIKENDARAAN_ID,SPOT_NAMA,SPOT_POOL_ID,KATEGORISUMBERSAMPAH_NAMA,KENDARAAN_NOMORRANGKA,KENDARAAN_NOMORMESIN,KENDARAAN_TAHUNPEMBUATAN,KENDARAAN_RASIOBAHANBAKARTERKINI,KENDARAAN_BERATKOSONGTERKINI,KENDARAAN_KMTERKINI,KENDARAAN_MASABERLAKUSTNK,KENDARAAN_MASABERLAKUPAJAKSTNK,STATUSKENDARAAN_NAMA,kendaraan.STATUSKENDARAAN_ID,KENDARAAN_KETERANGAN');
		$this->db->from('kendaraan');
		$this->db->join('kategorikendaraan','kategorikendaraan.KATEGORIKENDARAAN_ID = kendaraan.KATEGORIKENDARAAN_ID');
		$this->db->join('aplikasikendaraan','kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID');
		$this->db->join('statuskendaraan','statuskendaraan.STATUSKENDARAAN_ID = kendaraan.STATUSKENDARAAN_ID');
		$this->db->join('spot','spot.SPOT_ID = kendaraan.SPOT_POOL_ID');	
		$this->db->join('kategorisumbersampahkendaraan','kendaraan.KENDARAAN_ID = kategorisumbersampahkendaraan.KENDARAAN_ID', 'left');
		$this->db->join('kategorisumbersampah','kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID = kategorisumbersampah.KATEGORISUMBERSAMPAH_ID', 'left');	
		
		if($nopolKendaraan){
			$this->db->like('kendaraan.KENDARAAN_NOMORPOLISI',$nopolKendaraan);
		}
		if($aplikasiKendaraan){
			$this->db->where('aplikasikendaraan.APLIKASIKENDARAAN_ID',$aplikasiKendaraan);
		}
		if($kategoriKendaraan){
			$this->db->where('kategorikendaraan.KATEGORIKENDARAAN_ID',$kategoriKendaraan);
		}
		if($poolKendaraan){
			$this->db->where('kendaraan.SPOT_POOL_ID',$poolKendaraan);
		}
		if($kodeKendaraan){
			$this->db->where('kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID',$kodeKendaraan);
		}
		if($statusKendaraan){
			$this->db->where('kendaraan.STATUSKENDARAAN_ID',$statusKendaraan);
		}
		return $this->db->get();
	}
	
	function get_all_paging_sorting_kendaraan($jtStartIndex,$jtPageSize,$jtSorting){
		return $this->db->query("
			SELECT * FROM kendaraan 
			ORDER BY " . $jtSorting . 
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
		");
	}
	
	function get_all_paging_sorting_kendaraan_by_filter($nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$poolKendaraan,$kodeKendaraan,$statusKendaraan,$jtStartIndex,$jtPageSize,$jtSorting){
		$this->db->select('kendaraan.KENDARAAN_ID, KENDARAAN_NOMORPOLISI, APLIKASIKENDARAAN_NAMA,kategorikendaraan.APLIKASIKENDARAAN_ID,KATEGORIKENDARAAN_MERK,kendaraan.KATEGORIKENDARAAN_ID,SPOT_NAMA,SPOT_POOL_ID,KATEGORISUMBERSAMPAH_NAMA,KENDARAAN_NOMORRANGKA,KENDARAAN_NOMORMESIN,KENDARAAN_TAHUNPEMBUATAN,KENDARAAN_RASIOBAHANBAKARTERKINI,KENDARAAN_BERATKOSONGTERKINI,KENDARAAN_KMTERKINI,KENDARAAN_MASABERLAKUSTNK,KENDARAAN_MASABERLAKUPAJAKSTNK,STATUSKENDARAAN_NAMA,kendaraan.STATUSKENDARAAN_ID,KENDARAAN_KETERANGAN');
		$this->db->from('kendaraan');
		$this->db->join('kategorikendaraan','kategorikendaraan.KATEGORIKENDARAAN_ID = kendaraan.KATEGORIKENDARAAN_ID');
		$this->db->join('aplikasikendaraan','kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID');
		$this->db->join('statuskendaraan','statuskendaraan.STATUSKENDARAAN_ID = kendaraan.STATUSKENDARAAN_ID');
		$this->db->join('spot','spot.SPOT_ID = kendaraan.SPOT_POOL_ID');	
		$this->db->join('kategorisumbersampahkendaraan','kendaraan.KENDARAAN_ID = kategorisumbersampahkendaraan.KENDARAAN_ID', 'left');
		$this->db->join('kategorisumbersampah','kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID = kategorisumbersampah.KATEGORISUMBERSAMPAH_ID', 'left');	
		if($nopolKendaraan){
			$this->db->like('kendaraan.KENDARAAN_NOMORPOLISI',$nopolKendaraan);
		}
		if($aplikasiKendaraan){
			$this->db->where('aplikasikendaraan.APLIKASIKENDARAAN_ID',$aplikasiKendaraan);
		}
		if($kategoriKendaraan){
			$this->db->where('kategorikendaraan.KATEGORIKENDARAAN_ID',$kategoriKendaraan);
		}
		if($poolKendaraan){
			$this->db->where('kendaraan.SPOT_POOL_ID',$poolKendaraan);
		}
		if($kodeKendaraan){
			$this->db->where('kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID',$kodeKendaraan);
		}
		if($statusKendaraan){
			$this->db->where('kendaraan.STATUSKENDARAAN_ID',$statusKendaraan);
		}
		$this->db->limit($jtPageSize,$jtStartIndex);
		$this->db->order_by($jtSorting);
		return $this->db->get();
	}
	
	function get_last_inserted_kendaraan(){
		return $this->db->query("
			SELECT * FROM kendaraan 
			WHERE kendaraan.KENDARAAN_ID = LAST_INSERT_ID();
		");
	}
	
	function get_kendaraan_by_id($kendaraan_id){
		$this->db->where('KENDARAAN_ID',$kendaraan_id);
		return $this->db->get('kendaraan');
	}
	
	function get_scheduled_kendaraan_by_pool_id($poolID){
		
	}
	
	function get_kendaraan_by_pool_id($poolID){
		$this->db->from('kendaraan');
		$this->db->where('kendaraan.SPOT_POOL_ID',$poolID);
		$this->db->order_by('kendaraan.KENDARAAN_NOMORPOLISI');
		return $this->db->get();
		
	}
	
	function get_all_kendaraan_with_aplikasi_and_kategorikendaraan_and_statuskendaraan_and_spot_and_kategorisumbersampah(){		
		$this->db->from('kendaraan');
		$this->db->join('kategorikendaraan','kategorikendaraan.KATEGORIKENDARAAN_ID = kendaraan.KATEGORIKENDARAAN_ID');
		$this->db->join('aplikasikendaraan','kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID');
		$this->db->join('statuskendaraan','statuskendaraan.STATUSKENDARAAN_ID = kendaraan.STATUSKENDARAAN_ID');
		$this->db->join('kategorisumbersampahkendaraan','kendaraan.KENDARAAN_ID = kategorisumbersampahkendaraan.KENDARAAN_ID');
		$this->db->join('kategorisumbersampah','kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID = kategorisumbersampah.KATEGORISUMBERSAMPAH_ID');
		$this->db->join('spot','spot.SPOT_ID = kendaraan.SPOT_POOL_ID');
		$this->db->order_by('kategorikendaraan.KATEGORIKENDARAAN_ID');
		return $this->db->get();
	}
	
	function get_kendaraan_by_kendaraan_id_with_aplikasi_and_kategorikendaraan_and_statuskendaraan_and_spot_and_kategorisumbersampah($kendaraan_id){
		$this->db->where('kendaraan.KENDARAAN_ID',$kendaraan_id);		
		$this->db->from('kendaraan');
		$this->db->join('kategorikendaraan','kategorikendaraan.KATEGORIKENDARAAN_ID = kendaraan.KATEGORIKENDARAAN_ID');
		$this->db->join('aplikasikendaraan','kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID');
		$this->db->join('statuskendaraan','statuskendaraan.STATUSKENDARAAN_ID = kendaraan.STATUSKENDARAAN_ID');
		$this->db->join('kategorisumbersampah','kendaraan.KATEGORISUMBERSAMPAH_ID = kategorisumbersampah.KATEGORISUMBERSAMPAH_ID');
		$this->db->join('spot','spot.SPOT_ID = kendaraan.SPOT_POOL_ID');
		return $this->db->get();
	}
	//End of Get Data Kendaraan------------------------------------------------------------
	
	//Begin of Insert Data Kendaraan ------------------------------------------------------------
	function insert_kendaraan($new_kendaraan){
		$this->db->insert('kendaraan',$new_kendaraan);
	}
	//End of Insert Data Kendaraan  ------------------------------------------------------------
	
	//Begin of Update Data Kendaraan ------------------------------------------------------------
	function update_kendaraan_by_id($kendaraan_id,$updated_kendaraan){
		$this->db->where('KENDARAAN_ID',$kendaraan_id);
		$this->db->update('kendaraan',$updated_kendaraan);
	}
	//End of Update Data Kendaraan ------------------------------------------------------------
	
	//Begin of Delete Data Kendaraan ------------------------------------------------------------
	function delete_kendaraan_by_id($kendaraan_id){
		$this->db->where('KENDARAAN_ID',$kendaraan_id);
		$this->db->delete('kendaraan');
	}
	//End of Delete Data Kendaraan ------------------------------------------------------------
	
}

?>