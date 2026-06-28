<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_menu extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Menu ------------------------------------------------------------
	function get_all_menu(){
		$this->db->from('menu');
		$this->db->order_by('MENU_ID');	 
		return $this->db->get();
		
	}
	
	function get_all_menu_by_filter($namaMenu,$parentMenu){
		$this->db->from('menu');
		if($parentMenu){
			$this->db->where('MENU_PARENT_ID ',$parentMenu);
		}
		if($namaMenu){
			$this->db->like('MENU_NAMA',$namaMenu);
		}
		$this->db->order_by('MENU_ID');	 
		return $this->db->get();
		
	}
	
	function get_all_parent_menu(){
		return $this->db->query("
			SELECT menu_child.* 
			FROM 
			(SELECT MENU_PARENT_ID FROM menu GROUP BY MENU_PARENT_ID) menu_parent
			INNER JOIN menu menu_child on (menu_child.MENU_ID = menu_parent.MENU_PARENT_ID)
			ORDER BY menu_child.MENU_NAMA
		");
		
	}
	
	function get_all_menu_with_status(){
		return $this->db->query("
			SELECT * FROM menu 
			JOIN statusmenu ON menu.STATUSMENU_ID = statusmenu.STATUSMENU_ID
			ORDER BY menu.MENU_NAMA;
		");
	}
	
	function get_all_paging_sorting_menu($jtStartIndex,$jtPageSize,$jtSorting){
		$this->db->from('menu');
		$this->db->order_by($jtSorting);	
		$this->db->limit($jtPageSize,$jtStartIndex) ;
		return $this->db->get();
		/*return $this->db->query("
			SELECT * FROM menu 
			ORDER BY " . $jtSorting . 
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
		");*/
	}
	
	function get_all_paging_sorting_menu_by_filter($namaMenu,$parentMenu,$jtStartIndex,$jtPageSize,$jtSorting){
		$this->db->from('menu');
		if($parentMenu){
			$this->db->where('MENU_PARENT_ID ',$parentMenu);
		}
		if($namaMenu){
			$this->db->like('MENU_NAMA',$namaMenu);
		}
		$this->db->order_by($jtSorting);	
		$this->db->limit($jtPageSize,$jtStartIndex) ;
		return $this->db->get();
	}
	
	function get_menu_by_id($menu_id){
		$this->db->where('MENU_ID',$menu_id);
		return $this->db->get('menu');
	}
	
	function get_last_inserted_menu(){
		return $this->db->query("
			SELECT * FROM menu 
			JOIN statusmenu ON menu.STATUSMENU_ID = statusmenu.STATUSMENU_ID
			WHERE menu.MENU_ID = LAST_INSERT_ID();
		");
	}
	
	function get_multilevel_menu_data($parent,$hakakses_id){
	   	$data = array();
	   	$this->db->from('hakaksesmenu');
		$this->db->where('hakaksesmenu.HAKAKSES_ID',$hakakses_id);
		$this->db->join('menu','menu.MENU_ID = hakaksesmenu.MENU_ID');
		$this->db->where('menu.MENU_PARENT_ID',$parent);
	   	$this->db->where('menu.STATUSMENU_ID',1);
		$this->db->order_by('menu.MENU_NAMA');	   		   	
	   	$result = $this->db->get();
	 
	   	foreach($result->result() as $row)
	   	{
	      	$data[] = array(
				'id'  => $row->MENU_ID,
	            'nama'   =>$row->MENU_NAMA,
	            'uri' => $row->MENU_URI,
	            // recursive
	            'child'  =>$this->get_multilevel_menu_data($row->MENU_ID,$hakakses_id)
	         );
	   	}
	   	return $data;
	}
	//End of Get Data Menu------------------------------------------------------------
	
	//Begin of Insert Data Menu ------------------------------------------------------------
	function insert_menu($new_menu){
		$this->db->insert('menu',$new_menu);
	}
	//End of Insert Data Menu  ------------------------------------------------------------
	
	//Begin of Update Data Menu ------------------------------------------------------------
	function update_menu_by_id($menu_id,$updated_menu){
		$this->db->where('MENU_ID',$menu_id);
		$this->db->update('menu',$updated_menu);
	}
	//End of Update Data Menu ------------------------------------------------------------
	
	//Begin of Delete Data Menu ------------------------------------------------------------
	function delete_menu_by_id($menu_id){
		$this->db->where('MENU_ID',$menu_id);
		$this->db->delete('menu');
	}
	//End of Delete Data Menu ------------------------------------------------------------
	
}

?>