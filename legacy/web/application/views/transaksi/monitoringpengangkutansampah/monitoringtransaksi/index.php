<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li><a href="<?php echo base_url(); ?>">Home</a></li>
        <li><a href="<?php echo base_url(); ?>">Transaksi</a></li>
		<li><a href="<?php echo base_url(); ?>">Pengangkutan Sampah</a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/monitoringpengangkutansampah'; ?>">Monitoring</a></li>
        <li class="active"><a href="#">Transaksi</a></li>
    </ul>
</nav>
</br>
<legend>Monitoring Transaksi Pengangkutan Sampah, Tanggal <?php echo $hariTransaksiTanggal ?></legend>
<table class="table hovered striped" >
	<?php echo anchor('transaksi/monitoringpengangkutansampah/tambahtransaksi/'.$hariTransaksiTanggal,'+ Tambah Transaksi Baru'); ?>
	<thead>
		<tr>
			<th></th>
			<th>Tanggal Transaksi</th>
			<th>Id</th>
			<th>Nomor Polisi</th>
			<th>Nama Kendaraan</th>
			<th>Kode</th>
			<th>Status</th>
			<th>Keterangan</th>
		</tr>	
	</thead>
	<tbody>
		
		<?php
			if($all_transaksi->result() ==NULL){
		?>
			<div class="notice bg-red fg-white">
				<h4>Peringatan!</h4>
				<p>Data yang Anda minta salah atau masih kosong</p>
			</div>
		<?php
			}
			else{
				foreach($all_transaksi->result() as $row){
		?>
				<tr>
					<td></td>
					<td>
						<?php echo $row->HARITRANSAKSI_TANGGAL; ?>
					</td>
					<td>
						<?php echo anchor("transaksi/monitoringpengangkutansampah/monitoringdetailtransaksi/".$row->TRANSAKSIANGKUTSAMPAH_ID,$row->TRANSAKSIANGKUTSAMPAH_ID); ?>
					</td>
					<td><?php echo($row->KENDARAAN_NOMORPOLISI); ?></td>
					<td><?php echo($row->APLIKASIKENDARAAN_NAMA." ".$row->KATEGORIKENDARAAN_MERK); ?></td>
					<td><?php echo($row->KATEGORISUMBERSAMPAH_KODE); ?></td>
					<td><?php echo($row->STATUSTRANSAKSIANGKUTSAMPAH_NAMA); ?></td>
					<td><?php echo($row->TRANSAKSIANGKUTSAMPAH_KETERANGAN); ?></td>
				</tr>
		<?php
				}
			}
		?>
	</tbody>
</table>
