<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li><a href="<?php echo base_url(); ?>">Home</a></li>
        <li><a href="<?php echo base_url(); ?>">Transaksi</a></li>
		<li><a href="<?php echo base_url(); ?>">Pengangkutan Sampah</a></li>
		<li class="active"><a href="<?php echo base_url().'index.php/transaksi/monitoringpengangkutansampah'; ?>">Monitoring</a></li>
    </ul>
</nav>
</br>
<legend>Monitoring Pengangkutan Sampah</legend>
<table class="table hovered" >					
	<thead>
		<tr>
			<th></th>
			<th>Id</th>
			<th>Tanggal Hari Transaksi</th>
			<th>Status Hari Transaksi</th>
		</tr>	
	</thead>
	<tbody>
		
		<?php
			if($all_hariTransaksi->result() ==NULL){
		?>
			<div class="notice bg-red fg-white">
				<h4>Peringatan!</h4>
				<p>Data yang Anda minta salah atau masih kosong</p>
			</div>
		<?php
			}
			else{
				foreach($all_hariTransaksi->result() as $row){
		?>
				<tr>
					<td></td>
					<td>
						<?php echo anchor("transaksi/monitoringpengangkutansampah/monitoringtransaksi/".$row->HARITRANSAKSI_TANGGAL,$row->HARITRANSAKSI_ID); ?>
					</td>
					<td>
						<?php echo anchor("transaksi/monitoringpengangkutansampah/monitoringtransaksi/".$row->HARITRANSAKSI_TANGGAL,$row->HARITRANSAKSI_TANGGAL); ?>
					</td>				
					<td><?php echo($row->STATUSHARITRANSAKSI_NAMA); ?></td>
				</tr>
		<?php
				}
			}
		?>
	</tbody>
</table>
