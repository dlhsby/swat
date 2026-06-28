<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_tonase extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data TONASE ------------------------------------------------------------
	function get_all_tonase(){
		$this->db->from('tonase');
		$this->db->order_by('TONASE_NAMA');
		return $this->db->get();
	}
	
	function get_tonase_by_id($tonase_id){
		$this->db->where('TONASE_ID',$tonase_id);
		return $this->db->get('tonase');
	}
	
	function get_tonase_by_tahun($tahun){
		return $this->db->query("
			SELECT SUM(TONASE_NOMINAL) AS TOTALTONASE FROM `tonase` WHERE YEAR(TONASE_TANGGAL) = '".$tahun."';
		");
		return $this->db->get();
	}
	
	function get_tonase_by_tahun_and_bulan($tahun,$bulan){
		return $this->db->query("
			SELECT tonase.*,DAYOFMONTH(TONASE_TANGGAL) AS TANGGAL, DATE_FORMAT(TONASE_TANGGAL,'%d %M %Y') AS TANGGAL_TONASE
			FROM tonase 
			WHERE YEAR(TONASE_TANGGAL) = '".$tahun."' AND MONTH(TONASE_TANGGAL) = '".$bulan."'
			ORDER BY DAYOFMONTH(TONASE_TANGGAL);
		");
		return $this->db->get();
	}
	
	function get_rekaptonase_by_tahun_and_tanggal($tahun,$tanggal){
		return $this->db->query("
			SELECT tonase.*,DAYOFMONTH(TONASE_TANGGAL) AS TANGGAL,MONTH(TONASE_TANGGAL) AS BULAN,YEAR(TONASE_TANGGAL) AS TAHUN FROM tonase
				WHERE YEAR(TONASE_TANGGAL) = '".$tahun."' AND DAYOFMONTH(TONASE_TANGGAL) =  '".$tanggal."'
				ORDER BY MONTH(TONASE_TANGGAL) ASC
		");
		return $this->db->get();
	}
	
	function get_totaltonaseperbulan_by_tahun($tahun){
		return $this->db->query("
			SELECT TONASE_TANGGAL,MONTHNAME(TONASE_TANGGAL) AS BULAN,SUM(TONASE_NOMINAL) AS TONASEBULANAN
			FROM tonase
			WHERE YEAR(TONASE_TANGGAL) = '".$tahun."' AND MONTH(TONASE_TANGGAL) != '12' AND MONTH(TONASE_TANGGAL) != '11' AND MONTH(TONASE_TANGGAL) != '10'
			GROUP BY MONTH(TONASE_TANGGAL)
			ORDER BY TONASE_TANGGAL ASC;
		");
		return $this->db->get();
	}
	
	function get_last_inserted_tonase(){
		return $this->db->query("
			SELECT * FROM tonase 
			WHERE tonase.TONASE_ID = LAST_INSERT_ID();
		");
	}
	//End of Get Data TONASE------------------------------------------------------------
	
	//Begin of Insert Data TONASE ------------------------------------------------------------
	function insert_tonase($new_tonase){
		$this->db->insert('tonase',$new_tonase);
	}
	//End of Insert Data TONASE  ------------------------------------------------------------
	
	//Begin of Update Data TONASE ------------------------------------------------------------
	function update_tonase_by_id($tonase_id,$updated_tonase){
		$this->db->where('TONASE_ID',$tonase_id);
		$this->db->update('tonase',$updated_tonase);
	}
	//End of Update Data TONASE ------------------------------------------------------------
	
	//Begin of Delete Data TONASE ------------------------------------------------------------
	function delete_tonase_by_id($tonase_id){
		$this->db->where('TONASE_ID',$tonase_id);
		$this->db->delete('tonase');
	}
	//End of Delete Data TONASE ------------------------------------------------------------
	
}

?>