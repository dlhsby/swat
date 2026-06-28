<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<legend>Master Data Pengemudi</legend>
<table class="table striped hovered" >
<?php echo anchor('masterdata/pengemudi/tambahpengemudi','+ Tambah Pengemudi Baru'); ?>
<thead>
	<tr>
		<th>NIK</th>
		<th>Pool</th>
		<th>Nama Pengemudi</th>
		<th>Kontak Pengemudi</th>
		<th>Alamat Domisili</th>
	</tr>	
</thead>
<tbody>
	
	<?php
		if($all_pengemudi->result() ==NULL){
	?>
		<div class="notice bg-red fg-white">
			<h4>Peringatan!</h4>
			<p>Data yang Anda minta salah atau masih kosong</p>
		</div>
	<?php
		}
		else{
			foreach($all_pengemudi->result() as $row){
	?>
			<tr>
				<td><?php echo($row->PENGEMUDI_NOMORKTP); ?></td>
				<td><?php echo($row->SPOT_NAMA); ?></td>
				<td><?php echo($row->PENGEMUDI_NAMA); ?></td>				
				<td><?php echo($row->PENGEMUDI_KONTAK); ?></td>
				<td><?php echo($row->PENGEMUDI_ALAMATDOMISILI); ?></td>
			</tr>
	<?php
			}
		}
	?>
</tbody>
</table>