<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var site_url = "<?php echo site_url()?>";
		var base_url = "<?php echo base_url()?>";
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
		$('#kendaraan').autocomplete({
			serviceUrl: site_url+'/transaksi/pembuangansampah/getkendaraan',
			minChars:0
		});
		$('#nopolKendaraan').autocomplete({
			serviceUrl: site_url+'/transaksi/pembuangansampah/getkendaraan',
			minChars:0
		});
		$('#tps').autocomplete({
			serviceUrl: site_url+'/transaksi/pembuangansampah/gettps',
			minChars:0
		});
		$('#beratkotor').keyup(function() {
			$('#beratbersih').val($('#beratkotor').val()-$('#beratkosong').val());
		});
		$('#beratkosong').keyup(function() {
			$('#beratbersih').val($('#beratkotor').val()-$('#beratkosong').val());
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
                    url: "<?php echo base_url(); ?>index.php/transaksi/pembuangansampah/getKategoriKendaraanByAplikasi",
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

		$('#PembuanganSampahTableContainer').jtable({
	        title: 'Pembuangan Sampah',
	        paging: true,
	        pageSize: 10,
	        sorting: true,
	        defaultSorting: 'TRAYEK_WAKTUREALISASI DESC',
	        columnResizable: true, //Actually, no need to set true since it's default
	        columnSelectable: true, //Actually, no need to set true since it's default
	        saveUserPreferences: true, //Actually, no need to set true since it's default
	        actions: {
	            listAction: site_url + '/transaksi/pembuangansampah/getpembuangansampahbyfilter',
				updateAction: site_url+'/transaksi/pembuangansampah/updatetrayekpembuangansampah',
				deleteAction: site_url+'/transaksi/pembuangansampah/deletetrayekpembuangansampah'
	        },
			toolbar: {
			    items: [
			    	{
				        icon: base_url+'/assets/images/excel.png',
				        text: 'Export to Excel',
				        click: function () {
				            var url = '<?php echo base_url()."index.php/laporan/tonase/cetaklaporantonase_sehari?tanggal="?>'+$('#tanggalTransaksi').val();
							window.open(url);
				        }
			    	},
			    	{
				        icon: base_url+'/assets/images/pdf.png',
				        text: 'Export to PDF',
				        click: function () {
				            var url = '<?php echo base_url()."index.php/laporan/tonase/cetaklaporantonasepdf?tanggal="?>'+$('#tanggalTransaksi').val();
							window.open(url);
				        }
			    	}
			    ]
			},
	        fields: {
				URUTANPEMBUANGAN:{
					title: 'No.',
					sorting: false,
					edit: false,
                    create: false
				},
	            HARITRANSAKSI_TANGGAL: {
	                title: 'Tanggal',
	                edit: false
	            },
	            TRAYEK_ID: {
	                key: true,
	                title: 'ID',
	                visibility : 'hidden'
	            },
	            KENDARAAN_NOMORPOLISI: {
	                title: 'Nopol',
					inputClass: 'validate[required]'
	            },
	            APLIKASIKENDARAAN_NAMA: {
	                title: 'Aplikasi',
	                edit: false
	            },
	            KATEGORIKENDARAAN_MERK: {
	                title: 'Kategori',
	                edit: false
	            },
	            SPOT_ASAL_NAMA: {
	                title: 'TPS',
					inputClass: 'validate[required]'
	            },
	            TRAYEK_BERATKOTORTIMBANGAN: {
	                title: 'Berat Kotor Timbangan',
					inputClass: 'validate[required]'
	            },
	            TRAYEK_BERATKOSONGKENDARAAN: {
	                title: 'Berat Kosong Kendaraan',
					inputClass: 'validate[required]'
	            },
	            TRAYEK_BERATBERSIHSAMPAH: {
	                title: 'Berat Bersih Sampah',
					inputClass: 'validate[required]'
	            },
				TRAYEK_KMREALISASI: {
	                title: 'KM Pembuangan',
	                visibility : 'hidden'
	            },
				TRAYEK_WAKTUREALISASI: {
	                title: 'Waktu Pembuangan',
					inputClass: 'validate[required]'
	            },
				TRAYEK_WAKTUENTRIREALISASI:{
					title: 'Waktu Entry',
					visibility : 'hidden',
	                edit: false
				},
				TRAYEK_KETERANGAN:{
					title: 'Keterangan',
					visibility : 'hidden'
				},
				PENGGUNA_NAMA:{
					title: 'Pengentri',
					visibility : 'hidden',
					sorting: false,
					edit: false,
                    create: false
				},
				CAPTURE_CCTVTPA:{
					title: 'CCTV TPA',
					sorting: false,
                    edit: false,
                    create: false,
                    width: '3%',
                    display: function (trayekTPAData) {
                        var $iconCCTVTPA = $('<center><span class="icon-screen fg-cyan large" title="Klik untuk melihat bukti capture CCTV TPA"></span></center>');
                        $iconCCTVTPA.click(function () {
                        	$.Dialog({
						        overlay: true,
						        shadow: true,
						        flat: false,
						        title: 'CCTV TPA',
						        content: '',
						        width: 680,
								height: 540,
						       	padding: 10,
						        onShow: function(_dialog){
						        	var trayekID = trayekTPAData.record.TRAYEK_ID;
						        	console.log('trayekID : '+trayekID);
						        	//var dokumentasiTrayek = [];
						        	var content = '<center><div class="carousel" id="carousel2">';
						        	$.ajax({
					                    type: "POST",
					                    url: "<?php echo base_url(); ?>index.php/transaksi/pembuangansampah/getDokumentasiTrayekByTrayekID",
					                    data: "trayekID=" + trayekID,
					                    success: function (data) {
					                        if (data.length > 0) {
					                            console.log(data);
					                            content += data;
					                            console.log("separate");
					                            console.log(content);
					                            $.Dialog.title("Captured CCTV TPA");
						                        $.Dialog.content(content);
						                        $("#carousel2").carousel({
						                        	auto: false,
										            effect: 'fade',
										            controls: true,
										            width: 640,
										            height: 480,
										            markers: {
										                show: true
										            }
										        });
					                        }
					                        else {
												console.log("kosong");
											}

					                    }
					                });


						        }
						    });
                        });
                        return $iconCCTVTPA;
					}
				}
	        },
			formCreated: function (event, data)
            {
				var $input_nomorPolisi = data.form.find ('input[name="KENDARAAN_NOMORPOLISI"]');
				/*$input_nomorPolisi.autocomplete({
					serviceUrl: site_url+'/transaksi/pembuangansampah/getkendaraan',
					minChars:0
				});*/
				$input_nomorPolisi.prop('disabled', true);

				var $input_namaTPS = data.form.find ('input[name="SPOT_ASAL_NAMA"]');
				$input_namaTPS.autocomplete({
					serviceUrl: site_url+'/transaksi/pembuangansampah/gettps',
					minChars:0
				});

				var $input_waktuRealisasi = data.form.find ('input[name="TRAYEK_WAKTUREALISASI"]');
				$input_waktuRealisasi.datetimepicker({
					mask:'9999-19-39 29:59:59',
					format:'Y-m-d H:i:s'
				});

				data.form.validationEngine();
            },
            formSubmitting: function (event, data) {
                return data.form.validationEngine('validate');
            },
            formClosed: function (event, data) {
                data.form.validationEngine('hide');
                data.form.validationEngine('detach');
            }
	    });
		$('#LoadRecordsButton').click(function (e) {
	        e.preventDefault();
	        console.log("Tanggal: " + $('#tanggalTransaksi').val() + " , Nopol: " + $('#nopolKendaraan').val() + " , Aplikasi: " + $('#aplikasiKendaraan').val() + " ,Kategori: " + $('#kategoriKendaraan').val() + " , TPS: " + $('#tpsList').val()+ " , Status: " + $('#statusTrayek').val());
	        $('#PembuanganSampahTableContainer').jtable('load', {
	            tanggalTransaksi: $('#tanggalTransaksi').val(),
	            nopolKendaraan: $('#nopolKendaraan').val(),
	            aplikasiKendaraan: $('#aplikasiKendaraan').val(),
	            kategoriKendaraan: $('#kategoriKendaraan').val(),
	            tpsList: $('#tpsList').val(),
	            statusTrayek: $('#statusTrayek').val()
	        });
	    });
	    $('#LoadRecordsButton').click();
	});
</script>
<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li><a href="<?php echo base_url(); ?>">Home</a></li>
        <li><a href="<?php echo base_url(); ?>">Transaksi</a></li>
        <li class="active"><a href="#">Pembuangan Sampah</a></li>
    </ul>
</nav>
</br>

<?php
	echo form_open_multipart('transaksi/pembuangansampah','class="form-horizontal"');
?>
	<legend>Pembuangan Sampah DKP di TPA</legend>
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
			<label class="control-label">TPS Asal Sampah</label>
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_input(['name' => 'tps', 'id' => 'tps', 'class' => 'autocomplete','style'=>'width:300px;', 'value' => set_value('tps'), 'placeholder' => 'Nama TPS']); echo form_error('tps');?>
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
				<?php echo form_input(['name' => 'km', 'id' => 'km', 'class' => 'form-control','style'=>'width:300px;', 'value' => set_value('km',-1), 'placeholder' => 'Kilometer']); echo form_error('km');?>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Berat Kotor Timbangan</label>
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_input(['name' => 'beratkotor', 'id' => 'beratkotor', 'class' => 'form-control','style'=>'width:300px;', 'value' => set_value('beratkotor'), 'placeholder' => 'Kg']); echo form_error('beratkotor');?>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Berat Kosong Kendaraan</label>
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_input(['name' => 'beratkosong', 'id' => 'beratkosong', 'class' => 'form-control','style'=>'width:300px;', 'value' => set_value('beratkosong'), 'placeholder' => 'Kg']); echo form_error('beratkosong');?>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Berat Bersih Sampah</label>
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_input(['name' => 'beratbersih', 'id' => 'beratbersih', 'class' => 'form-control','style'=>'width:300px;', 'value' => set_value('beratbersih',0), 'placeholder' => 'Kg', 'readonly'=>'true']); echo form_error('beratbersih');?>
			</div>
		</td>
	</tr>
	<tr style="display: none">
		<td align="left">
			<label class="control-label">Volume Sampah</label>
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_input(['name' => 'volume', 'id' => 'volume', 'class' => 'form-control','style'=>'width:300px;', 'value' => set_value('volume'), 'placeholder' => 'M3']); echo form_error('volume');?>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Waktu Penimbangan</label>
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
			    <?php echo form_input(['name' => 'keterangan', 'id' => 'keterangan','value' => set_value('keterangan'),'placeholder' => 'Keterangan']); echo form_error('keterangan');?>
			</div>
		</td>
	</tr>
	<!--<tr>
		<td align="left">
			<label class="control-label">Capture Nopol</label>
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control file">
			    <?php echo form_upload(['name' => 'userfile[]', 'id' => 'captureNopol','value' => set_value('captureNopol')]);?>
				<span id="image_button_captureNopol" class="btn-file"></span>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Capture Tonase</label>
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control file">
			    <?php echo form_upload(['name' => 'userfile[]', 'id' => 'captureTonase','value' => set_value('captureTonase')]); ?>
				<span id="image_button_captureTonase" class="btn-file"></span>
			</div>
		</td>
	</tr>-->
	<tr>
		<td></td>
		<td></td>
		<td>
			<button class="btn btn-primary" type="submit" value="upload">Simpan</button>
		</td>
	</tr>
	</table>
<?php
	echo form_close();
?>
</br>
</br>
<legend>Daftar Pembuangan Sampah Hari Ini</legend>
<div class="filtering">
    <form>
		<table width="100%" align="center">
			<tr valign="middle">
				<td width="10%" align="right" >Tanggal</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left" valign="middle">
					<div class="input-control text" style="width: 150px">
				        <input type="text" name="tanggalTransaksi" id="tanggalTransaksi" value="<?php echo $tanggalHariIni ?>"/>
                        <span id="image_button_tanggalTransaksi" class="btn-date"></span>
					</div>
				</td>
				<td width="10%" align="right">TPS</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left">
					<div class="input-control select" style="width: 150px">
					<select id="tpsList" name="tpsList">
	                        <option selected="selected" value="0">All TPS</option>
	                        <?php
	                        	foreach ($all_TPS->result() as $row) {
	                            	echo '<option value="' . $row->SPOT_ID . '">' . $row->SPOT_NAMA. '</option>';
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
				<td colspan="6">
					<button class="primary large" type="submit" id="LoadRecordsButton">Load records</button>
				</td>
			</tr>
		</table>
    </form>
</div>
<div id="PembuanganSampahTableContainer"></div>
