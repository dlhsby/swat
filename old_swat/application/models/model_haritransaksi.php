<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_haritransaksi extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Hari Transaksi ------------------------------------------------------------
	function get_all_haritransaksi(){
		$this->db->from('haritransaksi');
		return $this->db->get();
	}
	
	function get_all_haritransaksi_by_filter($tanggalHariTransaksi,$statusHariTransaksi){
		$this->db->from('haritransaksi');
		if($tanggalHariTransaksi){
			$this->db->like('HARITRANSAKSI_TANGGAL ',$tanggalHariTransaksi);
		}
		if($statusHariTransaksi){
			$this->db->where('STATUSHARITRANSAKSI_ID',$statusHariTransaksi);
		}
		$this->db->join('statusharitransaksi','haritransaksi.STATUSHARITRANSAKSI_ID = statusharitransaksi.STATUSHARITRANSAKSI_ID');
		return $this->db->get();
	}
	
	function get_all_paging_sorting_haritransaksi($jtStartIndex,$jtPageSize,$jtSorting){
		$this->db->from('haritransaksi');
		$this->db->order_by($jtSorting);	
		$this->db->limit($jtPageSize,$jtStartIndex) ;
		return $this->db->get();
	}
	
	function get_all_paging_sorting_haritransaksi_by_filter($tanggalHariTransaksi,$statusHariTransaksi,$jtStartIndex,$jtPageSize,$jtSorting){
		$this->db->from('haritransaksi');
		if($tanggalHariTransaksi){
			$this->db->like('HARITRANSAKSI_TANGGAL ',$tanggalHariTransaksi);
		}
		if($statusHariTransaksi){
			$this->db->where('STATUSHARITRANSAKSI_ID',$statusHariTransaksi);
		}
		$this->db->join('statusharitransaksi','haritransaksi.STATUSHARITRANSAKSI_ID = statusharitransaksi.STATUSHARITRANSAKSI_ID');
		$this->db->order_by($jtSorting);	
		$this->db->limit($jtPageSize,$jtStartIndex) ;
		return $this->db->get();
	}
	
	function get_last_inserted_haritransaksi(){
		return $this->db->query("
			SELECT * FROM haritransaksi 
			WHERE haritransaksi.HARITRANSAKSI_ID = LAST_INSERT_ID();
		");
	}
	
	function get_all_haritransaksi_with_statusharitransaksi(){
		$this->db->from('haritransaksi');
		$this->db->join('statusharitransaksi','haritransaksi.STATUSHARITRANSAKSI_ID = statusharitransaksi.STATUSHARITRANSAKSI_ID');
		return $this->db->get();
	}
	
	function get_haritransaksi_by_id($haritransaksi_id){
		$this->db->where('HARITRANSAKSI_ID',$haritransaksi_id);
		return $this->db->get('haritransaksi');
	}
	
	function get_haritransaksi_by_tanggal($haritransaksi_tanggal){
		$this->db->where('HARITRANSAKSI_TANGGAL',$haritransaksi_tanggal);
		return $this->db->get('haritransaksi');
	}
	
	function get_haritransaksi_by_tanggal_with_statusharitransaksi($haritransaksi_tanggal){
		$this->db->where('HARITRANSAKSI_TANGGAL',$haritransaksi_tanggal);
		$this->db->from('haritransaksi');
		$this->db->join('statusharitransaksi','haritransaksi.STATUSHARITRANSAKSI_ID = statusharitransaksi.STATUSHARITRANSAKSI_ID');
		return $this->db->get();
	}
	//End of Get Data Hari Transaksi------------------------------------------------------------
	
	//Begin of Insert Data Hari Transaksi ------------------------------------------------------------
	function insert_haritransaksi($new_haritransaksi){
		$this->db->insert('haritransaksi',$new_haritransaksi);
	}
	//End of Insert Data Hari Transaksi  ------------------------------------------------------------
	
	//Begin of Update Data Hari Transaksi ------------------------------------------------------------
	function update_haritransaksi_by_id($haritransaksi_id,$updated_haritransaksi){
		$this->db->where('HARITRANSAKSI_ID',$haritransaksi_id);
		$this->db->update('haritransaksi',$updated_haritransaksi);
	}
	//End of Update Data Hari Transaksi ------------------------------------------------------------
	
	//Begin of Delete Data Hari Transaksi ------------------------------------------------------------
	function delete_haritransaksi_by_id($haritransaksi_id){
		$this->db->where('HARITRANSAKSI_ID',$haritransaksi_id);
		$this->db->delete('haritransaksi');
	}
	//End of Delete Data Hari Transaksi ------------------------------------------------------------
	
}

?>