<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<legend>Master Data Kendaraan</legend>
<table class="table striped hovered" >					
<thead>
	<tr>
		<th></th>
		<th>Kategori</th>
		<th>Nomor Polisi</th>
		<th>Pool</th>
		<th>Sumber Sampah</th>
		<th>KM Terkini</th>
		<th>Status</th>
		<th>Keterangan</th>
	</tr>	
</thead>
<tbody>
	
	<?php
		if($all_kendaraan->result() ==NULL){
	?>
		<div class="notice bg-red fg-white">
			<h4>Peringatan!</h4>
			<p>Data yang Anda minta salah atau masih kosong</p>
		</div>
	<?php
		}
		else{
			foreach($all_kendaraan->result() as $row){
			if($row->STATUSKENDARAAN_ID ==3){
				?>
			<tr class="error">
				<?php
			}
			else{
				?>
			<tr>
				<?php
			}
	?>
			
				<td></td>
				<td><?php echo($row->APLIKASIKENDARAAN_NAMA." ".$row->KATEGORIKENDARAAN_MERK); ?></td>
				<td><?php echo($row->KENDARAAN_NOMORPOLISI); ?></td>
				<td><?php echo($row->SPOT_NAMA); ?></td>
				<td><?php echo($row->KATEGORISUMBERSAMPAH_NAMA); ?></td>
				<td><?php echo($row->KENDARAAN_KMTERKINI); ?></td>
				<td><?php echo($row->STATUSKENDARAAN_NAMA); ?></td>
				<td><?php echo($row->KENDARAAN_KETERANGAN); ?></td>
			</tr>
	<?php
			}
		}
	?>
</tbody>
</table>