<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Tonase extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}

	public function index(){
		$this->auth->restrict();
        $this->auth->cek_menu(78);

        $this->load->model('model_tonase');
        $data = "";
        $tahun = '2014';
        $bulan = '1';
        $tonaseTahun = $this->model_tonase->get_tonase_by_tahun($tahun);
        $totalTonaseTahun = 0;
        if ($tonaseTahun->num_rows() > 0){
			$rowTonaseTahun = $tonaseTahun->row();
			$totalTonaseTahun = $rowTonaseTahun->TOTALTONASE;
		}

		$data['tonase2014'] = $totalTonaseTahun;


        $rekapTonase = [];
        for($i=1;$i<=28;$i++){
        	$tonase = $this->model_tonase->get_rekaptonase_by_tahun_and_tanggal($tahun,$i);
			$rekapTonase[] = $tonase->result_array();
		}

    	$tonaseBulanan = $this->model_tonase->get_tonase_by_tahun_and_bulan($tahun,$bulan);
        $data['rekapTonase'] = $rekapTonase;
        $data['tonaseBulanan'] = $tonaseBulanan->result();
		//var_dump($data['rekapTonase']);
		//var_dump($rekapTonase->result_array());
		$this->template->set('title','Laporan Tonase | SWAT DKP Surabaya');
        $this->template->load('template','laporan/index',$data);
	}

	public function gettahun(){
		$keyword = $this->input->get('query');

		$arr['query'] = $keyword;
		$arr['suggestions'][] = array(
			'value'  =>'2014',
			'data'   =>'2014'
		);
		echo json_encode($arr);
	}

	public function getbulan(){
		$keyword = $this->input->get('query');

		$arr['query'] = $keyword;
		$arr['suggestions'][] = array(
			'value'  =>'Januari',
			'data'   =>'1'
		);
		$arr['suggestions'][] = array(
			'value'  =>'Februari',
			'data'   =>'2'
		);
		$arr['suggestions'][] = array(
			'value'  =>'Maret',
			'data'   =>'3'
		);
		$arr['suggestions'][] = array(
			'value'  =>'April',
			'data'   =>'4'
		);
		$arr['suggestions'][] = array(
			'value'  =>'Mei',
			'data'   =>'5'
		);
		$arr['suggestions'][] = array(
			'value'  =>'Juni',
			'data'   =>'6'
		);
		$arr['suggestions'][] = array(
			'value'  =>'Juli',
			'data'   =>'7'
		);
		$arr['suggestions'][] = array(
			'value'  =>'Agustus',
			'data'   =>'8'
		);
		$arr['suggestions'][] = array(
			'value'  =>'September',
			'data'   =>'9'
		);
		$arr['suggestions'][] = array(
			'value'  =>'Oktober',
			'data'   =>'10'
		);
		$arr['suggestions'][] = array(
			'value'  =>'Nopember',
			'data'   =>'11'
		);$arr['suggestions'][] = array(
			'value'  =>'Desember',
			'data'   =>'12'
		);
		echo json_encode($arr);
	}

	public function gettabeltonaseperhari(){
		$tahun = $this->input->post('tahun');
		$bulan = $this->input->post('bulan');

		$data = "";
		$this->load->model('model_tonase');

		$tonase = $this->model_tonase->get_tonase_by_tahun_and_bulan($tahun,$bulan);
		if($tonase->num_rows>0){
			$dataTonase = "";
			foreach($tonase->result() as $tonasePerHari){
				$dataTonase .= "
					<tr>
						<td align='left'>".$tonasePerHari->TANGGAL_TONASE."</td>
						<td align='right'>".number_format($tonasePerHari->TONASE_NOMINAL,3,',','.')."</td>
					</tr>
				";
			}
			$data .= '
				<table width="100%" border="1" style="border-color: #CCCCCC" align="center">
					<thead class="bg-cyan fg-white" align="center">
						<tr>
							<th>Tanggal</th>
							<th>Tonase (Ton)</th>
						</tr>
					</thead>
					<tbody>
						'.$dataTonase.'
					</tbody>
				</table>
			';
		}

		echo $data;
	}

	public function gettrentonaseperbulan(){
		$this->load->model('model_tonase');
		$tahun = $this->input->get('tahun');

		$array['cols'][] = 	array(
									'id' => '',
									'label' => 'Bulan',
									'pattern' => '',
									'type' => 'string'
								);
		    $array['cols'][] = 	array(
									'id' => '',
									'label' => 'Tonase',
									'pattern' => '',
									'type' => 'number',
									'role' => ''
								);
			$array['cols'][] = 	array(
									'id' => '',
									'label' => 'Tren Tonase',
									'pattern' => '',
									'type' => 'number',
									'role' => ''
								);

			$tonase = $this->model_tonase->get_totaltonaseperbulan_by_tahun($tahun);
			if($tonase->num_rows()>0){
				foreach($tonase->result() as $result){
					 $array['rows'][] = array(
						'c' => 	array(
									array('v'=>$result->BULAN,'f'=>null),
									array('v'=>$result->TONASEBULANAN,'f'=>null),
									array('v'=>$result->TONASEBULANAN,'f'=>null)
								)
					);
				}
			}
		echo json_encode($array);
	}

	public function gettrentonaseperhari(){
		$this->load->model('model_tonase');
		$tahun = $this->input->get('tahun');
		$bulan = $this->input->get('bulan');

		$array['cols'][] = 	array(
									'id' => '',
									'label' => 'Tanggal',
									'pattern' => '',
									'type' => 'number'
								);
		    $array['cols'][] = 	array(
									'id' => '',
									'label' => 'Tonase',
									'pattern' => '',
									'type' => 'number',
									'role' => ''
								);
			$array['cols'][] = 	array(
									'id' => '',
									'label' => 'Tren Tonase',
									'pattern' => '',
									'type' => 'number',
									'role' => ''
								);

			$tonase = $this->model_tonase->get_tonase_by_tahun_and_bulan($tahun,$bulan);
			if($tonase->num_rows()>0){
				foreach($tonase->result() as $result){
					 $array['rows'][] = array(
						'c' => 	array(
									array('v'=>$result->TANGGAL,'f'=>null),
									array('v'=>$result->TONASE_NOMINAL,'f'=>null),
									array('v'=>$result->TONASE_NOMINAL,'f'=>null)
								)
					);
				}
			}
		echo json_encode($array);
	}

	public function cetaklaporantonase_sehari(){
	$tanggal = $this->input->get('tanggal');

			$this->load->model('model_laporantonasesampah');
					$this->load->library('excel');

			$result = $this->model_laporantonasesampah->get_laporan_tonase_by_hari($tanggal);
			$this->excel->createSheet(0);
			$this->excel->setActiveSheetIndex(0);
			//name the worksheet
			$this->excel->getActiveSheet()->setTitle($tanggal);
			//set cell A1 content with some text
			$this->excel->getActiveSheet()->setCellValue('A1', 'LAPORAN HASIL ENTRI TONASE');
			//change the font size
			$this->excel->getActiveSheet()->getStyle('A1')->getFont()->setSize(16);
			//make the font become bold
			//$this->excel->getActiveSheet()->getStyle('A1')->getFont()->setBold(true);
			//merge cell A1 until D1
			$this->excel->getActiveSheet()->mergeCells('A1:I1');
			//set aligment to center for that merged cell (A1 to D1)
			$this->excel->getActiveSheet()->getStyle('A1')->getAlignment()->setHorizontal(PHPExcel_Style_Alignment::HORIZONTAL_CENTER);
			$this->excel->getActiveSheet()->setCellValue('A3', 'Tanggal'.$tanggal);
			$header = 5; //set baris header
			$this->excel->getActiveSheet()->setCellValue('A'.$header,'NOMOR');
			$this->excel->getActiveSheet()->setCellValue('B'.$header,'NOMOR POLISI KENDARAAN');
			$this->excel->getActiveSheet()->setCellValue('C'.$header,'MERK KENDARAAN');
			$this->excel->getActiveSheet()->setCellValue('D'.$header,'APLIKASI KENDARAAN');
			$this->excel->getActiveSheet()->setCellValue('E'.$header,'ASAL TPS');
			$this->excel->getActiveSheet()->setCellValue('F'.$header,'KM REALISASI');
			$this->excel->getActiveSheet()->setCellValue('G'.$header,'WAKTU REALISASI');
			$this->excel->getActiveSheet()->setCellValue('H'.$header,'WAKTU ENTRI');
			$this->excel->getActiveSheet()->setCellValue('I'.$header,'BERAT BERSIH SAMPAH');
			$awal = 6; $i = $awal; $nomor = 1;
			if($result->num_rows()>0){
				foreach($result->result() as $data){
					$this->excel->getActiveSheet()->setCellValue('A'.$i,$nomor);
					$this->excel->getActiveSheet()->setCellValue('B'.$i,$data->KENDARAAN_NOMORPOLISI);
					$this->excel->getActiveSheet()->setCellValue('C'.$i,$data->KATEGORIKENDARAAN_MERK);
					$this->excel->getActiveSheet()->setCellValue('D'.$i,$data->APLIKASIKENDARAAN_NAMA);
					$this->excel->getActiveSheet()->setCellValue('E'.$i,$data->SPOT_ASAL_NAMA);
					$this->excel->getActiveSheet()->setCellValue('F'.$i,$data->TRAYEK_KMREALISASI);
					$this->excel->getActiveSheet()->setCellValue('G'.$i,$data->TRAYEK_WAKTUREALISASI);
					$this->excel->getActiveSheet()->setCellValue('H'.$i,$data->TRAYEK_WAKTUENTRIREALISASI);
					$this->excel->getActiveSheet()->setCellValue('I'.$i,$data->TRAYEK_BERATBERSIHSAMPAH);
					$i++;
					$nomor++;
				}
				$this->excel->getActiveSheet()->setCellValue('H'.($i),'TOTAL');
				$this->excel->getActiveSheet()->setCellValue('I'.($i),'=SUM(I'.$awal.':I'.($i-1).')');
			}
			$this->excel->getActiveSheet()->setCellValue('A'.($i+3),'SURABAYA, '.$tanggal);
			$this->excel->getActiveSheet()->setCellValue('A'.($i+6),'PARAF PETUGAS');

			foreach(range('B','J') as $columnID) {
				$this->excel->getActiveSheet()->getColumnDimension($columnID)->setAutoSize(true);
			}


		$filename='laporan_tonase_tanggal_'.$tanggal.'.xls'; //save our workbook as this file name
		header('Content-Type: application/vnd.ms-excel'); //mime type
		header('Content-Disposition: attachment;filename="'.$filename.'"'); //tell browser what's the file name
		header('Cache-Control: max-age=0'); //no cache

		//save it to Excel5 format (excel 2003 .XLS file), change this to 'Excel2007' (and adjust the filename extension, also the header mime type)
		//if you want to save it as .XLSX Excel 2007 format
		$objWriter = PHPExcel_IOFactory::createWriter($this->excel, 'Excel5');
		//force user to download the Excel file without writing it to server's HD
		$objWriter->save('php://output');
	}

	public function cetaklaporantonasetanggal(){
	/*$tanggal = $this->input->get('tanggal');*/
			$bulan = $this->input->get('bulan');
			$tahun = $this->input->get('tahun');
			$tanggal = $bulan .'-'.$tahun;

			$this->load->model('model_laporantonasesampah');
					$this->load->library('excel');

			$result = $this->model_laporantonasesampah->get_laporan_tonase_by_tanggal($tanggal,$bulan,$tahun);
			$this->excel->createSheet(0);
			$this->excel->setActiveSheetIndex(0);
			//name the worksheet
			$this->excel->getActiveSheet()->setTitle($tanggal);
			//set cell A1 content with some text
			$this->excel->getActiveSheet()->setCellValue('A1', 'LAPORAN HASIL ENTRI TONASE');
			//change the font size
			$this->excel->getActiveSheet()->getStyle('A1')->getFont()->setSize(16);
			//make the font become bold
			//$this->excel->getActiveSheet()->getStyle('A1')->getFont()->setBold(true);
			//merge cell A1 until D1
			$this->excel->getActiveSheet()->mergeCells('A1:I1');
			//set aligment to center for that merged cell (A1 to D1)
			$this->excel->getActiveSheet()->getStyle('A1')->getAlignment()->setHorizontal(PHPExcel_Style_Alignment::HORIZONTAL_CENTER);
			$this->excel->getActiveSheet()->setCellValue('A3', 'Bulan '.$bulan.' Tahun '.$tahun);
			$header = 5; //set baris header
			$this->excel->getActiveSheet()->setCellValue('A'.$header,'NOMOR');
			$this->excel->getActiveSheet()->setCellValue('B'.$header,'NOMOR POLISI KENDARAAN');
			$this->excel->getActiveSheet()->setCellValue('C'.$header,'MERK KENDARAAN');
			$this->excel->getActiveSheet()->setCellValue('D'.$header,'APLIKASI KENDARAAN');
			$this->excel->getActiveSheet()->setCellValue('E'.$header,'ASAL TPS');
			$this->excel->getActiveSheet()->setCellValue('F'.$header,'KM REALISASI');
			$this->excel->getActiveSheet()->setCellValue('G'.$header,'WAKTU REALISASI');
			$this->excel->getActiveSheet()->setCellValue('H'.$header,'WAKTU ENTRI');
			$this->excel->getActiveSheet()->setCellValue('I'.$header,'BERAT BERSIH SAMPAH');
			$awal = 6; $i = $awal; $nomor = 1;
			if($result->num_rows()>0){
				foreach($result->result() as $data){
					$this->excel->getActiveSheet()->setCellValue('A'.$i,$nomor);
					$this->excel->getActiveSheet()->setCellValue('B'.$i,$data->KENDARAAN_NOMORPOLISI);
					$this->excel->getActiveSheet()->setCellValue('C'.$i,$data->KATEGORIKENDARAAN_MERK);
					$this->excel->getActiveSheet()->setCellValue('D'.$i,$data->APLIKASIKENDARAAN_NAMA);
					$this->excel->getActiveSheet()->setCellValue('E'.$i,$data->SPOT_ASAL_NAMA);
					$this->excel->getActiveSheet()->setCellValue('F'.$i,$data->TRAYEK_KMREALISASI);
					$this->excel->getActiveSheet()->setCellValue('G'.$i,$data->TRAYEK_WAKTUREALISASI);
					$this->excel->getActiveSheet()->setCellValue('H'.$i,$data->TRAYEK_WAKTUENTRIREALISASI);
					$this->excel->getActiveSheet()->setCellValue('I'.$i,$data->TRAYEK_BERATBERSIHSAMPAH);
					$i++;
					$nomor++;
				}
				$this->excel->getActiveSheet()->setCellValue('H'.($i),'TOTAL');
				$this->excel->getActiveSheet()->setCellValue('I'.($i),'=SUM(I'.$awal.':I'.($i-1).')');
			}
			$this->excel->getActiveSheet()->setCellValue('A'.($i+3),'SURABAYA, ... '.$bulan.'-'.$tahun);
			$this->excel->getActiveSheet()->setCellValue('A'.($i+6),'PARAF PETUGAS');

			foreach(range('B','J') as $columnID) {
				$this->excel->getActiveSheet()->getColumnDimension($columnID)->setAutoSize(true);
			}


		$filename='laporan_tonase_bulan_'.$bulan .' tahun '.$tahun.'.xls'; //save our workbook as this file name
		header('Content-Type: application/vnd.ms-excel'); //mime type
		header('Content-Disposition: attachment;filename="'.$filename.'"'); //tell browser what's the file name
		header('Cache-Control: max-age=0'); //no cache

		//save it to Excel5 format (excel 2003 .XLS file), change this to 'Excel2007' (and adjust the filename extension, also the header mime type)
		//if you want to save it as .XLSX Excel 2007 format
		$objWriter = PHPExcel_IOFactory::createWriter($this->excel, 'Excel5');
		//force user to download the Excel file without writing it to server's HD
		$objWriter->save('php://output');
	}

	public function cetaklaporantonasepdf(){
		$this->load->library('fpdf_wrap');
		define('FPDF_FONTPATH','system/fonts/');

		$this->load->model('model_laporantonasesampah');

		$todayDate = $this->input->get('tanggal');

		$tanggalHariIni = indonesian_date($todayDate, 'j F Y',"");
		$recentPageNumber = 0;

		$data = array();

		$options = array(
			'filename' => 'laporan_tonase_'.$todayDate.'.pdf', //nama file penyimpanan, kosongkan jika output ke browser
			'destinationfile' => 'I', //I=inline browser (default), F=local file, D=download
			'paper_size'=>'A4',	//paper size: F4, A3, A4, A5, Letter, Legal
			'orientation'=>'L' //orientation: P=portrait, L=landscape
		);

		$result = $this->model_laporantonasesampah->get_laporan_tonase_by_tanggal_pdf($todayDate);

		foreach($result->result() as $row){
			array_push($data, $row);
		}

		$fpdf = new fpdf_wrap($data, $options);
		$fpdf->setTodayDate($todayDate);
		$fpdf->printPDF();
	}


	public function cetaklaporantonasepdfbulan(){
		$this->load->library('fpdf_wrap_bulan');
		define('FPDF_FONTPATH','system/fonts/');

		$this->load->model('model_laporantonasesampah');

		$bulan = $this->input->get('bulan');
		$tahun = $this->input->get('tahun');

		/*$tanggalHariIni = indonesian_date($todayDate, 'j F Y',"");*/
		$todaydate= $bulan .'-'.$tahun;
		$recentPageNumber = 0;

		$data = array();

		$options = array(
			'filename' => 'laporan_tonase_'.$todaydate.'.pdf', //nama file penyimpanan, kosongkan jika output ke browser
			'destinationfile' => 'I', //I=inline browser (default), F=local file, D=download
			'paper_size'=>'A4',	//paper size: F4, A3, A4, A5, Letter, Legal
			'orientation'=>'L' //orientation: P=portrait, L=landscape
		);

		$result = $this->model_laporantonasesampah->get_laporan_tonase_by_tanggal_bulan_pdf($bulan,$tahun);

		foreach($result->result() as $row){
			array_push($data, $row);
		}

		$fpdf = new fpdf_wrap_bulan($data, $options);
		$fpdf->setTodayDate($todaydate);
		$fpdf->setMonth($bulan);
		$fpdf->setYear($tahun);
		$fpdf->printPDF();
	}


	public function cetaklaporantonasepdf2(){
		// Load view “pdf_report” untuk menampilkan hasilnya
		$this->load->library('pdf');
		define('FPDF_FONTPATH','system/fonts/');

		$this->load->model('model_laporantonasesampah');

		$todayDate = $this->input->get('tanggal');
		$tanggalHariIni = indonesian_date($todayDate, 'j F Y',"");
		$recentPageNumber = 0;

		$result = $this->model_laporantonasesampah->get_laporan_tonase_by_tanggal_pdf($todayDate);

	    $fpdf = new PDF('L','cm');
	    $fpdf->setData($todayDate);
	    $fpdf->AliasNbPages();
	    $fpdf->AddPage();

	    $fpdf->Ln(1);
		$fpdf->SetFont('Times','B',16);
		$fpdf->Cell(0,0.7,'LAPORAN PEMBUANGAN TPA BENOWO TANGGAL '.$tanggalHariIni,0,0,'C');


		/* generate hasil query disini */
		$fpdf->Ln(1);
		$fpdf->SetFont('Times','B',12);
		$fpdf->Cell(1, 1, 'No.' , 1, 0, 'C');
		$fpdf->Cell(3.8 , 1, 'Waktu Pembuangan' , 1, 0, 'C');
		$fpdf->Cell(2 , 1, 'Nopol' , 1, 0, 'C');
		$fpdf->Cell(6 , 1, 'TPS' , 1, 0, 'C');
		$fpdf->Cell(2.7 , 1, 'Berat Kosong' , 1, 0, 'C');
		$fpdf->Cell(2.5 , 1, 'Berat Kotor' , 1, 0, 'C');
		$fpdf->Cell(2.5 , 1, 'Berat Bersih' , 1, 0, 'C');
		$fpdf->Cell(3.5 , 1, 'Pengentri' , 1, 0, 'C');
		$fpdf->Cell(4 , 1, 'Keterangan' , 1, 0, 'C');
		$totalTonase = 0;
		date_default_timezone_set('Asia/Jakarta');
		foreach($result->result() as $data)
		{
			$fpdf->Ln();
			$fpdf->SetFont('Times',"",10);
			$fpdf->Cell(1 , 0.7, $data->URUTANPEMBUANGAN, 1, 0, 'C');
			$fpdf->Cell(3.8 , 0.7, date('H:i:s', strtotime($data->TRAYEK_WAKTUREALISASI)) , 1, 0, 'C');
			$fpdf->Cell(2 , 0.7, $data->KENDARAAN_NOMORPOLISI , 1, 0, 'C');
			$fpdf->Cell(6 , 0.7, $data->SPOT_ASAL_NAMA , 1, 0, 'C');
			$fpdf->Cell(2.7 , 0.7, number_format($data->TRAYEK_BERATKOSONGKENDARAAN,0,',','.') , 1, 0, 'R');
			$fpdf->Cell(2.5 , 0.7, number_format($data->TRAYEK_BERATKOTORTIMBANGAN,0,',','.') , 1, 0, 'R');
			$fpdf->Cell(2.5 , 0.7, number_format($data->TRAYEK_BERATBERSIHSAMPAH,0,',','.') , 1, 0, 'R');
			$fpdf->Cell(3.5 , 0.7, $data->PENGGUNA_NAMA , 1, 0, 'C');
			$fpdf->Cell(4 , 0.7, $data->TRAYEK_KETERANGAN , 1, 0, 'C');
			$totalTonase = $totalTonase + $data->TRAYEK_BERATBERSIHSAMPAH;
			if($fpdf->GetY()>17){
				/* setting header table */
				$fpdf->SetFont('Times','B',12);
				$fpdf->Ln();
				$fpdf->Cell(0, 1,'' , 0, 0, 'C');
				$fpdf->Ln(1.5);
				$fpdf->Cell(1, 1, 'No.' , 1, 0, 'C');
				$fpdf->Cell(3.8 , 1, 'Waktu Pembuangan' , 1, 0, 'C');
				$fpdf->Cell(2 , 1, 'Nopol' , 1, 0, 'C');
				$fpdf->Cell(6 , 1, 'TPS' , 1, 0, 'C');
				$fpdf->Cell(2.7 , 1, 'Berat Kosong' , 1, 0, 'C');
				$fpdf->Cell(2.5 , 1, 'Berat Kotor' , 1, 0, 'C');
				$fpdf->Cell(2.5 , 1, 'Berat Bersih' , 1, 0, 'C');
				$fpdf->Cell(3.5 , 1, 'Pengentri' , 1, 0, 'C');
				$fpdf->Cell(4 , 1, 'Keterangan' , 1, 0, 'C');
				$recentPageNumber++;
			}



		}
		$fpdf->Ln();
		$fpdf->SetFont('Times',"B",12);
		$fpdf->Cell(18 , 1, "Jumlah Total" , 0, 0, 'R');
		$fpdf->Cell(2.5 , 1, number_format($totalTonase,0,',','.') , 1, 0, 'R');
		$fpdf->Cell(4 , 1, "" , 0, 0, 'L');
		$fpdf->Cell(3.5 , 1, "" , 0, 0, 'C');


	    $fpdf->Output("laporan_tonase_".$todayDate.".pdf","I");
	}
}
?>
