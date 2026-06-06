<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');
function print_recursive_list($data)
{
    $str = "";
    foreach($data as $list)
    {
    	   	
        $subchild = print_recursive_list($list['child']);
        if($subchild != '')
        {		
        	$str .= '<li><a href="'.base_url().'index.php/'.$list['uri'].'" class="dropdown-toggle">'.$list['nama'].'</a>'; 	
            $str .= '<ul class="dropdown-menu" data-role="dropdown">'.$subchild.'</ul>';
		}
		else{
			$str .= '<li><a href="'.base_url().'index.php/'.$list['uri'].'">'.$list['nama'].'</a>';   
		}  
		      	       
        $str .= "</li>";
    }
    return $str;
}
?>