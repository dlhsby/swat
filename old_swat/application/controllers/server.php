<?php
 
require_once "nusoap.php";
 
 
$server = new soap_server();
  
//Define our namespace
$namespace = "http://localhost/swat1.3.3/webservice/server.php";
  
//Configure our WSDL
$server->configureWSDL("DKP_SWAT");
  
 
  
function getKitir($id) {
     
        $host="localhost";
        $user="AdminDKP";
        $pass="Dkpmenur31";
        $database="dkp_swat";
 
        $koneksi=mysqli_connect($host,$user,$pass,$database);
        $str="SELECT kendaraan.kendaraan_id,kendaraan_nomorpolisi,spot.spot_id,spot_nama,jatahkitir_masaberlakuawal,jatahkitir_masaberlakuakhir,statusjatahkitir_id,kendaraan.KENDARAAN_BERATKOSONGTERKINI FROM jatahkitir join kendaraan on kendaraan.kendaraan_id=jatahkitir.kendaraan_id join spot on spot.spot_id=jatahkitir.spot_id where jatahkitir.jatahkitir_id='".$id."'";
         
        $query=mysqli_query($koneksi,$str);
        $hasil="";
        while ($row = mysqli_fetch_array($query))
        {
            $hasil = $hasil.$row[0].',';
            $hasil = $hasil.$row[1].',';
            $hasil = $hasil.$row[2].',';
            $hasil = $hasil.$row[3].',';
            $hasil = $hasil.$row[4].',';
            $hasil = $hasil.$row[5].',';
            $hasil = $hasil.$row[6].',';
            $hasil = $hasil.$row[7];
        }
        return $hasil;
     
}
 
function getNomorPolisiKendaraan() {
     
        $host="localhost";
        $user="AdminDKP";
        $pass="Dkpmenur31";
        $database="dkp_swat";
 
        $koneksi=mysqli_connect($host,$user,$pass,$database);
        $str="SELECT kendaraan.KENDARAAN_NOMORPOLISI FROM kendaraan WHERE kendaraan.STATUSKENDARAAN_ID = 1 ORDER BY kendaraan.KENDARAAN_NOMORPOLISI";
         
        $query=mysqli_query($koneksi,$str);
        $hasil="";
        while ($row = mysqli_fetch_assoc($query))
        {
            $hasil = $hasil.$row["KENDARAAN_NOMORPOLISI"].',';
        }
        return $hasil;
     
}
 
function getSumberSampahKendaraan($nomorPolisi) {    
        $host="localhost";
        $user="AdminDKP";
        $pass="Dkpmenur31";
        $database="dkp_swat";
         
        $koneksi=mysqli_connect($host,$user,$pass,$database);
        $str="SELECT kendaraan.KENDARAAN_NOMORPOLISI, kategorisumbersampah.KATEGORISUMBERSAMPAH_KODE,kategorisumbersampah.KATEGORISUMBERSAMPAH_NAMA FROM kendaraan JOIN kategorisumbersampahkendaraan ON kendaraan.KENDARAAN_ID = kategorisumbersampahkendaraan.KENDARAAN_ID JOIN kategorisumbersampah ON kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID = kategorisumbersampah.KATEGORISUMBERSAMPAH_ID WHERE kendaraan.KENDARAAN_NOMORPOLISI = '".$nomorPolisi."' GROUP BY kendaraan.KENDARAAN_NOMORPOLISI ORDER BY kendaraan.KENDARAAN_NOMORPOLISI
        ";
        $query=mysqli_query($koneksi,$str);
        while ($row = mysqli_fetch_array($query))
        {
            return $row["KATEGORISUMBERSAMPAH_KODE"];
        }           
}
 
function getPersilSampah() {
     
        $host="localhost";
        $user="AdminDKP";
        $pass="Dkpmenur31";
        $database="dkp_swat";
 
        $koneksi=mysqli_connect($host,$user,$pass,$database);
        $str="SELECT spot.SPOT_NAMA FROM spot WHERE spot.KATEGORISPOT_ID = 3 ORDER BY spot.SPOT_NAMA";
         
        $query=mysqli_query($koneksi,$str);
        $hasil="";
        while ($row = mysqli_fetch_assoc($query))
        {
            $hasil = $hasil.$row["SPOT_NAMA"].',';
        }
        return $hasil;
     
}
 
function login($username,$password) {    
        $host="localhost";
        $user="AdminDKP";
        $pass="Dkpmenur31";
        $database="dkp_swat";
         
        $koneksi=mysqli_connect($host,$user,$pass,$database);
        $str="select * from pengguna 
        join hakakses on pengguna.hakakses_id = hakakses.hakakses_id
        where pengguna_username='".$username."' and pengguna_password=md5('".$password."')
        ";
        $query=mysqli_query($koneksi,$str);
        while ($row = mysqli_fetch_array($query))
        {
            return $row["HAKAKSES_ID"].','.$row["PENGGUNA_ID"];
        }
        return $str;
     
}

function getBkosong($nomorPolisi) {           
        $host="localhost";
        $user="AdminDKP";
        $pass="Dkpmenur31";
        $database="dkp_swat";
         
        $koneksi=mysqli_connect($host,$user,$pass,$database);
        $str="SELECT kendaraan.kendaraan_beratkosongterkini from kendaraan where kendaraan.kendaraan_nomorpolisi='".$nomorPolisi."'";
        $query=mysqli_query($koneksi,$str);
        while ($row = mysqli_fetch_array($query))
        {
            return $row[0];
        }
        
}


 
// Register our method
$server->register('getKitir',
                array('id'=>'xsd:string'), 
                array('return'=>'xsd:string'),
                $namespace,
                false,
                'rpc',
                false); 
 
$server->register('getNomorPolisiKendaraan',
                array(), 
                array('return'=>'xsd:string'),
                $namespace,
                false,
                'rpc',
                false);
				
$server->register('getBkosong',
                array('nomorPolisi'=>'xsd:string'),  
                array('return'=>'xsd:string'),
                $namespace,
                false,
                'rpc',
                false);
 
$server->register('getSumberSampahKendaraan',
                array('nomorPolisi'=>'xsd:string'), 
                array('return'=>'xsd:string'),
                $namespace,
                false,
                'rpc',
                false); 
 
$server->register('getPersilSampah',
                array(), 
                array('return'=>'xsd:string'),
                $namespace,
                false,
                'rpc',
                false);
                 
$server->register('login',
                array('username'=>'xsd:string','password'=>'xsd:string'), 
                array('return'=>'xsd:string'),
                $namespace,
                false,
                'rpc',
                false); 
                 
// Get our posted data if the service is being consumed
// otherwise leave this data blank.
$POST_DATA = isset($GLOBALS['HTTP_RAW_POST_DATA']) ? $GLOBALS['HTTP_RAW_POST_DATA'] : '';
  
// pass our posted data (or nothing) to the soap service
$server->service($POST_DATA);
exit(); 
 
?>