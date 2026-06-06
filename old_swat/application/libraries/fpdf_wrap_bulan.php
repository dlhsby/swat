<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

require_once APPPATH."/third_party/fpdf.php";

class Fpdf_wrap_bulan extends FPDF {
	public $todaydate;
  public $bulan;
  public $tahun;
    private $data = array();
  	private $options = array(
  		'filename' => '',
  		'destinationfile' => '',
  		'paper_size'=>'F4',
  		'orientation'=>'P'
  	);

  	function __construct($data = array(), $options = array()) {
    	parent::__construct();
    	$this->data = $data;
    	$this->options = $options;
	}

	public function setTodayDate($input){
	    $this->todaydate = $input;
	}

  public function setMonth($input){
	    $this->bulan = $input;
	}

  public function setYear($input){
	    $this->tahun = $input;
	}

	function Header()
	{

	    $this->SetFont('Times',"",10);
	    $this->Cell(0, 14, 'http://dkp.surabaya.go.id/swat/index.php/laporan/tonase/cetaklaporantonasepdfbulan?bulan='.$this->bulan.'&tahun='.$this->tahun,0,'LR','L');
		$this->Cell(0, 14, 'Laporan Pembuangan Sampah TPA Benowo bulan ke '.$this->bulan.' tahun '.$this->tahun,0,'LR','R');
	}

	function Footer()
	{
	    // Position at 1.5 cm from bottom
	    $this->SetY(-50);
		$this->SetFont('Times',"",10);

		$this->Cell(0, 14, 'Halaman '.$this->PageNo().'/{nb}',0,'LR','R');
	}

	public function rptDetailData () {
		//
		$border = 0;
		$this->AddPage();
		$this->SetAutoPageBreak(true,60);
		$this->AliasNbPages();
		$left = 25;

		$h = 18;
		$left = 40;
		$top = 80;

		$cellHeadHeight = $h;
	    $cellBodyHeight = $h;
	    $cell1Width = 30;
	    $cell2Width = 75;
	    $cell3Width = 70;
	    $cell4Width = 170;
	    $cell5Width = 50;
	    $cell6Width = 50;
	    $cell7Width = 50;
	    $cell8Width = 120;
	    $cell9Width = 170;
	    $totalTonase = 0;
		date_default_timezone_set('Asia/Jakarta');

		$this->Ln($h*2);

		$this->SetFont('Times','B',16);
		$this->Cell(0,8,'LAPORAN PEMBUANGAN TPA BENOWO BULAN '.$this->bulan.' TAHUN '.$this->tahun);

		#tableheader
		$this->Ln($h);
		$this->SetFillColor(200,200,200);

		$start_x = $this->GetX();
	    $current_x = $this->GetX();
	    $current_y = $this->GetY();

		$this->SetFont('Times','B',12);
		$this->SetWidths(array($cell1Width,$cell2Width,$cell3Width,$cell4Width,$cell5Width,$cell6Width,$cell7Width,$cell8Width,$cell9Width));
		$this->SetAligns(array('C','C','C','C','C','C','C','C','C'));
		$this->Row(
			array(
				'No.',
				'Waktu Pembuangan',
				'Nopol',
				'TPS',
				'Berat Kosong',
				'Berat Kotor',
				'Berat Bersih',
				'Pengentri',
				'Keterangan'
		));

		$this->SetFont('Times','',10);
		$this->SetAligns(array('C','C','C','C','R','R','R','C','C'));
		$this->SetFillColor(255);
		foreach ($this->data as $baris) {
			$this->Row(
				array(
					$baris->URUTANPEMBUANGAN,
					date('H:i:s', strtotime($baris->TRAYEK_WAKTUREALISASI)),
					$baris->KENDARAAN_NOMORPOLISI,
					$baris->SPOT_ASAL_NAMA,
					number_format($baris->TRAYEK_BERATKOSONGKENDARAAN),
					number_format($baris->TRAYEK_BERATKOTORTIMBANGAN),
					number_format($baris->TRAYEK_BERATBERSIHSAMPAH),
					$baris->PENGGUNA_NAMA,
					$baris->TRAYEK_KETERANGAN,
			));
			$totalTonase = $totalTonase + $baris->TRAYEK_BERATBERSIHSAMPAH;
		}

		$this->SetFont('Times',"B",12);
		$this->Cell($cell1Width+$cell2Width+$cell3Width+$cell4Width+$cell5Width+$cell6Width , 18, "Jumlah Total" , 0, 0, 'R');
		$this->Cell($cell7Width , 18, number_format($totalTonase,0,',','.') , 1, 0, 'R');
		$this->Cell($cell8Width , 18, "" , 0, 0, 'L');
		$this->Cell($cell9Width , 18, "" , 0, 0, 'C');

	}

	public function printPDF () {

		if ($this->options['paper_size'] == "F4") {
			$a = 8.3 * 72; //1 inch = 72 pt
			$b = 13.0 * 72;
			$this->FPDF($this->options['orientation'], "pt", array($a,$b));
		} else {
			$this->FPDF($this->options['orientation'], "pt", $this->options['paper_size']);
		}

	    $this->SetAutoPageBreak(false);
	    $this->AliasNbPages();
	    //$this->AddPage();

	    $this->rptDetailData();

	    $this->Output($this->options['filename'],$this->options['destinationfile']);
  	}

  	private $widths;
	private $aligns;

	function SetWidths($w)
	{
		//Set the array of column widths
		$this->widths=$w;
	}

	function SetAligns($a)
	{
		//Set the array of column alignments
		$this->aligns=$a;
	}

	function Row($data)
	{
		//Calculate the height of the row
		$nb=0;
		for($i=0;$i<count($data);$i++)
			$nb=max($nb,$this->NbLines($this->widths[$i],$data[$i]));
		$h=18*$nb;
		//Issue a page break first if needed
		$this->CheckPageBreak($h);
		//Draw the cells of the row
		for($i=0;$i<count($data);$i++)
		{
			$w=$this->widths[$i];
			$a=isset($this->aligns[$i]) ? $this->aligns[$i] : 'L';
			//Save the current position
			$x=$this->GetX();
			$y=$this->GetY();
			//Draw the border
			$this->Rect($x,$y,$w,$h);
			//Print the text
			$this->MultiCell($w,18,$data[$i],0,$a);
			//Put the position to the right of the cell
			$this->SetXY($x+$w,$y);
		}
		//Go to the next line
		$this->Ln($h);
	}

	function CheckPageBreak($h)
	{
		//If the height h would cause an overflow, add a new page immediately
		if($this->GetY()+$h>$this->PageBreakTrigger){
			$this->AddPage($this->CurOrientation);
			$this->Ln(30);

			$cell1Width = 30;
		    $cell2Width = 75;
		    $cell3Width = 70;
		    $cell4Width = 170;
		    $cell5Width = 50;
		    $cell6Width = 50;
		    $cell7Width = 50;
		    $cell8Width = 120;
		    $cell9Width = 170;

			$this->SetFont('Times','B',12);
			$this->SetWidths(array($cell1Width,$cell2Width,$cell3Width,$cell4Width,$cell5Width,$cell6Width,$cell7Width,$cell8Width,$cell9Width));
			$this->SetAligns(array('C','C','C','C','C','C','C','C','C'));
			$this->Row(
				array(
					'No.',
					'Waktu Pembuangan',
					'Nopol',
					'TPS',
					'Berat Kosong',
					'Berat Kotor',
					'Berat Bersih',
					'Pengentri',
					'Keterangan'
			));
			$this->SetFont('Times','',10);
			$this->SetAligns(array('C','C','C','C','R','R','R','C','C'));
		}
	}

	function NbLines($w,$txt)
	{
		//Computes the number of lines a MultiCell of width w will take
		$cw=&$this->CurrentFont['cw'];
		if($w==0)
			$w=$this->w-$this->rMargin-$this->x;
		$wmax=($w-2*$this->cMargin)*1000/$this->FontSize;
		$s=str_replace("\r",'',$txt);
		$nb=strlen($s);
		if($nb>0 and $s[$nb-1]=="\n")
			$nb--;
		$sep=-1;
		$i=0;
		$j=0;
		$l=0;
		$nl=1;
		while($i<$nb)
		{
			$c=$s[$i];
			if($c=="\n")
			{
				$i++;
				$sep=-1;
				$j=$i;
				$l=0;
				$nl++;
				continue;
			}
			if($c==' ')
				$sep=$i;
			$l+=$cw[$c];
			if($l>$wmax)
			{
				if($sep==-1)
				{
					if($i==$j)
						$i++;
				}
				else
					$i=$sep+1;
				$sep=-1;
				$j=$i;
				$l=0;
				$nl++;
			}
			else
				$i++;
		}
		return $nl;
	}
}
?>
