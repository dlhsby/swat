<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>

<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li><a href="<?php echo base_url(); ?>">Home</a></li>
        <li><a href="<?php echo base_url(); ?>">Transaksi</a></li>
		<li><a href="<?php echo base_url(); ?>">Pengangkutan Sampah</a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/monitoringpengangkutansampah'; ?>">Monitoring</a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/monitoringpengangkutansampah/monitoringtransaksi'; ?>">Transaksi</a></li>
        <li class="active"><a href="<?php echo base_url().'index.php/transaksi/monitoringpengangkutansampah/monitoringdetailtransaksi'; ?>">Detail Transaksi</a></li>
    </ul>
</nav>
</br>
<legend>Monitoring Detail Transaksi, Transaksi Nomor <?php echo $transaksiID ?></legend>
<table class="table hovered striped" >
	<?php echo anchor('transaksi/monitoringpengangkutansampah/tambahdetailtransaksi/'.$transaksiID,'+ Tambah Detail Transaksi Baru'); ?>
	<thead>
		<tr>
			<th></th>
			<th>Transaksi</th>
			<th>Detail Transaksi</th>
			<th>Sopir</th>
			<th>KM Target Berangkat</th>
			<th>KM Realisasi Berangkat</th>
			<th>KM Target Kembali</th>
			<th>KM Realisasi Kembali</th>
			<th>Waktu Target Berangkat</th>
			<th>Waktu Realisasi Berangkat</th>
			<th>Waktu Target Kembali</th>
			<th>Waktu Realisasi Kembali</th>
			<th>Status</th>
			<th>Keterangan</th>
		</tr>	
	</thead>
	<tbody>
		
		<?php
			if($all_detailtransaksi->result() ==NULL){
		?>
			<div class="notice bg-red fg-white">
				<h4>Peringatan!</h4>
				<p>Data yang Anda minta salah atau masih kosong</p>
			</div>
		<?php
			}
			else{
				foreach($all_detailtransaksi->result() as $row){
		?>
				<tr>
					<td></td>
					<td><?php echo($row->TRANSAKSIANGKUTSAMPAH_ID); ?></td>
					<td>
						<?php echo anchor("transaksi/monitoringpengangkutansampah/monitoringtrayek/".$row->DETAILTRANSAKSIANGKUTSAMPAH_ID,$row->DETAILTRANSAKSIANGKUTSAMPAH_ID); ?>
					</td>	
					<td><?php echo($row->PENGEMUDI_NAMA); ?></td>
					<td><?php echo($row->DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETBERANGKATKANDANG); ?></td>
					<td><?php echo($row->DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMREALISASIBERANGKATKANDANG); ?></td>
					<td><?php echo($row->DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETKEMBALIKANDANG); ?></td>
					<td><?php echo($row->DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMREALISASIKEMBALIKANDANG); ?></td>
					<td><?php echo($row->DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETBERANGKATKANDANG); ?></td>
					<td><?php echo($row->DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIBERANGKATKANDANG); ?></td>
					<td><?php echo($row->DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETKEMBALIKANDANG); ?></td>
					<td><?php echo($row->DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIKEMBALIKANDANG); ?></td>
					<td><?php echo($row->STATUSDETAILTRANSAKSIANGKUTSAMPAH_NAMA); ?></td>
					<td><?php echo($row->DETAILTRANSAKSIANGKUTSAMPAH_KETERANGAN); ?></td>
				</tr>
		<?php
				}
			}
		?>
	</tbody>
</table>
