<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		$('#tanggal').datetimepicker({
			//mask:'9999-19-39 29:59:59',
			//format:'Y-m-d H:i:s',
			mask:'9999-19-39',
			format:'Y-m-d',
			timepicker:false,
			closeOnDateSelect:true
			
		});
		$('#image_button').click(function(){
		  $('#tanggal').datetimepicker('show'); //support hide,show and destroy command
		});
	});

</script>
<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li><a href="<?php echo base_url(); ?>">Home</a></li>
        <li><a href="<?php echo base_url(); ?>">Transaksi</a></li>
        <li class="active"><a href="#">Inisiasi Pengangkutan</a></li>
    </ul>
</nav>
</br>
<?php 
	echo form_open('transaksi/inisiasipengangkutanharian');
?>
	<legend>Inisiasi Pengangkutan Sampah Harian DKP</legend>
	<table cellspacing="200" >
	<tr>
		<td align="left">
			<label class="control-label">Tanggal Transaksi</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
			    <?php echo form_input(['name' => 'tanggal', 'id' => 'tanggal','value' => set_value('tanggal')]); echo form_error('tanggal');?>
				<span id="image_button" class="btn-date"></span>
			</div>					
			
		</td>
	</tr>	
	<tr>
     	<td></td>
     	<td></td>
     	<td>
     		<button class="btn btn-primary" type="submit">Generate Transaksi</button>	
     	</td>
  	</tr>						
	</table>
<?php	
	echo form_close();
?>


