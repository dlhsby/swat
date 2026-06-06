<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_pengemudi extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Pengemudi ------------------------------------------------------------
	function get_all_pengemudi(){
		$this->db->from('pengemudi');
		return $this->db->get();
	}
	
	function get_all_pengemudi_by_filter($nikPengemudi,$namaPengemudi,$poolPengemudi,$statusKepegawaian){
		$this->db->from('pengemudi');
		if($nikPengemudi){
			$this->db->like('PENGEMUDI_NOMORKTP',$nikPengemudi);
		}
		if($namaPengemudi){
			$this->db->like('PENGEMUDI_NAMA',$namaPengemudi);
		}
		if($poolPengemudi){
			$this->db->where('SPOT_POOL_ID',$poolPengemudi);
		}
		if($statusKepegawaian){
			$this->db->where('STATUSKEPEGAWAIAN_ID',$statusKepegawaian);
		}
		return $this->db->get();
	}
	
	function get_all_paging_sorting_pengemudi($jtStartIndex,$jtPageSize,$jtSorting){
		return $this->db->query("
			SELECT * FROM pengemudi 
			ORDER BY " . $jtSorting . 
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
		");
	}
	
	function get_all_paging_sorting_pengemudi_by_filter($nikPengemudi,$namaPengemudi,$poolPengemudi,$statusKepegawaian,$jtStartIndex,$jtPageSize,$jtSorting){
		$this->db->from('pengemudi');
		if($nikPengemudi){
			$this->db->like('PENGEMUDI_NOMORKTP',$nikPengemudi);
		}
		if($namaPengemudi){
			$this->db->like('PENGEMUDI_NAMA',$namaPengemudi);
		}
		if($poolPengemudi){
			$this->db->where('SPOT_POOL_ID',$poolPengemudi);
		}
		if($statusKepegawaian){
			$this->db->where('STATUSKEPEGAWAIAN_ID',$statusKepegawaian);
		}
		$this->db->limit($jtPageSize,$jtStartIndex);
		$this->db->order_by($jtSorting);
		return $this->db->get();
	}
	
	function get_last_inserted_pengemudi(){
		return $this->db->query("
			SELECT * FROM pengemudi 
			WHERE pengemudi.PENGEMUDI_ID = LAST_INSERT_ID();
		");
	}
	
	function get_pengemudi_by_id($pengemudi_id){
		$this->db->where('PENGEMUDI_ID',$pengemudi_id);
		return $this->db->get('pengemudi');
	}
	
	function get_pengemudi_by_pool($poolID){
		$this->db->where('SPOT_POOL_ID',$poolID);
		$this->db->order_by('PENGEMUDI_NAMA');
		return $this->db->get('pengemudi');
	}
	
	function get_all_pengemudi_with_kepemilikansim_and_sim_and_statuskepegawaian_and_spot(){		
		$this->db->from('pengemudi');
		//$this->db->join('kepemilikansim','pengemudi.PENGEMUDI_ID= kepemilikansim.PENGEMUDI_ID');
		//$this->db->join('sim','kepemilikansim.SIM_ID= sim.SIM_ID');
		$this->db->join('statuskepegawaian','statuskepegawaian.STATUSKEPEGAWAIAN_ID = pengemudi.STATUSKEPEGAWAIAN_ID');
		$this->db->join('spot','spot.SPOT_ID = pengemudi.SPOT_POOL_ID');
		return $this->db->get();
	}
	
	function get_pengemudi_by_id_with_kemilikansim_and_sim_and_statuskepegawaian_and_spot($pengemudi_id){	
		$this->db->where('pengemudi.PENGEMUDI_ID',$pengemudi_id);	
		$this->db->from('pengemudi');
		$this->db->join('kepemilikansim','pengemudi.PENGEMUDI_ID= kepemilikansim.PENGEMUDI_ID');
		$this->db->join('sim','kepemilikansim.SIM_ID= sim.SIM_ID');
		$this->db->join('statuskepegawaian','statuskepegawaian.STATUSKEPEGAWAIAN_ID = pengemudi.STATUSKEPEGAWAIAN_ID');
		$this->db->join('spot','spot.SPOT_ID = pengemudi.SPOT_POOL_ID');
		return $this->db->get();
	}
	//End of Get Data Pengemudi------------------------------------------------------------
	
	//Begin of Insert Data Pengemudi ------------------------------------------------------------
	function insert_pengemudi($new_pengemudi){
		$this->db->insert('pengemudi',$new_pengemudi);
	}
	//End of Insert Data Pengemudi  ------------------------------------------------------------
	
	//Begin of Update Data Pengemudi ------------------------------------------------------------
	function update_pengemudi_by_id($pengemudi_id,$updated_pengemudi){
		$this->db->where('PENGEMUDI_ID',$pengemudi_id);
		$this->db->update('pengemudi',$updated_pengemudi);
	}
	//End of Update Data Pengemudi ------------------------------------------------------------
	
	//Begin of Delete Data Pengemudi ------------------------------------------------------------
	function delete_pengemudi_by_id($pengemudi_id){
		$this->db->where('PENGEMUDI_ID',$pengemudi_id);
		$this->db->delete('pengemudi');
	}
	//End of Delete Data Pengemudi ------------------------------------------------------------
	
}

?>