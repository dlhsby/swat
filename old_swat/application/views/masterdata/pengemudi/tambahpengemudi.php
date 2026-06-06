<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>

<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li><a href="<?php echo base_url(); ?>">Home</a></li>
        <li><a href="<?php echo base_url(); ?>">Masterdata</a></li>
		<li><a href="<?php echo base_url().'index.php/masterdata/pengemudi'; ?>">Pengemudi</a></li>
        <li class="active"><a href="#">Tambah Pengemudi</a></li>
    </ul>
</nav>
		<?php 
			echo form_open('masterdata/pengemudi/tambahpengemudi');
		?>
			<legend>Tambah Pengemudi Baru</legend>
			<table cellspacing="200" >
			<tr>
				<td align="left">
					<label class="control-label">Pool</label>			
				</td>
				<td width="50px" align="center">:
				</td>
				<td>
					<div class="input-control select">
					   	<?php
		               		foreach($all_pool->result() as $row)
		               		{
		                  		$array_pool[$row->SPOT_ID] = "Pool ".$row->SPOT_NAMA;
		               		}
		               		echo form_dropdown('pool',$array_pool,set_value('pool'));
		            	?>
					</div>
					
				</td>
			</tr>
			<tr>
				<td align="left">
					<label class="control-label">Status Kepegawaian</label>			
				</td>
				<td width="50px" align="center">:
				</td>
				<td>
					<div class="input-control select">
						<?php
		               		foreach($all_statuskepegawaian->result() as $row)
		               		{
		                  		$array_statuskepegawaian[$row->STATUSKEPEGAWAIAN_ID] = $row->STATUSKEPEGAWAIAN_NAMA;
		               		}
		               		echo form_dropdown('statuskepegawaian',$array_statuskepegawaian,set_value('statuskepegawaian'));
		            	?>	
					</div>
				</td>
			</tr>
			<tr>
				<td align="left">
					<label class="control-label">Nama Pengemudi</label>			
				</td>
				<td width="50px" align="center">:
				</td>
				<td>
					<div class="input-control text">
					    <?php echo form_input(['name' => 'nama', 'id' => 'nama','value' => set_value('nama'), 'placeholder' => 'Nama Pengemudi']); echo form_error('nama');?>
					    <button class="btn-clear"></button>
					</div>
					
				</td>
			</tr>			
			<tr>
				<td align="left">
					<label class="control-label">Nomor KTP</label>			
				</td>
				<td width="50px" align="center">:
				</td>
				<td>
					<div class="input-control text">
						<?php echo form_input(['name' => 'ktp', 'id' => 'ktp','value' => set_value('ktp'), 'placeholder' => '12 Digit Nomor KTP']); echo form_error('ktp');?>
					</div>
				</td>
			</tr>
			<tr>
				<td align="left">
					<label class="control-label">Alamat Asal</label>			
				</td>
				<td width="50px" align="center">:
				</td>
				<td>
					<div class="input-control text">
						<?php echo form_input(['name' => 'alamatasal', 'id' => 'alamatasal', 'value' => set_value('alamatasal'), 'placeholder' => 'Alamat Asal']); echo form_error('alamatasal');?>
					</div>
				</td>
			</tr>
			<tr>
				<td align="left">
					<label class="control-label">Alamat Domisili</label>			
				</td>
				<td width="50px" align="center">:
				</td>
				<td>
					<div class="input-control text">
				
						<?php echo form_input(['name' => 'alamatdomisili', 'id' => 'alamatdomisili', 'value' => set_value('alamatdomisili'), 'placeholder' => 'Alamat Domisili']); echo form_error('alamatdomisili');?>
					</div>
				</td>
			</tr>
			<tr>
				<td align="left">
					<label class="control-label">Tanggal Lahir</label>			
				</td>
				<td width="50px" align="center">:
				</td>
				<td>
					<div class="input-control text" data-role="datepicker" data-effect="slide" data-format="yyyy-mm-dd">
					    <?php echo form_input(['name' => 'tanggallahir', 'id' => 'tanggallahir', 'class' => 'form-control','style'=>'width:300px;', 'value' => set_value('tanggallahir'), 'placeholder' => 'Tanggal Lahir']); echo form_error('tanggallahir');?>
					    <span class="btn-date"></span>
					</div>
					
				</td>
			</tr>
			<tr>
				<td align="left">
					<label class="control-label">Kontak</label>			
				</td>
				<td width="50px" align="center">:
				</td>
				<td>
					<div class="input-control text">
						<?php echo form_input(['name' => 'kontak', 'id' => 'kontak', 'value' => set_value('kontak'), 'placeholder' => 'Kontak / HP']); echo form_error('kontak');?>
					</div>
				</td>
			</tr>
			<tr>
				<td align="left">
					<label class="control-label">Pelatihan Safety</label>			
				</td>
				<td width="50px" align="center">:
				</td>
				<td>
					<div class="input-control text">
						<?php echo form_input(['name' => 'pelatihansafety', 'id' => 'pelatihansafety','value' => 'BELUM', 'placeholder' => 'Pelatihan Safety']); echo form_error('pelatihansafety');?>
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
						<?php echo form_input(['name' => 'keterangan', 'id' => 'keterangan','value' => 'AKTIF', 'placeholder' => 'Keterangan']); echo form_error('keterangan');?>
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
