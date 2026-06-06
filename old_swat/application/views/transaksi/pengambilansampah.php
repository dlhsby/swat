<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var site_url = "<?php echo site_url()?>";
		$('#waktu').datetimepicker({
			mask:'9999-19-39 29:59:59',
			format:'Y-m-d H:i:s'
			
		});
		$('#image_button').click(function(){
		  $('#waktu').datetimepicker('show'); //support hide,show and destroy command
		});
		$('#kendaraan').autocomplete({
			serviceUrl: site_url+'/transaksi/pengambilansampah/getkendaraan',
			minChars:0
		});
		$('#tps').autocomplete({
			serviceUrl: site_url+'/transaksi/pengambilansampah/gettps',
			minChars:0
		});
	});
</script>
<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li><a href="<?php echo base_url(); ?>">Home</a></li>
        <li><a href="<?php echo base_url(); ?>">Transaksi</a></li>
        <li class="active"><a href="#">Pengambilan Sampah</a></li>
    </ul>
</nav>
</br>
<?php 
	echo form_open('transaksi/pengambilansampah','class="form-horizontal"');
?>
	<legend>Pengambilan Sampah DKP di TPS</legend>
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
		<td align="left">
			<label class="control-label">Nominal Speedometer</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_input(['name' => 'km', 'id' => 'km', 'class' => 'form-control','style'=>'width:300px;', 'value' => set_value('km'), 'placeholder' => 'Kilometer']); echo form_error('km');?>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Waktu Pengambilan</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
			    <?php echo form_input(['name' => 'waktu', 'id' => 'waktu','value' => set_value('waktu')]); echo form_error('waktu');?>
				<span id="image_button" class="btn-date"></span>
			</div>
		</td>
	</tr>
	<tr>
		<td></td>
		<td></td>
		<td>
			<button class="btn btn-primary" type="submit">Simpan</button>
		</td>
	</tr>
	</table>
<?php	
	echo form_close();
?>
