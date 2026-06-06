<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		$('#waktutargetberangkat').datetimepicker({
			mask:'9999-19-39 29:59:59',
			format:'Y-m-d H:i:s'			
		});
		$('#image_button_waktutargetberangkat').click(function(){
		  $('#waktutargetberangkat').datetimepicker('show'); //support hide,show and destroy command
		});
		
		$('#waktutargetkembali').datetimepicker({
			mask:'9999-19-39 29:59:59',
			format:'Y-m-d H:i:s'			
		});
		$('#image_button_waktutargetkembali').click(function(){
		  $('#waktutargetkembali').datetimepicker('show'); //support hide,show and destroy command
		});
	});
</script>
<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li><a href="<?php echo base_url(); ?>">Home</a></li>
        <li><a href="<?php echo base_url(); ?>">Transaksi</a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/monitoringpengangkutansampah'; ?>">Monitoring</a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/monitoringpengangkutansampah/monitoringtransaksi'; ?>">Transaksi</a></li>
        <li><a href="<?php echo base_url().'index.php/transaksi/monitoringpengangkutansampah/monitoringdetailtransaksi'; ?>">Detail Transaksi</a></li>
		<li class="active"><a href="#">Tambah Detail Transaksi</a></li>
    </ul>
</nav>
</br>
<?php 
	echo form_open('transaksi/monitoringpengangkutansampah/tambahdetailtransaksi');
?>
	<legend>Tambah Detail Transaksi Baru, untuk Transaksi Nomor <?php echo $transaksiID  ?></legend>
	<table cellspacing="200" >
	<tr>
		<td align="left">
			<label class="control-label">Transaksi</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control select">
			   	<?php
               		foreach($all_transaksi->result() as $row)
               		{
                  		$array_transaksi[$row->TRANSAKSIANGKUTSAMPAH_ID] = $row->TRANSAKSIANGKUTSAMPAH_ID;
               		}
               		echo form_dropdown('transaksi',$array_transaksi,$transaksiID);
            	?>
			</div>
			
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Pengemudi</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control select">
			   	<?php
					$array_pengemudi = array();
               		foreach($all_pengemudi->result() as $row)
               		{
                  		$array_pengemudi[$row->PENGEMUDI_ID] = $row->PENGEMUDI_NAMA;
               		}
               		echo form_dropdown('pengemudi',$array_pengemudi,set_value('pengemudi'));
            	?>
			</div>
			
		</td>
	</tr>
	<tr  style="display: none">
		<td align="left">
			<label class="control-label">Rekap KM Target Berangkat Kandang</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_input(['name' => 'kmtargetberangkat', 'id' => 'kmtargetberangkat','value' => set_value('kmtargetberangkat'), 'placeholder' => 'kmtargetberangkat']); echo form_error('kmtargetberangkat');?>
			</div>
		</td>
	</tr>
	<tr  style="display: none">
		<td align="left">
			<label class="control-label">Rekap KM Target Kembali Kandang</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_input(['name' => 'kmtargetkembali', 'id' => 'kmtargetkembali','value' => set_value('kmtargetkembali'), 'placeholder' => 'kmtargetkembali']); echo form_error('kmtargetkembali');?>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Rekap Waktu Target Berangkat Kandang</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
			    <?php echo form_input(['name' => 'waktutargetberangkat', 'id' => 'waktutargetberangkat','value' => set_value('waktutargetberangkat')]); echo form_error('waktutargetberangkat');?>
				<span id="image_button_waktutargetberangkat" class="btn-date"></span>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Rekap Waktu Target Kembali Kandang</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
			    <?php echo form_input(['name' => 'waktutargetkembali', 'id' => 'waktutargetkembali','value' => set_value('waktutargetkembali')]); echo form_error('waktutargetkembali');?>
				<span id="image_button_waktutargetberangkat" class="btn-date"></span>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Status Detail Transaksi</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control select">
				<?php
               		foreach($all_statusdetailtransaksiangkutsampah->result() as $row)
               		{
                  		$array_statusdetailtransaksi[$row->STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID] = $row->STATUSDETAILTRANSAKSIANGKUTSAMPAH_NAMA;
               		}
               		echo form_dropdown('statusdetailtransaksi',$array_statusdetailtransaksi,set_value('statusdetailtransaksi'));
            	?>	
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Keterangan</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_input(['name' => 'keterangan', 'id' => 'keterangan','value' => set_value('keterangan'), 'placeholder' => 'Keterangan']); echo form_error('keterangan');?>
			</div>
		</td>
	</tr>
	<tr>
		<td></td>
		<td></td>
		<td>
			<button class="primary" type="submit">Simpan</button>
		</td>
	</tr>
	</table>
<?php	
	echo form_close();
?>
