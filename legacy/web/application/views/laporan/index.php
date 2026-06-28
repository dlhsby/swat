<?php if (!defined('BASEPATH')) exit('No direct script access allowed'); ?>
<script type="text/javascript">
var site_url = "<?php echo site_url()?>";
var base_url = "<?php echo base_url() ?>";
var jadwalBaca = "";
google.load("visualization", "1", {packages:["corechart","table"]});
google.setOnLoadCallback(function() {
	$(document).ready(function () {
		$('#hideHelper1').hide();	
		$('#hideHelper2').hide();	
		$('#errorHelper1').hide();	
		$('#errorHelper2').hide();	
		
		$('#tahun2').data("suggestion",{ value: "", data: "" });
		$('#tahun2').autocomplete({
			serviceUrl: site_url+'/laporan/tonase/gettahun',
			onSelect: function (suggestion) {
				$('#tahun2').data("suggestion",{ value: suggestion.value, data: suggestion.data });
		    },
			minChars:0
		});
		$('#bulan').data("suggestion",{ value: "", data: "" });
		$('#bulan').autocomplete({
			serviceUrl: site_url+'/laporan/tonase/getbulan',
			onSelect: function (suggestion) {
				$('#bulan').data("suggestion",{ value: suggestion.value, data: suggestion.data });
		    },
			minChars:0
		});
		function drawchart_trenTonasePerBulan(tahun) {
			var jsonData = 	$.ajax({
								data: {tahun: tahun},
					      		url: site_url+"/laporan/tonase/gettrentonaseperbulan",
					      		dataType:"json",
					      		async: false
					      	}).responseText;
			//console.log(jsonData);
			var data = new google.visualization.DataTable(jsonData);
			
			var options = {
				title : 'GRAFIK TONASE SAMPAH KOTA SURABAYA TAHUN 2016',
				seriesType: "bars",
				vAxis: {title: "Ton"},
    			hAxis: {title: "Bulan"},
				series: {1: {type: "line"}}
			};

	        var chart = new google.visualization.ComboChart(document.getElementById('chart_trenTonasePerBulan'));
	        chart.draw(data, options);
		}
		
		function drawchart_trenTonasePerHari(tahun,bulan) {
			var jsonData = 	$.ajax({
								data: {tahun: tahun,bulan:bulan},
					      		url: site_url+"/laporan/tonase/gettrentonaseperhari",
					      		dataType:"json",
					      		async: false
					      	}).responseText;
			//console.log(jsonData);
			var data = new google.visualization.DataTable(jsonData);
			var namaBulan = $('#bulan').val();
			var options = {
				title : 'GRAFIK TONASE SAMPAH KOTA SURABAYA BULAN '+namaBulan.toUpperCase()+' TAHUN 2016',
				seriesType: "bars",
				vAxis: {title: "Ton"},
    			hAxis: {title: "Tanggal"},
				series: {1: {type: "line"}}
			};

	        var chart = new google.visualization.ComboChart(document.getElementById('chart_trenTonasePerHari'));
	        chart.draw(data, options);
		}
		
		$('#LoadRecordsButton1').click(function () {
            event.preventDefault();
            var tahun = '2014';
            if($('#tahun1').val()==tahun){
				$('#errorHelper1').hide();
				$('#hideHelper1').show('slow');
				drawchart_trenTonasePerBulan(tahun);
			}			
			else{
				$('#hideHelper1').hide();
				$('#errorHelper1').show('slow');	
			}
				
        });
        
        $('#LoadRecordsButton2').click(function () {
            event.preventDefault();
			var tahun = $('#tahun2').val();
			var bulan = $('#bulan').data("suggestion").data;
            if(tahun && bulan){
				$('#errorHelper2').hide();
				$('#hideHelper2').show('slow');
				drawchart_trenTonasePerHari(tahun,bulan);
				console.log("Getting Data");
	            try{
					var result;
				    $.ajax({
						data: {tahun: tahun,bulan: bulan},
				        type: "POST",
				        dataType:"html",
					    async: false,
				        url: site_url+"/laporan/tonase/gettabeltonaseperhari",
				        success: function (data) {
				            result = data;
				            $('#tabel_tonasePerHari').html(data);
				            console.log(data);
				        }
				    });
				} catch (err) {
					console.log("Error Getting Data");
				}
			}			
			else{
				$('#hideHelper2').hide();
				$('#errorHelper2').show('slow');	
			}
        });
    });    
});
    
</script>

<legend>Laporan Tonase Sampah Kota Surabaya</legend>

<h4 align="center">Rekap Laporan Perbulan dalam Setahun</h4>
<div class="filtering" align="center">
    <form>
    	<table width="100%" align="center">
			<tr valign="middle">				
				<td width="33%">
					<table width="100%" align="center">
						<tr>
							<td width="24%" align="right">PIN : </td>
							<td width="1%" align="center"></td>
							<td width="75%" align="left">
								<div class="input-control text" style="width: 100%"> 
							        <input type="password"  name="tahun1" id="tahun1" placeholder="PIN / Password" />
								</div>
							</td>
						</tr>
					</table>
				</td>
				<td width="33%">
					<table width="100%" align="center">
						<tr>
							<td width="24%" align="right" ></td>
							<td width="1%" align="center"></td>
							<td width="75%" align="left" valign="middle">
								<button class="primary large" type="submit" id="LoadRecordsButton1">Tampilkan</button>
							</td>
						</tr>
					</table>
				</td>
				<td width="33%">
				</td>
			</tr>
		</table>
    </form>
</div>
<div id="errorHelper1" style="display: none" align="center" class="fg-red">Belum Ada Data Tonase Untuk Tahun Tersebut</div>
<div id="hideHelper1" style="display: none;" >
	<!--<h5 align="center">Total Tonase Tahun 2016 : <?php echo ('<a href="'.base_url().'index.php/laporan/tonase">'.number_format($tonase2014,3,",",".").'</a>') ?> Ton</h5> -->
	<table width="100%" border="1" style="border-color:#CCCCCC" align="center"> 
		<head class="bg-cyan fg-white" align="center">
			<tr>
				<th rowspan="2">Tanggal</th>
				<th colspan="12">2016 (Ton)</th>
			</tr>
			<tr>
				<th>Januari</th>
				<th>Februari</th>
				<th>Maret</th>
				<th>April</th>
				<th>Mei</th>
				<th>Juni</th>
				<th>Juli</th>
				<th>Agustus</th>
				<th>September</th>

			</tr>
		</thead>
		<tbody align="right">
			<?php for ($i = 0; $i < 28; $i++) {
    		?>
    			<tr>
    				<td><?php echo $i+1 ?></td>    				
    					<?php for ($j = 0; $j < 9; $j++) {
    					?>
    						<td><?php 
    								if($rekapTonase[$i][$j]['TANGGAL']==$i+1 && $rekapTonase[$i][$j]['BULAN']==$j+1)
    									echo number_format($rekapTonase[$i][$j]['TONASE_NOMINAL'],3,",","."); 
    								else echo '-';
    							?>    					
    						</td>	
    					<?php
    					} ?>
    			</tr>
    		<?php
			} ?>
			 <tr><td>29 </td><td>1.558,480 </td><td>1.660.590</td><td>1.499,790 </td><td>1.654,720 </td><td>1.519,110 </td><td>1.355,450 </td><td>1.465,720 </td><td>1.444,360 </td><td>1.709,260 </td>
 <tr><td>30 </td><td>1.493,500 </td><td>-</td><td>1.367,200 </td><td>1.481,340 </td><td>1.471,880 </td><td>1.381,500 </td><td>1.492,650 </td><td>1.517,860</td><td>1.786.670 </td>
 <tr><td>31 </td><td>1.534,310 </td><td>-</td><td>1.460,320 </td><td>-</td><td>1.431,990 </td><td>-</td><td>1.385,180 </td><td>1.562,800 </td><td>-</td>
 		 <tr class="bg-yellow"><td> Total (kg) </td><td>45.282,830 </td><td>43.108,260 </td><td>48.854,080 </td><td>46.108,610 </td><td>46.048,420 </td><td>44.003,650 </td><td>43.772,840 </td><td>46.330,200 </td><td>45.753.830 </td>
 <tr class="bg-yellow"><td> Total (ton) </td><td> 45.282 </td><td> 43.108 </td><td> 48.854 </td><td> 46.108 </td><td> 46.048 </td><td> 44.003 </td><td> 43.772 </td><td> 46.330 </td><td> 45.753 </td>
		</tbody>
	</table>
</div>
</br>
<table width="100%">
	<tr>
		<td width="100%">
			<div id="chart_trenTonasePerBulan"></div>
		</td>
	</tr>
</table>
</br></br>

<!--
<h4 align="center">Detail Laporan Tonase Per Bulan</h4>
<div class="filtering" align="center">
    <form>
    	<table width="100%" align="center">
			<tr valign="middle">				
				<td width="33%">
					<table width="100%" align="center">
						<tr>
							<td width="24%" align="right">Tahun</td>
							<td width="1%" align="center">:</td>
							<td width="75%" align="left">
								<div class="input-control text" style="width: 100%"> 
							        <input type="text" class="autocomplete" name="tahun2" id="tahun2" placeholder="Tahun" />
								</div>
							</td>
						</tr>
					</table>
				</td>
				<td width="33%">
					<table width="100%" align="center">
						<tr>
							<td width="24%" align="right">Bulan</td>
							<td width="1%" align="center">:</td>
							<td width="75%" align="left">
								<div class="input-control text" style="width: 100%"> 
							        <input type="text" class="autocomplete" name="bulan" id="bulan" placeholder="bulan" />
								</div>
							</td>
						</tr>
					</table>
				</td>
				<td width="33%">
					<table width="100%" align="center">
						<tr>
							<td width="24%" align="right" ></td>
							<td width="1%" align="center"></td>
							<td width="75%" align="left" valign="middle">
								<button class="primary large" type="submit" id="LoadRecordsButton2">Tampilkan</button>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
    </form>
</div> -->
<div id="errorHelper2" style="display: none" align="center" class="fg-red">Belum Ada Data Tonase Untuk Tahun Tersebut</div>
<div id="hideHelper2" style="display:none ">
	<table width="100%">
		<tr valign="top">
			<td width="25%">
				<div id="tabel_tonasePerHari"></div>
				
			</td>
			<td width="75%" >
				<div id="chart_trenTonasePerHari"></div>
			</td>
		</tr>
	</table>
</div>