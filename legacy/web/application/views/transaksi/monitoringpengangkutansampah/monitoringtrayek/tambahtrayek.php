<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		$('#waktutarget').datetimepicker({
			mask:'9999-19-39 29:59:59',
			format:'Y-m-d H:i:s'			
		});
		$('#image_button_waktutarget').click(function(){
		  $('#waktutarget').datetimepicker('show'); //support hide,show and destroy command
		});
		
		$('#wakturealisasi').datetimepicker({
			mask:'9999-19-39 29:59:59',
			format:'Y-m-d H:i:s'			
		});
		$('#image_button_wakturealisasi').click(function(){
		  $('#wakturealisasi').datetimepicker('show'); //support hide,show and destroy command
		});
		$("#kategorirute").change(function(){		
			var kategoriRuteID = $("#kategorirute").val();
			console.log(kategoriRuteID);
			$("#RowBBMDiajukan").hide('fade');
			if(kategoriRuteID==0){
				$("#rute").empty();
			}
			else
			{
				if(kategoriRuteID == 2)$("#RowBBMDiajukan").show('fade');
				$.ajax({
	            	type : "POST",
	               	url  : "<?php echo base_url(); ?>index.php/transaksi/monitoringpengangkutansampah/getRuteByKategoriRute",
	               	data : "kategoriRuteID=" + kategoriRuteID,
	               	success: function(data){
	               		if(data.length>0){
							console.log(data);
							$("#rute").html(data);	
						}
						else console.log("kosong");
	               		
	               	}
	            });                          	
			}
        });
		$("#rute").change(function(){	
			console.log('oioioi : '+$("#rute").val());
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
        <li><a href="<?php echo base_url().'index.php/transaksi/monitoringpengangkutansampah/monitoringtrayek'; ?>">Trayek</a></li>
		<li class="active"><a href="#">Tambah Trayek</a></li>
    </ul>
</nav>
</br>
<?php 
	echo form_open('transaksi/monitoringpengangkutansampah/tambahtrayek');
?>
	<legend>Tambah Trayek Baru</legend>
	<table cellspacing="200" >
	<tr>
		<td align="left">
			<label class="control-label">Detail Transaksi</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control select">
			   	<?php
               		foreach($all_detailtransaksi->result() as $row)
               		{
                  		$array_detailtransaksi[$row->DETAILTRANSAKSIANGKUTSAMPAH_ID] = $row->DETAILTRANSAKSIANGKUTSAMPAH_ID;
               		}
               		echo form_dropdown('detailtransaksi',$array_detailtransaksi,$detailTransaksiID);
            	?>
			</div>
			
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Kategori Rute</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control select">
			   	<?php
					$array_kategorirute[0] = '';
               		foreach($all_kategorirute->result() as $row)
               		{
                  		$array_kategorirute[$row->KATEGORIRUTE_ID] = $row->KATEGORIRUTE_NAMA;
               		}
               		echo form_dropdown('kategorirute',$array_kategorirute,set_value('kategorirute'),'id="kategorirute"');
            	?>
			</div>
			
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Rute</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control select">
			   	<?php
					$array_rute = array();
               		echo form_dropdown('rute',$array_rute,'','id="rute"');
            	?>
			</div>
			
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Waktu Target</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
			    <?php echo form_input(['name' => 'waktutarget', 'id' => 'waktutarget','value' => set_value('waktutarget')]); echo form_error('waktutarget');?>
				<span id="image_button_waktutarget" class="btn-date"></span>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Waktu Realisasi</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
			    <?php echo form_input(['name' => 'wakturealisasi', 'id' => 'wakturealisasi','value' => set_value('wakturealisasi')]); echo form_error('wakturealisasi');?>
				<span id="image_button_wakturealisasi" class="btn-date"></span>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Km Target</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_input(['name' => 'kmtarget', 'id' => 'kmtarget','value' => set_value('kmtarget'), 'placeholder' => 'Km']); echo form_error('kmtarget');?>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Km Realisasi</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_input(['name' => 'kmrealisasi', 'id' => 'kmrealisasi','value' => set_value('kmrealisasi'), 'placeholder' => 'Km']); echo form_error('kmrealisasi');?>
			</div>
		</td>
	</tr>		
	<tr id="RowBBMDiajukan" style="display: none">
		<td align="left">
			<label class="control-label">BBM Diajukan</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_input(['name' => 'bbmdiajukan', 'id' => 'bbmdiajukan','value' => set_value('bbmdiajukan'), 'placeholder' => 'Liter']); echo form_error('bbmdiajukan');?>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Status Trayek</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control select">
			   	<?php
               		foreach($all_statustrayek->result() as $row)
               		{
                  		$array_statustrayek[$row->STATUSTRAYEK_ID] = $row->STATUSTRAYEK_NAMA;
               		}
               		echo form_dropdown('statustrayek',$array_statustrayek,set_value('statustrayek'));
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
