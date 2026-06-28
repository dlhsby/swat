<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		$('#haritransaksi').datetimepicker({
			mask:'9999-19-39',
			format:'Y-m-d',
			timepicker:false,
			closeOnDateSelect:true
			
		});
		$('#image_button').click(function(){
		  $('#haritransaksi').datetimepicker('show'); //support hide,show and destroy command
		});
		$("#pool").change(function(){		
			var poolID = $("#pool").val();
			console.log(poolID);
			$("#rowKendaraan").hide('fade');
			if(poolID==0){
				$("#kendaraan").empty();
			}
			else
			{				
				$.ajax({
	            	type : "POST",
	               	url  : "<?php echo base_url(); ?>index.php/transaksi/monitoringpengangkutansampah/getKendaraanByPool",
	               	data : "poolID=" + poolID,
	               	success: function(data){
	               		if(data.length>0){
							console.log(data);
							$("#kendaraan").html(data);	
						}
						else console.log("kosong");
	               		
	               	}
	            });                          	
			}
        });
    });
</script>
<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li><a href="<?php echo base_url(); ?>">Home</a></li>
        <li><a href="<?php echo base_url(); ?>">Transaksi</a></li>
		<li><a href="<?php echo base_url(); ?>">Pengangkutan Sampah</a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/monitoringpengangkutansampah'; ?>">Monitoring</a></li>
        <li><a href="<?php echo base_url().'index.php/transaksi/monitoringpengangkutansampah/monitoringtransaksi'; ?>">Transaksi</a></li>
		<li class="active"><a href="#">Tambah Transaksi</a></li>
    </ul>
</nav>
</br>
<?php 
	echo form_open('transaksi/monitoringpengangkutansampah/tambahtransaksi');
?>
	<legend>Tambah Transaksi Baru</legend>
	<table cellspacing="200" >
	<tr>
		<td align="left">
			<label class="control-label">Tanggal Transaksi</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php if($hariTransaksiTanggal!=''){				
					echo form_input(['name' => 'haritransaksi', 'id' => 'haritransaksi','value' => $hariTransaksiTanggal]); echo form_error('haritransaksi');
				}
				else 
					echo form_input(['name' => 'haritransaksi', 'id' => 'haritransaksi','value' => set_value('haritransaksi')]); echo form_error('haritransaksi');
				?>
				<span id="image_button" class="btn-date"></span>
			</div>		
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Lokasi Pool</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control select">
				<?php
					$array_pool[0] = '';
		       		foreach($all_pool->result() as $row)
		       		{
		          		$array_pool[$row->SPOT_ID] = "Pool ".$row->SPOT_NAMA;
		       		}
		       		echo form_dropdown('pool',$array_pool,set_value('pool'),'id="pool"');
	    		?>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Nomor Polisi</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control select">
				<?php
					$array_kendaraan = array();
               		echo form_dropdown('kendaraan',$array_kendaraan,'','id="kendaraan"');               
            	?>	
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Status Transaksi</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control select">
				<?php
               		foreach($all_statustransaksiangkutsampah->result() as $row)
               		{
                  		$array_statustransaksi[$row->STATUSTRANSAKSIANGKUTSAMPAH_ID] = $row->STATUSTRANSAKSIANGKUTSAMPAH_NAMA;
               		}
               		echo form_dropdown('statustransaksi',$array_statustransaksi,set_value('statustransaksi'));
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
