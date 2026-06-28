<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var site_url = "<?php echo site_url()?>";
		var base_url = "<?php echo base_url() ?>";
		$('#waktu').datetimepicker({
			mask:'9999-19-39 29:59:59',
			format:'Y-m-d H:i:s'
			
		});
		$('#image_button').click(function(){
		  $('#waktu').datetimepicker('show'); //support hide,show and destroy command
		});
		$('#tanggalTransaksi').datetimepicker({
			mask: '9999-19-39',
	        format: 'Y-m-d',
	        timepicker: false,
	        closeOnDateSelect: true
		});
		$('#image_button_tanggalTransaksi').click(function(){
		  $('#tanggalTransaksi').datetimepicker('show'); //support hide,show and destroy command
		});
		$('.autocomplete').autocomplete({
			serviceUrl: site_url+'/transaksi/pengisianbahanbakar/getkendaraan',
			minChars:0
		});
		$('#aplikasiKendaraan').on('change', function (e) {
            var optionSelected = $("option:selected", this);
            var valueSelected = this.value;
            console.log("value aplikasiKendaraan selected : " + valueSelected);
            if (valueSelected == 0) {
                $("#kategoriKendaraan").empty();
                $('#containerKategoriKendaraan1').hide('fade');
                $('#containerKategoriKendaraan2').hide('fade');
                $('#containerKategoriKendaraan3').hide('fade');
            }
            else {
                $('#containerKategoriKendaraan1').show('fade');
                $('#containerKategoriKendaraan2').show('fade');
                $('#containerKategoriKendaraan3').show('fade');
                $.ajax({
                    type: "POST",
                    url: "<?php echo base_url(); ?>index.php/transaksi/pengisianbahanbakar/getKategoriKendaraanByAplikasi",
                    data: "aplikasiKendaraanID=" + valueSelected,
                    success: function (data) {
                        if (data.length > 0) {
                            console.log(data);
                            $("#kategoriKendaraan").html(data);
                        }
                        else {
							$("#kategoriKendaraan").empty();
                			$('#containerKategoriKendaraan1').hide('fade');
			                $('#containerKategoriKendaraan2').hide('fade');
			                $('#containerKategoriKendaraan3').hide('fade');
							console.log("kosong");
						}

                    }
                });
            }
        });  
		$('#PenggunaanBahanBakarTableContainer').jtable({
	        title: 'Penggunaan Bahan Bakar',
	        paging: true,
	        pageSize: 10,
	        sorting: true,
	        defaultSorting: 'TRAYEK_WAKTUENTRIREALISASI DESC',
	        columnResizable: true, //Actually, no need to set true since it's default
	        columnSelectable: true, //Actually, no need to set true since it's default
	        saveUserPreferences: true, //Actually, no need to set true since it's default
	        actions: {
	            listAction: site_url + '/transaksi/pengisianbahanbakar/getpenggunaanbahanbakarbyfilter',
				updateAction: site_url+'/transaksi/pengisianbahanbakar/updatetrayekpenggunaanbahanbakar',
				deleteAction: site_url+'/transaksi/pengisianbahanbakar/deletetrayekpenggunaanbahanbakar'
	        },
			toolbar: {
			    items: [{
			        icon: base_url+'/assets/images/excel.png',
			        text: 'Cetak Laporan ke Excel',
			        click: function () {
			            var url = '<?php echo base_url()."index.php/laporan/bahanbakar/cetaklaporanbahanbakartanggal?tanggal="?>'+$('#tanggalTransaksi').val()+'&awal='+$('#waktuReportAwal').val()+'&akhir='+$('#waktuReportAkhir').val();
						window.open(url);
			        }
			    }]
			},
	        fields: {
	            HARITRANSAKSI_TANGGAL: {
	                title: 'Tanggal',
					edit: false
	            },
	            TRAYEK_ID: {
	                key: true,
	                title: 'ID',
	                list: false,
					edit: false,
	            },
	            KENDARAAN_NOMORPOLISI: {
	                title: 'Nopol'
	            },
	            APLIKASIKENDARAAN_NAMA: {
	                title: 'Aplikasi',
					edit: false
	            },
	            KATEGORIKENDARAAN_MERK: {
	                title: 'Kategori',
					edit: false
	            },
	            BAHANBAKAR_NAMA: {
	                title: 'Bahan Bakar',
					edit: false
	            },
	            JUMLAHBBMDIAJUKAN: {
	                title: 'BBM Diajukan',
					edit: false
	            },
	            JUMLAHBBMDISETUJUI: {
	                title: 'BBM Disetujui'
	            },
				TRAYEK_KMREALISASI: {
	                title: 'KM Pengisian'
	            },
				TRAYEK_WAKTUREALISASI: {
	                title: 'Waktu Pengisian'
	            },
				TRAYEK_WAKTUENTRIREALISASI:{
					title: 'Waktu Entri',
					edit: false
				},
				TRAYEK_KETERANGAN:{
					title: 'Keterangan'
				}
	        },
			formCreated: function (event, data2) 
            {										
				var $input_nomorPolisi = data2.form.find ('input[name="KENDARAAN_NOMORPOLISI"]');
				$input_nomorPolisi.prop('disabled', true);
				
				var $input_waktuRealisasi = data2.form.find ('input[name="TRAYEK_WAKTUREALISASI"]');
				$input_waktuRealisasi.datetimepicker({
					mask:'9999-19-39 29:59:59',
					format:'Y-m-d H:i:s'	
				});
            },
			recordUpdated: function (event, data2) {
				$('#PenggunaanBahanBakarTableContainer').jtable('reload');
			}
	    });
		$('#LoadRecordsButton').click(function (e) {
	        e.preventDefault();
	        console.log("Tanggal: " + $('#tanggalTransaksi').val() + " , Nopol: " + $('#nopolKendaraan').val() + " , Aplikasi: " + $('#aplikasiKendaraan').val() + " ,Kategori: " + $('#kategoriKendaraan').val() + " , Bahan Bakar: " + $('#bahanBakar').val()+ " , Status: " + $('#statusTrayek').val());
	        $('#PenggunaanBahanBakarTableContainer').jtable('load', {	            
	            tanggalTransaksi: $('#tanggalTransaksi').val(),
	            nopolKendaraan: $('#nopolKendaraan').val(),
	            aplikasiKendaraan: $('#aplikasiKendaraan').val(),
	            kategoriKendaraan: $('#kategoriKendaraan').val(),
	            bahanBakar: $('#bahanBakar').val(),
	            statusTrayek: $('#statusTrayek').val()
	        });
	    });
	    $('#LoadRecordsButton').click();
		//untuk print
		$('#waktuReportAwal').datetimepicker({
			mask:'9999-19-39 29:59:59',
			format:'Y-m-d H:i:s'
			
		});
		$('#btnReportAwalImage').click(function(){
		  $('#waktuReportAwal').datetimepicker('show'); //support hide,show and destroy command
		});
		$('#waktuReportAkhir').datetimepicker({
			mask:'9999-19-39 29:59:59',
			format:'Y-m-d H:i:s'
			
		});
		$('#btnReportAkhirImage').click(function(){
		  $('#waktuReportAkhir').datetimepicker('show'); //support hide,show and destroy command
		});
	});
</script>
<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li><a href="<?php echo base_url(); ?>">Home</a></li>
        <li><a href="<?php echo base_url(); ?>">Transaksi</a></li>
        <li class="active"><a href="#">Pengisian Bahan Bakar</a></li>
    </ul>
</nav>
</br>
<?php 
	echo form_open('transaksi/pengisianbahanbakar');
?>
	<legend>Pengisian Bahan Bakar Angkutan DKP</legend>
	<table cellspacing="200" >
	<tr>
		<td align="left">
			<label class="control-label">Nomor Polisi</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_input(['name' => 'kendaraan', 'id' => 'kendaraan', 'class' => 'autocomplete','style'=>'width:300px;', 'value' => set_value('kendaraan'), 'placeholder' => 'Nomor Polisi']); echo form_error('kendaraan');?>
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
			<label class="control-label">Jumlah Isi BBM</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_input(['name' => 'bbm', 'id' => 'bbm', 'class' => 'form-control','style'=>'width:300px;', 'value' => set_value('bbm'), 'placeholder' => 'Liter']); echo form_error('bbm');?>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Waktu Pengisian</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
			    <?php echo form_input(['name' => 'waktu', 'id' => 'waktu','value' => set_value('waktu')]); echo form_error('waktu');?>
				<span id="image_button" class="btn-date"></span>
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
			    <?php echo form_input(['name' => 'keterangan', 'id' => 'keterangan','value' => set_value('keterangan')]); echo form_error('keterangan');?>
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
</br>
</br>
<legend>Daftar Pengisian Bahan Bakar Hari Ini</legend>
<div class="filtering">
    <form>
		<table width="100%" align="center" >
			<tr valign="middle">
				<td width="10%" align="right" >Tanggal</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left" valign="middle">
					<div class="input-control text" style="width: 150px"> 
				        <input type="text" name="tanggalTransaksi" id="tanggalTransaksi" value="<?php echo $tanggalHariIni ?>"/>
                        <span id="image_button_tanggalTransaksi" class="btn-date"></span>
					</div>
				</td>
				<td width="10%" align="right">Bahan Bakar</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left">
					<div class="input-control select" style="width: 150px">
	                    <select id="bahanBakar" name="bahanBakar">
	                        <option selected="selected" value="0">All Bahan Bakar</option>
	                        <?php
	                        	foreach ($all_bahanbakar->result() as $row) {
	                            	echo '<option value="' . $row->BAHANBAKAR_NAMA . '">' . $row->BAHANBAKAR_NAMA . '</option>';
	                        	}
	                        ?>
	                    </select>
					</div>
				</td>
				<td width="10%" align="right">Status</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left">
					<div class="input-control select" style="width: 150px"> 
				        <select id="statusTrayek" name="statusTrayek">
				            <option selected="selected" value="0">All Status</option>
							<?php
					       		foreach($all_statustrayek->result() as $row)
					       		{
									echo '<option value="'.$row->STATUSTRAYEK_ID.'">'.$row->STATUSTRAYEK_NAMA.'</option>';
					       		}
				    		?>
				        </select>
					</div>
				</td>
			</tr>
			<tr valign="middle">
				<td width="10%" align="right" >Nopol</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left" valign="middle">
					<div class="input-control text" style="width: 150px;vertical-align: middle;" >
						<input type="text" name="nopolKendaraan" id="nopolKendaraan" placeholder="Nomor Polisi" />
					</div>
				</td>
				<td width="10%" align="right">Aplikasi</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left">
					<div class="input-control select" style="width:  150px" > 
				        <select id="aplikasiKendaraan" name="aplikasiKendaraan">
				            <option selected="selected" value="0">All Aplikasi</option>
							<?php
					       		foreach($all_aplikasikendaraan->result() as $row)
					       		{
									echo '<option value="'.$row->APLIKASIKENDARAAN_ID.'">'.$row->APLIKASIKENDARAAN_NAMA.'</option>';
					       		}
				    		?>
				        </select>
					</div>
				</td>
				<td width="10%" align="right"><div id="containerKategoriKendaraan1" style="display: none">Kategori</div></td>
				<td width="2%" align="center"><div id="containerKategoriKendaraan2" style="display: none">:</div></td>
				<td width="20%" align="left">
					<div id="containerKategoriKendaraan3" class="input-control select" style="width:  150px;display: none"> 
				        <select id="kategoriKendaraan" name="kategoriKendaraan">
		                </select>
					</div>
				</td>
			</tr>
			<tr valign="middle">
			<td></td>
			<td></td>
				<td colspan="3">
					<button class="primary large" type="submit" id="LoadRecordsButton">Load records</button>
				</td>
			</tr>
			<tr>
				<td></td><td></td>
				<td><strong>Cetak Laporan</strong></td>
				
				<td width="10%" align="right" >Waktu Awal</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left" valign="middle">
					<div class="input-control text" style="width: 200px"> 
				        <input type="text" name="waktuReportAwal" id="waktuReportAwal" value="<?php echo $tanggalHariIni ?>"/>
                        <span id="btnReportAwalImage" class="btn-date"></span>
					</div>
				</td>
				<td width="10%" align="right" >Waktu Akhir</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left" valign="middle">
					<div class="input-control text" style="width: 200px"> 
				        <input type="text" name="waktuReportAkhir" id="waktuReportAkhir" value="<?php echo $tanggalHariIni ?>"/>
                        <span id="btnReportAkhirImage" class="btn-date"></span>
					</div>
				</td>
			</tr>
		</table>	
    </form>
</div>
<div id="PenggunaanBahanBakarTableContainer"></div>