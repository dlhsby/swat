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
			/*mask: '9999-19-39',*/
      changeMonth: true,
        changeYear: true,
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
	        defaultSorting: 'TRAYEK_WAKTUENTRIREALISASI DESC',
	        columnResizable: true, //Actually, no need to set true since it's default
	        columnSelectable: true, //Actually, no need to set true since it's default
	        saveUserPreferences: true, //Actually, no need to set true since it's default
	        actions: {
	            listAction: site_url + '/transaksi/pembuangansampahbulantahun/getpembuangansampahbyfilter',
				updateAction: site_url+'/transaksi/pembuangansampah/updatetrayekpembuangansampah',
				deleteAction: site_url+'/transaksi/pembuangansampah/deletetrayekpembuangansampah'
	        },
			toolbar: {
			    items: [
            {
			        icon: base_url+'/assets/images/excel.png',
			        text: 'Export to Excel',
			        click: function () {
			            var url = '<?php echo base_url()."index.php/laporan/tonase/cetaklaporantonasetanggal?bulan="?>'+$('#bulan').val()+'&tahun='+$('#tahun').val();
						window.open(url);
			        }
			    },
          {
              icon: base_url+'/assets/images/pdf.png',
              text: 'Export to PDF',
              click: function () {
                  var url = '<?php echo base_url()."index.php/laporan/tonase/cetaklaporantonasepdfbulan?bulan="?>'+$('#bulan').val()+'&tahun='+$('#tahun').val();
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
					inputClass: 'validate[required]',
					visibility : 'hidden',
	                edit: false
	            },
	            TRAYEK_BERATKOSONGKENDARAAN: {
	                title: 'Berat Kosong Kendaraan',
					inputClass: 'validate[required]',
					visibility : 'hidden',
	                edit: false
	            },
	            TRAYEK_BERATBERSIHSAMPAH: {
	                title: 'Berat Bersih Sampah',
					inputClass: 'validate[required]'
	            },
				TRAYEK_KMREALISASI: {
	                title: 'KM Pembuangan'
	            },
				TRAYEK_WAKTUREALISASI: {
	                title: 'Waktu Pembuangan',
					inputClass: 'validate[required]'
	            },
				TRAYEK_WAKTUENTRIREALISASI:{
					title: 'Waktu Entri',
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
					                    url: "<?php echo base_url(); ?>index.php/transaksi/pembuangansampahbulantahun/getDokumentasiTrayekByTrayekID",
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
		/*$('#LoadRecordsButton').click(function (e) {
	        e.preventDefault();
	        console.log("Tanggal: " + $('#tanggalTransaksi').val() + " , Nopol: " + $('#nopolKendaraan').val() + " , Aplikasi: " + $('#aplikasiKendaraan').val() + " ,Kategori: " + $('#kategoriKendaraan').val() + " , TPS: " + $('#tpsList').val()+ " , Status: " + $('#statusTrayek').val());
	        $('#PembuanganSampahTableContainer').jtable('load', {
	            tanggalTransaksi: $('#tanggalTransaksi').val(),
              bulan : $('#bulan').val(),
              tanggal : $('#tanggal').val(),
	            nopolKendaraan: $('#nopolKendaraan').val(),
	            aplikasiKendaraan: $('#aplikasiKendaraan').val(),
	            kategoriKendaraan: $('#kategoriKendaraan').val(),
	            tpsList: $('#tpsList').val(),
	            statusTrayek: $('#statusTrayek').val()
	        });
	    });
	    $('#LoadRecordsButton').click();
	});*/
  $('#LoadRecordsButton').click(function (e) {
        e.preventDefault();
        console.log("bulan: " + $('#bulan').val() + " , tahun: " + $('#tahun').val() + " , Nopol: " + $('#nopolKendaraan').val() + " , Aplikasi: " + $('#aplikasiKendaraan').val() + " ,Kategori: " + $('#kategoriKendaraan').val() + " , TPS: " + $('#tpsList').val()+ " , Status: " + $('#statusTrayek').val());
        $('#PembuanganSampahTableContainer').jtable('load', {
            /*tanggalTransaksi: $('#tanggalTransaksi').val(),*/
            bulan : $('#bulan').val(),
            tahun : $('#tahun').val(),
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
        <li class="active"><a href="#">Pembuangan Sampah Bulanan</a></li>
    </ul>
</nav>
</br>


</br>
</br>
<legend>Daftar Pembuangan Sampah Hari Ini</legend>
<div class="filtering">
    <form>
		<table width="100%" align="center">
			<tr valign="middle">
				<td width="10%" align="right" >Bulan</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left" valign="middle">
					<div class="input-control text" style="width: 150px">
            <div class="input-control select" style="width: 150px">
              <select id="bulan" name="statusTrayek">
                  <option selected="selected" value="<?php echo $bulan ?>"><?php echo $monthName ?></option>
                  <?php
                  $nama_bulan = array('Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember');
                 $noBulan = 1;
                 for($index=0; $index<12; $index++){
                     echo '<option value="'. $noBulan .'">'.$nama_bulan[$index].'</option>';

                     $noBulan++;
                 }
                  ?>
              </select>
            </div>
					</div>
				</td>
        <td width="10%" align="right" >Tahun</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left" valign="middle">
					<div class="input-control text" style="width: 150px">
            <div class="input-control select" style="width: 150px">
              <select id="tahun" name="statusTrayek">
                  <option selected="selected" value="<?php echo $tahun ?>"><?php echo $tahun ?></option>
                  <?php
                        for($x = 2000; $x <= 2050; $x++)
                        {
                      echo '<option value="'.$x.'">'.$x.'</option>';
                        }
                    ?>
              </select>
            </div>
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

			</tr>
			<tr valign="middle">
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
