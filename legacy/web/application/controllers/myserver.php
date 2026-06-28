<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');
class Myserver extends CI_Controller  {

    public function __construct() {
        parent::__construct(); 
        $ns = 'http://'.$_SERVER['HTTP_HOST'].'/swat1.3.3/index.php/myserver/?wsdl';
        $this->load->library("Nusoap_lib"); // load nusoap toolkit library in controller
       
        $this->nusoap_server = new soap_server(); // create soap server object
        $this->nusoap_server->configureWSDL("Service SWAT", $ns); // wsdl cinfiguration
        $this->nusoap_server->wsdl->schemaTargetNamespace = $ns; // server namespace
        
        
        $input_array = array ('a' => "xsd:string"); // "addnumbers" method parameters
		$return_array = array ("return" => "xsd:string");
		/*$this->nusoap_server->wsdl->addComplexType("ArrayOfString",                      
                 "complexType",
                 "array",
                 "",
                 "SOAP-ENC:Array",
                 array(),
                 array(array("ref"=>"SOAP-ENC:arrayType","wsdl:arrayType"=>"xsd:string[]")),
                 "xsd:string");*/
        $this->nusoap_server->wsdl->addComplexType('pembuanganData','complexType','struct','all','',
		        array(
		                'TRAYEK_ID' => array('name'=>'TRAYEK_ID','type'=>'xsd:string'),
		                'KENDARAAN_NOMORPOLISI' => array('name'=>'KENDARAAN_NOMORPOLISI','type'=>'xsd:string')
		        )
		);
		$this->nusoap_server->wsdl->addComplexType('pembuanganArray','complexType','array','','SOAP-ENC:Array',
		        array(),
		        array(
		            array(
		                'ref' => 'SOAP-ENC:arrayType',
		                'wsdl:arrayType' => 'tns:pembuanganData[]'
		            )
		        )
		);
		/*$this->nusoap_server->wsdl->addComplexType(
			"ArrayOfString",                      
			"complexType",
			"array",
			"all",
			"",
			array(
				'TRAYEK_ID'=>array('name'=>'TRAYEK_ID','type'=>'xsd:string'),
				'KENDARAAN_NOMORPOLISI'=>array('name'=>'KENDARAAN_NOMORPOLISI','type'=>'xsd:string')
			)
		);*/
		$input_vp_array = array('tanggal' => 'xsd:string'); // "addnumbers" method parameters
		$return_vp_array = array('result' => 'xsd:bool', 'pembuanganterverifikasi' => 'tns:pembuanganArray', 'error' => 'xsd:string');
		
		$input_vpn_array = array('tanggal' => 'xsd:string', 'nopol' => 'xsd:string'); // "addnumbers" method parameters
		$return_vpn_array = $return_array;

		$this->nusoap_server->register('addnumbers', $input_array, $return_array, "urn:SOAPServerWSDL", "urn:".$ns."/addnumbers", "rpc", "encoded", "Addition Of Two Numbers");

		$this->nusoap_server->register('getpembuanganterverifikasi', $input_vp_array, $return_array, "urn:SOAPServerWSDL", "urn:".$ns."/getpembuanganterverifikasi", "rpc", "encoded", "Get Pembuangan Terverifikasi");

		$this->nusoap_server->register('getpembuanganterverifikasiwithnopol', $input_vpn_array, $return_vpn_array, "urn:SOAPServerWSDL", "urn:".$ns."/getpembuanganterverifikasiwithnopol", "rpc", "encoded", "Get Pembuangan Terverifikasi With Nopol");
    }
    
   	public function index()
	{
	    function addnumbers($a)
	    {
	        return $a;
	    }
	    
	    function getpembuanganterverifikasi($tanggal) {
	    	$CI =& get_instance();
	    	$CI->load->model('model_trayek');
	        $query = $CI->model_trayek->get_trayek_pembuangan_terverifikasi($tanggal);
	        $num = $query->num_rows();
	        $res = "aa";
	        $index = 0;
	        $hasil = array();
	        if($num > 0){
				foreach($query->result() as $row){
					$trayekID = $row->TRAYEK_ID;
					$nomorPolisi = $row->KENDARAAN_NOMORPOLISI;
					$res = $nomorPolisi;
					array_push($hasil, array('TRAYEK_ID' => $trayekID, 'KENDARAAN_NOMORPOLISI' => $nomorPolisi));
					$index++;
				}
			}
	        //return array("result" => true, "pembuanganterverifikasi" => $x, "error" => "");
	        //return count($hasil);
	        //return $index;
	        return $res;
		}
	    
	    function getpembuanganterverifikasiwithnopol($tanggal,$nopol) {
	    	$CI =& get_instance();
	    	$CI->load->model('model_trayek');
	        $query = $CI->model_trayek->get_trayek_pembuangan_terverifikasi_with_nopol($tanggal, $nopol);
	        $num = $query->num_rows();
	        $res = "failed";
	        $index = 0;
	        $hasil = array();
	        if($num > 0){
				$pembuanganTerverifikasi = $query->row();
				$res = $pembuanganTerverifikasi->TRAYEK_ID;
			}
	        //return array("result" => true, "pembuanganterverifikasi" => $x, "error" => "");
	        //return count($hasil);
	        //return $index;
	        return $res;
		}

	    $this->nusoap_server->service(file_get_contents("php://input")); // read raw data from request body
	}
	
}
?>