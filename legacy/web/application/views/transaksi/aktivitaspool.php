<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		$('#waktuAktivitas').datetimepicker({
			mask:'9999-19-39 29:59:59',
			format:'Y-m-d H:i:s'
			
		});
		$('#image_button').click(function(){
		  $('#waktuAktivitas').datetimepicker('show'); //support hide,show and destroy command
		});
		$("#pool").change(function(){		
			var poolID = $("#pool").val();
			var jenisAktivitas = $("#jenisAktivitas").val();
			console.log(poolID+" "+jenisAktivitas);
			if(poolID==0 && jenisAktivitas ==0){
				$("#kendaraan").empty();
			}
			else
			{
				if(jenisAktivitas == 1){
					kategoriRute = 1;
				}
				else if (jenisAktivitas == 2){
					kategoriRute = 5;
				}
				console.log(poolID+" "+kategoriRute);				
				$.ajax({
	            	type : "POST",
	               	url  : "<?php echo base_url(); ?>index.php/transaksi/aktivitaspool/getKendaraanByPool",
	               	data : "poolID=" + poolID+ "&kategoriRute=" + kategoriRute,
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
        <li class="active"><a href="#">Aktivitas Pool</a></li>
    </ul>
</nav>
</br>

<?php 
	echo form_open('transaksi/aktivitaspool');
?>
	<legend>Aktivitas Pool Pengangkutan Sampah DKP</legend>
	<table>
	
	<tr>
		<td align="left">
			<label class="control-label">Jenis Aktivitas</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control select">
				<?php
					$array_jenisAktivitas[0] = "";
	       			$array_jenisAktivitas[1] = "Keberangkatan Dari Pool";
					$array_jenisAktivitas[2] = "Kembali Ke Pool";
	       			echo form_dropdown('jenisAktivitas',$array_jenisAktivitas,set_value('jenisAktivitas'),'id="jenisAktivitas"');
	    		?>
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
			<label class="control-label">Waktu Realisasi Aktivitas</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
			    <?php echo form_input(['name' => 'waktuAktivitas', 'id' => 'waktuAktivitas','value' => set_value('waktuAktivitas')]); echo form_error('waktuAktivitas');?>
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
