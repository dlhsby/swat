<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

require_once APPPATH."/third_party/fpdf.php"; 
 
class Pdf extends FPDF { 
    public function __construct($orientation='L', $unit='mm', $size='A4') { 
        parent::__construct($orientation,$unit,$size); 
        
    } 

    public $data;
    public $widths;
    public $aligns;
    
    public function SetWidths($w){
    	//Set the array column widths
		$this->widths = $w;
	}
	
	public function SetAligns($a){
		//Set the array column alignments
		$this->aligns = $a;
	}

	public function Row($data){
		//Calculate the height of the row
		$nb = 0;
		for($i=0; $i<count($data);$i++){
			$nb = max($nb, $this->NbLines($this->widths[$i], $data[$i]));
		}
		$h = 5*$nb;
		//Issue a page break first if needed
		$this->checkPageBreak($h);
		//Draw the cells of the Row
		for($i=0; $i<count($data);$i++){
			$w = $this->widths[$i];
			$a = isset($this->aligns[$i]) ? $this->aligns[$i] : 'L';
			//Save the current positions
			$x = $this->GetX();
			$y = $this->GetY();
			//Draw the border
			$this->Rect($x, $y, $w, $h);
			//Print the Text
			$this->MultiCell($w, 5, $data[$i],0,$a);
			//Put the position to the right of the cell
			$this->SetXY($x+$w, $y);
		}
		//Go to next Line
		$this->Ln($h);
	}
	
	public function CheckPageBreak($h){
		//If the height h would cause an overflow, add new page immediately
		if($this->GetY()+$h > $this->PageBreakTrigger){
			$this->AddPage($this->CurOrientation);
			$this->Ln(8);

			$start_x = $fpdf->GetX();
		    $current_x = $fpdf->GetX();
		    $current_y = $fpdf->GetY();

			$fpdf->SetFont('Times','B',12);
			$fontSize = $fpdf->FontSize;

			$fpdf->MultiCell($cell1Width, $cellHeadHeight*2, 'No.' , 1, 'C');
			$current_x+=$cell1Width;
			$fpdf->setXY($current_x,$current_y);

			$fpdf->MultiCell($cell2Width , $cellHeadHeight, 'Waktu Pembuangan' , 1, 'C');
			$current_x+=$cell2Width;
			$fpdf->setXY($current_x,$current_y);

			$fpdf->MultiCell($cell3Width , $cellHeadHeight*2, 'Nopol' , 1, 'C');
			$current_x+=$cell3Width;
			$fpdf->setXY($current_x,$current_y);

			$fpdf->MultiCell($cell4Width ,  $cellHeadHeight*2, 'TPS' , 1, 'C');
			$current_x+=$cell4Width;
			$fpdf->setXY($current_x,$current_y);

			$fpdf->MultiCell($cell5Width ,  $cellHeadHeight, 'Berat Kosong' , 1, 'C');
			$current_x+=$cell5Width;
			$fpdf->setXY($current_x,$current_y);

			$fpdf->MultiCell($cell6Width ,  $cellHeadHeight, 'Berat Kotor' , 1, 'C');
			$current_x+=$cell6Width;
			$fpdf->setXY($current_x,$current_y);

			$fpdf->MultiCell($cell7Width ,  $cellHeadHeight, 'Berat Bersih' , 1, 'C');
			$current_x+=$cell7Width;
			$fpdf->setXY($current_x,$current_y);

			$fpdf->MultiCell($cell8Width ,  $cellHeadHeight*2, 'Pengentri' , 1, 'C');
			$current_x+=$cell8Width;
			$fpdf->setXY($current_x,$current_y);

			$fpdf->MultiCell($cell9Width ,  $cellHeadHeight*2, 'Keterangan' , 1, 'C');
			$fpdf->setXY($start_x,$current_y);

		}
			
	}
	
	public function NbLines($w, $txt){
		//Computes the number of lines a Multicell of width w will take
		$cw =& $this->CurrentFont['cw'];
		if($w==0){
			$w = $this->w - $this->rMargin - $this->x;
		}
		$wmax = ($w - 2 * $this->cMargin)*1000/$this->FontSize;
		$s = str_replace('\r','',$txt);
		$nb = strlen($s);
		if($nb>0 and $s[$nb-1]=='\n'){
			$nb--;
		}		
		$sep = -1;
		$i = 0;
		$j = 0;
		$l = 0;
		$nl = 1;
		while($i < $nb){
			$c = $s[$i];
			if($c == '\n'){
				$i++;
				$sep=-1;
				$j=$i;
				$l=0;
				$nl++;
				continue;
			}
			if($c == ' '){
				$sep=$i;
			}
			$l+=$cw[$c];
			if($l > $wmax){
				if($sep == -1){
					if($i == $j){
						$i++;
					}
				}
				else{
					$i=$sep+1;
				}
				$sep=-1;
				$j=$i;
				$l=0;
				$nl++;
			}
			else{
				$i++;
			}
			
		}	
		return $nl;
	}
	
    public function setData($input){
	    $this->data = $input;
	}

    function Header()
	{
		
	    $this->SetFont('Times',"",10);
	    $this->Cell(0, 0.5, 'http://dkp.surabaya.go.id/swat/index.php/laporan/tonase/cetaklaporantonasepdf?tanggal='.$this->data,0,'LR','L');
		$this->Cell(0, 0.5, 'Laporan Pembuangan Sampah TPA Benowo '.indonesian_date($this->data, 'j F Y',""),0,'LR','R');
	}

	function Footer()
	{
	    // Position at 1.5 cm from bottom
	    $this->SetY(-16);
		$this->SetFont('Times',"",10);
		
		$this->Cell(0, 0.5, 'Halaman '.$this->PageNo().'/{nb}',0,'LR','R');
	}
}
?>