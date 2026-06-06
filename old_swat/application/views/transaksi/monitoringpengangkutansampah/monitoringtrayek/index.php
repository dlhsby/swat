<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>

<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li><a href="<?php echo base_url(); ?>">Home</a></li>
        <li><a href="<?php echo base_url(); ?>">Transaksi</a></li>
		<li><a href="<?php echo base_url(); ?>">Pengangkutan Sampah</a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/monitoringpengangkutansampah'; ?>">Monitoring</a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/monitoringpengangkutansampah/monitoringtransaksi'; ?>">Transaksi</a></li>
        <li><a href="<?php echo base_url().'index.php/transaksi/monitoringpengangkutansampah/monitoringdetailtransaksi'; ?>">Detail Transaksi</a></li>
        <li class="active"><a href="<?php echo base_url().'index.php/transaksi/monitoringpengangkutansampah/monitoringtrayek'; ?>">Trayek</a></li>
    </ul>
</nav>
</br>
<legend>Monitoring Trayek, Detail Transaksi Nomor <?php echo $detailTransaksiID ?></legend>
<table class="table hovered striped" >
	<?php echo anchor('transaksi/monitoringpengangkutansampah/tambahtrayek/'.$detailTransaksiID,'+ Tambah Trayek Baru'); ?>
	<thead>
		<tr>
			<th></th>
			<th>Detail Transaksi</th>
			<th>Trayek</th>
			<th>Nama Trayek</th>
			<th>Rute</th>
			<th>Waktu Target</th>
			<th>Waktu Realisasi</th>
			<th>KM Target</th>
			<th>KM Realisasi</th>
			<!--<th>Berat Kosong Kendaraan</th>-->
			<!--<th>Berat Kotor Timbangan</th>-->
			<th>Berat Bersih Sampah</th>
			<th>BBM Diajukan</th>
			<th>BBM Disetujui</th>
			<th>Status Trayek</th>
			<th>Keterangan</th>
		</tr>	
	</thead>
	<tbody>
		
		<?php
			if($all_trayek->result() ==NULL){
		?>
			<div class="notice bg-red fg-white">
				<h4>Peringatan!</h4>
				<p>Data yang Anda minta salah atau masih kosong</p>
			</div>
		<?php
			}
			else{
				foreach($all_trayek->result() as $row){
		?>
				<tr>
					<td></td>
					<td>
						<?php echo anchor("transaksi/monitoringpengangkutansampah/monitoringtrayek/".$row->DETAILTRANSAKSIANGKUTSAMPAH_ID,$row->DETAILTRANSAKSIANGKUTSAMPAH_ID); ?>
					</td>
					<td><?php echo($row->TRAYEK_ID); ?></td>
					<td><?php echo($row->TRAYEK_NAMA); ?></td>
					<td><?php echo($row->SPOT_ASAL_NAMA." Ke ".$row->SPOT_TUJUAN_NAMA); ?></td>	
					<td><?php echo($row->TRAYEK_WAKTUTARGET); ?></td>
					<td><?php echo($row->TRAYEK_WAKTUREALISASI); ?></td>
					<td><?php echo($row->TRAYEK_KMTARGET); ?></td>
					<td><?php echo($row->TRAYEK_KMREALISASI); ?></td>
					<!--<td><?php echo($row->TRAYEK_BERATKOSONGKENDARAAN); ?></td>
					<td><?php echo($row->TRAYEK_BERATKOTORTIMBANGAN); ?></td>-->
					<td><?php echo($row->TRAYEK_BERATBERSIHSAMPAH); ?></td>
					<td><?php echo($row->TRAYEK_JUMLAHISIBBMDIAJUKAN); ?></td>
					<td><?php echo($row->TRAYEK_JUMLAHISIBBMDISETUJUI); ?></td>
					<td><?php echo($row->STATUSTRAYEK_NAMA); ?></td>
					<td><?php echo($row->TRAYEK_KETERANGAN); ?></td>
				</tr>
		<?php
				}
			}
		?>
	</tbody>
</table>
