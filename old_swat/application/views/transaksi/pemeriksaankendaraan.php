<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var site_url = "<?php echo site_url()?>";
		var base_url = "<?php echo base_url()?>";
		$('#kendaraan').autocomplete({
			serviceUrl: site_url+'/transaksi/pemeriksaankendaraan/getkendaraan',
			minChars:0
		});
		$('#tps').autocomplete({
			serviceUrl: site_url+'/transaksi/pemeriksaankendaraan/gettps',
			minChars:0
		});
		
		$('#validateButton').click(function(){
			var kendaraanNomorPolisi = $('#kendaraan').val();
			var namaAsalTPS = $('#tps').val();
			console.log("called");
			if(kendaraanNomorPolisi!="")
			$.ajax({
				type : "POST",
               	url  : "<?php echo base_url(); ?>index.php/transaksi/pemeriksaankendaraan/validateKendaraan",
               	data: {
					kendaraanNomorPolisi: kendaraanNomorPolisi,
					namaAsalTPS: namaAsalTPS
				},
               	success: function(data){
               		if (data.length > 0) {
                    	console.log(data);
                    	if(data=='TRUE'){
							var content = '</br><center><span style="font-size:30px;color:#00FF00;">Kendaraan Boleh Masuk</span></center>';
						}
						else{
							var content = '<center><span style="font-size:40px;color:#FF0000">STOP!!!</span></br><span style="font-size:30px;color:#FF0000">Kendaraan Tidak Boleh Masuk</span></center>';
						}
                    	$.Dialog({
					        overlay: true,
					        shadow: true,
					        flat: true,
					        icon: '<span class="icon-bus"></span>',
					        title: 'Flat window',
					        content: '',
					        width: 400,
					        padding: 10,
					        onShow: function(_dialog){					 
					            $.Dialog.title("Pemeriksaan Kendaraan");
					            $.Dialog.content(content);
					            $.Metro.initInputs();
					        }
						});
                    }
                    else {
                    	console.log("kosong");
                    }
               	}
            });
		});
	});
</script>
<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li><a href="<?php echo base_url(); ?>">Home</a></li>
        <li><a href="<?php echo base_url(); ?>">Transaksi</a></li>
        <li class="active"><a href="#">Pemeriksaan Kendaraan</a></li>
    </ul>
</nav>
</br>

<legend>Pemeriksaan Kendaraan</legend>
<table cellspacing="200" >
<tr>
	<td align="left">
		<label class="control-label">Nomor Polisi</label>			
	</td>
	<td width="50px" align="center">:
	</td>
	<td>
		<div class="input-control text">
			<?php echo form_input(['name' => 'kendaraan', 'id' => 'kendaraan', 'class' => 'autocomplete','style'=>'width:300px;', 'value' => set_value('kendaraan'), 'placeholder' => 'Nomor Polisi']); echo form_error('kendaraan');?>
		</div>
	</td>
</tr>
<tr>
	<td align="left">
		<label class="control-label">TPS Asal Sampah</label>			
	</td>
	<td width="50px" align="center">:
	</td>
	<td>
		<div class="input-control text">
			<?php echo form_input(['name' => 'tps', 'id' => 'tps', 'class' => 'autocomplete','style'=>'width:300px;', 'value' => set_value('tps'), 'placeholder' => 'Nama TPS']); echo form_error('tps');?>
		</div>
	</td>
</tr>				
<tr>
	<td></td>
	<td></td>
	<td>
		<button id="validateButton" class="btn btn-primary">Periksa</button>
	</td>
</tr>
</table>