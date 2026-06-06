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
function indonesian_date ($timestamp = '', $date_format = 'l, j F Y | H:i', $suffix = 'WIB') {
    if (trim ($timestamp) == '')
    {
            $timestamp = time ();
    }
    elseif (!ctype_digit ($timestamp))
    {
        $timestamp = strtotime ($timestamp);
    }
    # remove S (st,nd,rd,th) there are no such things in indonesia :p
    $date_format = preg_replace ("/S/", "", $date_format);
    $pattern = array (
        '/Mon[^day]/','/Tue[^sday]/','/Wed[^nesday]/','/Thu[^rsday]/',
        '/Fri[^day]/','/Sat[^urday]/','/Sun[^day]/','/Monday/','/Tuesday/',
        '/Wednesday/','/Thursday/','/Friday/','/Saturday/','/Sunday/',
        '/Jan[^uary]/','/Feb[^ruary]/','/Mar[^ch]/','/Apr[^il]/','/May/',
        '/Jun[^e]/','/Jul[^y]/','/Aug[^ust]/','/Sep[^tember]/','/Oct[^ober]/',
        '/Nov[^ember]/','/Dec[^ember]/','/January/','/February/','/March/',
        '/April/','/June/','/July/','/August/','/September/','/October/',
        '/November/','/December/',
    );
    $replace = array ( 'Sen','Sel','Rab','Kam','Jum','Sab','Min',
        'Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu',
        'Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des',
        'Januari','Februari','Maret','April','Juni','Juli','Agustus','Sepember',
        'Oktober','November','Desember',
    );
    $date = date ($date_format, $timestamp);
    $date = preg_replace ($pattern, $replace, $date);
    $date = ($suffix)?"{$date} {$suffix}":"{$date}";
    return $date;
} 
?>