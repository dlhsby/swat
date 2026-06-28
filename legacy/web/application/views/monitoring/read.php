<?php if (!defined('BASEPATH')) exit('No direct script access allowed'); ?>
<table>
	<tr>
		<td>getTonaseLimaHariTPS</td>
		<td><div id="TglgetTonaseLimaHariTPS"></div></td>
		<td><div id="ProgetTonaseLimaHariTPS">Restore</div></td>
		<td><div id="RgetTonaseLimaHariTPS"></div></td>
	</tr>
	<tr>
		<td>getTotalTonaseLimaHari</td>
		<td><div id="TglgetTotalTonaseLimaHari"></div></td>
		<td><div id="ProgetTotalTonaseLimaHari">Restore</div></td>
		<td><div id="RgetTotalTonaseLimaHari"></div></td>
	</tr>
	<tr>
		<td>getTotalTonaseSatuBulan</td>
		<td><div id="TglgetTotalTonaseSatuBulan"></div></td>
		<td><div id="ProgetTotalTonaseSatuBulan">Restore</div></td>
		<td><div id="RgetTotalTonaseSatuBulan"></div></td>
	</tr>
	<tr>
		<td>getTonaseJenisSampah</td>
		<td><div id="TglgetTonaseJenisSampah"></div></td>
		<td><div id="ProgetTonaseJenisSampah">Restore</div></td>
		<td><div id="RgetTonaseJenisSampah"></div></td>			
	</tr>
	<tr>
		<td>getSelisihTonase</td>
		<td><div id="TglgetSelisihTonase"></div></td>	
		<td><div id="ProgetSelisihTonase">Restore</div></td>
		<td><div id="RgetSelisihTonase"></div></td>	
	</tr>
	<tr>
		<td>getTotalJenisKendaraanAktif</td>
		<td><div id="TglgetTotalJenisKendaraanAktif"></div></td>
	    <td><div id="ProgetTotalJenisKendaraanAktif">Restore</div></td>
		<td><div id="RgetTotalJenisKendaraanAktif"></div></td>			
	</tr>
	<tr>
		<td>getRuteAntarSpot</td>
		<td><div id="TglgetRuteAntarSpot"></div></td>
		<td><div id="ProgetRuteAntarSpot">Restore</div></td>
		<td><div id="RgetRuteAntarSpot"></div></td>
	</tr>
	<tr>
		<td>getLocationTpa</td>
		<td><div id="TglgetLocationTpa"></div></td>	
		<td><div id="ProgetLocationTpa">Restore</div></td>
		<td><div id="RgetLocationTpa"></div></td>
	</tr>
</table>	
<script src=<?php echo base_url() . "assets/js/gauge/gauge.js" ?>></script>
<script src=<?php echo base_url() . "assets/js/morris-chart/morris.js" ?>></script>
<script src=<?php echo base_url() . "assets/js/morris-chart/raphael-min.js" ?>></script>
<script src=<?php echo base_url() . "assets/js/advanced-datatable/js/jquery.dataTables.js" ?>></script>
<script src=<?php echo base_url() . "assets/js/data-tables/DT_bootstrap.js" ?>></script>
<script src=<?php echo base_url() . "assets/js/flot/jquery.flot.js" ?>></script>
<script src=<?php echo base_url() . "assets/js/flot/jquery.flot.tooltip.js" ?>></script>
<script src=<?php echo base_url() . "assets/js/flot/jquery.flot.resize.js" ?>></script>
<script src=<?php echo base_url() . "assets/js/flot/jquery.flot.pie.js" ?>></script>

<script src="https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&language=id"></script>
<script type="text/javascript" src=<?php echo base_url() . "assets/js/monitoring-bahanbakar.js" ?>></script>
<script type="text/javascript" src=<?php echo base_url() . "assets/js/monitoring-tonase-semua.js" ?>></script>
<script type="text/javascript" src=<?php echo base_url() . "assets/js/monitoring-rute-semua.js" ?>></script>
<script type="text/javascript">
var days1 = 0;
var days2 = 0;
var days3 = 0;
var days4 = 0;
var days5 = 0;
var days6 = 0;
var days7 = 0;
var days8 = 0;
$(document).ready(function () {
	var intervalgetTonaseLimaHariTPS = setInterval(function() {
		if ($('#ProgetTonaseLimaHariTPS').text() == 'Restore') {
			var date1 = new Date();
			var last1 = new Date(date1.getTime() - (days1 * 24 * 60 * 60 * 1000));
			var tanggal1 = last1.getFullYear() +'-'+ ("0" + (last1.getMonth() + 1)).slice(-2) +'-'+ ("0" + last1.getDate()).slice(-2);			
			$.ajax({
				type: "POST", 
				url: "<?php echo base_url(); ?>index.php/monitoring/tonasesemua/getTonaseLimaHariTPSread",
				async: true,
				dataType: 'json',
				data: {
					'tanggal': tanggal1
				},
				beforeSend: function () {
					$('#TglgetTonaseLimaHariTPS').text(tanggal1);
					$('#ProgetTonaseLimaHariTPS').text('Load');
					$('#RgetTonaseLimaHariTPS').text('-');				
				},
				success: function (data) {
					var cdata = JSON.stringify(data);
					if (cdata.length >= 2) {
						$('#ProgetTonaseLimaHariTPS').text('Restore');
						$('#RgetTonaseLimaHariTPS').text(cdata);	
						days1 = days1+1;
						if (days1 > 62) {
							days1 = 0;
						}
					}	
				},
				error: function () {
					$('#ProgetTonaseLimaHariTPS').text('Restore');
				},
				timeout: 150000 //2.5menit
			});
		}
		if ($('#ProgetTotalTonaseLimaHari').text() == 'Restore') {
			var date2 = new Date();
			var last2 = new Date(date2.getTime() - (days2 * 24 * 60 * 60 * 1000));
			var tanggal2 = last2.getFullYear() +'-'+ ("0" + (last2.getMonth() + 1)).slice(-2) +'-'+ ("0" + last2.getDate()).slice(-2);
			$.ajax({
				type: "POST",
				url: "<?php echo base_url(); ?>index.php/monitoring/tonasesemua/getTotalTonaseLimaHariread",
				async: true,
				dataType: 'json',
				data: {
					'tanggal': tanggal2
				},
				beforeSend: function () {
					$('#TglgetTotalTonaseLimaHari').text(tanggal2);
					$('#ProgetTotalTonaseLimaHari').text('Load');
					$('#RgetTotalTonaseLimaHari').text('-');				
				},
				success: function (data) {
					var cdata = JSON.stringify(data);
					if (cdata.length >= 2) {
						$('#ProgetTotalTonaseLimaHari').text('Restore');
						$('#RgetTotalTonaseLimaHari').text(cdata);	
						days2 = days2+1;
						if (days2 > 62) {
							days2 = 0;
						}
					}	
				},
				error: function () {
					$('#ProgetTotalTonaseLimaHari').text('Restore');
				},
				timeout: 600000 //10menit
			});
		}
		if ($('#ProgetTotalTonaseSatuBulan').text() == 'Restore') {
			var date3 = new Date();
			var last3 = new Date(date3.getTime() - (days3 * 24 * 60 * 60 * 1000));
			var tanggal3 = last3.getFullYear() +'-'+ ("0" + (last3.getMonth() + 1)).slice(-2) +'-'+ ("0" + last3.getDate()).slice(-2);
			$.ajax({
				type: "POST",
				url: "<?php echo base_url(); ?>index.php/monitoring/tonasesemua/getTotalTonaseSatuBulanread",
				async: true,
				dataType: 'json',
				data: {
					'tanggal': tanggal3
				},
				beforeSend: function () {
					$('#TglgetTotalTonaseSatuBulan').text(tanggal3);
					$('#ProgetTotalTonaseSatuBulan').text('Load');
					$('#RgetTotalTonaseSatuBulan').text('-');				
				},
				success: function (data) {
					var cdata = JSON.stringify(data);
					if (cdata.length >= 2) {
						$('#ProgetTotalTonaseSatuBulan').text('Restore');
						$('#RgetTotalTonaseSatuBulan').text(cdata);	
						days3 = days3+1;
						if (days3 > 62) {
							days3 = 0;
						}
					}	
				},
				error: function () {
					$('#ProgetTotalTonaseSatuBulan').text('Restore');
				},
				timeout: 600000 //10menit
			});
		}
		if ($('#ProgetTonaseJenisSampah').text() == 'Restore') {
			var date4 = new Date();
			var last4 = new Date(date4.getTime() - (days4 * 24 * 60 * 60 * 1000));
			var tanggal4 = last4.getFullYear() +'-'+ ("0" + (last4.getMonth() + 1)).slice(-2) +'-'+ ("0" + last4.getDate()).slice(-2);
			$.ajax({
				type: "POST",
				url: "<?php echo base_url(); ?>index.php/monitoring/tonasesemua/getTonaseJenisSampahread",
				async: true,
				dataType: 'json',
				data: {
					'tanggal': tanggal4
				},
				beforeSend: function () {
					$('#TglgetTonaseJenisSampah').text(tanggal4);
					$('#ProgetTonaseJenisSampah').text('Load');
					$('#RgetTonaseJenisSampah').text('-');				
				},
				success: function (data) {
					var cdata = JSON.stringify(data);
					if (cdata.length >= 2) {
						$('#ProgetTonaseJenisSampah').text('Restore');
						$('#RgetTonaseJenisSampah').text(cdata);	
						days4 = days4+1;
						if (days4 > 62) {
							days4 = 0;
						}
					}	
				},
				error: function () {
					$('#ProgetTonaseJenisSampah').text('Restore');
				},
				timeout: 600000 //10menit
			});
		}
		if ($('#ProgetSelisihTonase').text() == 'Restore') {
			var date5 = new Date();
			var last5 = new Date(date5.getTime() - (days5 * 24 * 60 * 60 * 1000));
			var tanggal5 = last5.getFullYear() +'-'+ ("0" + (last5.getMonth() + 1)).slice(-2) +'-'+ ("0" + last5.getDate()).slice(-2);
			$.ajax({
				type: "POST",
				url: "<?php echo base_url(); ?>index.php/monitoring/tonasesemua/getSelisihTonaseread",
				async: true,
				dataType: 'json',
				data: {
					'tanggal': tanggal5
				},
				beforeSend: function () {
					$('#TglgetSelisihTonase').text(tanggal5);
					$('#ProgetSelisihTonase').text('Load');
					$('#RgetSelisihTonase').text('-');				
				},
				success: function (data) {
					var cdata = JSON.stringify(data);
					if (cdata.length >= 2) {
						$('#ProgetSelisihTonase').text('Restore');
						$('#RgetSelisihTonase').text(cdata);	
						days5 = days5+1;
						if (days5 > 62) {
							days5 = 0;
						}
					}	
				},
				error: function () {
					$('#ProgetSelisihTonase').text('Restore');
				},
				timeout: 600000 //10menit
			});
		}
		if ($('#ProgetTotalJenisKendaraanAktif').text() == 'Restore') {
			var date6 = new Date();
			var last6 = new Date(date6.getTime() - (days6 * 24 * 60 * 60 * 1000));
			var tanggal6 = last6.getFullYear() +'-'+ ("0" + (last6.getMonth() + 1)).slice(-2) +'-'+ ("0" + last6.getDate()).slice(-2);
			$.ajax({
				type: "POST",
				url: "<?php echo base_url(); ?>
				index.php/monitoring/rutesemua/getTotalJenisKendaraanAktifread",
				async: true,
				dataType: 'json',
				data: {
					'tanggal': tanggal6
				},
				beforeSend: function () {
					$('#TglgetTotalJenisKendaraanAktif').text(tanggal6);
					$('#ProgetTotalJenisKendaraanAktif').text('Load');
					$('#RgetTotalJenisKendaraanAktif').text('-');				
				},
				success: function (data) {
					var cdata = JSON.stringify(data);
					if (cdata.length >= 2) {
						$('#ProgetTotalJenisKendaraanAktif').text('Restore');
						$('#RgetTotalJenisKendaraanAktif').text(cdata);	
						days6 = days6+1;
						if (days6 > 62) {
							days6 = 0;
						}
					}	
				},
				error: function () {
					$('#ProgetTotalJenisKendaraanAktif').text('Restore');
				},
				timeout: 600000 //10menit
			});
		}
		if ($('#ProgetRuteAntarSpot').text() == 'Restore') {
			var date7 = new Date();
			var last7 = new Date(date7.getTime() - (days7 * 24 * 60 * 60 * 1000));
			var tanggal7 = last7.getFullYear() +'-'+ ("0" + (last7.getMonth() + 1)).slice(-2) +'-'+ ("0" + last7.getDate()).slice(-2);
			$.ajax({
				type: "POST",
				url: "<?php echo base_url(); ?>
				index.php/monitoring/rutesemua/getRuteAntarSpotread",
				async: true,
				dataType: 'json',
				data: {
					'tanggal': tanggal7
				},
				beforeSend: function () {
					$('#TglgetRuteAntarSpot').text(tanggal7);
					$('#ProgetRuteAntarSpot').text('Load');
					$('#RgetRuteAntarSpot').text('-');				
				},
				success: function (data) {
					var cdata = JSON.stringify(data);
					if (cdata.length >= 2) {
						$('#ProgetRuteAntarSpot').text('Restore');
						$('#RgetRuteAntarSpot').text(cdata);	
						days7 = days7+1;
						if (days7 > 62) {
							days7 = 0;
						}
					}	
				},
				error: function () {
					$('#ProgetRuteAntarSpot').text('Restore');
				},
				timeout: 600000 //10menit
			});
		}
		if ($('#ProgetLocationTpa').text() == 'Restore') {
			var date8 = new Date();
			var last8 = new Date(date8.getTime() - (days8 * 24 * 60 * 60 * 1000));
			var tanggal8 = last8.getFullYear() +'-'+ ("0" + (last8.getMonth() + 1)).slice(-2) +'-'+ ("0" + last8.getDate()).slice(-2);
			$.ajax({
				type: "POST",
				url: "<?php echo base_url(); ?>
				index.php/monitoring/rutesemua/getLocationTparead",
				async: true,
				dataType: 'json',
				data: {
					'tanggal': tanggal8
				},
				beforeSend: function () {
					$('#TglgetLocationTpa').text(tanggal8);
					$('#ProgetLocationTpa').text('Load');
					$('#RgetLocationTpa').text('-');				
				},
				success: function (data) {
					var cdata = JSON.stringify(data);
					if (cdata.length >= 2) {
						$('#ProgetLocationTpa').text('Restore');
						$('#RgetLocationTpa').text(cdata);	
						days8 = days8+1;
						if (days8 > 62) {
							days8 = 0;
						}
					}	
				},
				error: function () {
					$('#ProgetLocationTpa').text('Restore');
				},
				timeout: 600000 //10menit
			});
		}		
	}, 5000);
	
});
</script>