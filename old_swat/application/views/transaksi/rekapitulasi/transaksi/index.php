<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		$('#tanggalHariTransaksi').datetimepicker({
			mask:'9999-19-39',
			format:'Y-m-d',
			timepicker:false,
			closeOnDateSelect:true
			
		});
		$('#image_button_tanggalHariTransaksi').click(function(){
		  $('#tanggalHariTransaksi').datetimepicker('show');
		});
		$('#aplikasiKendaraan').on('change', function (e) {
			var optionSelected = $("option:selected", this);
    		var valueSelected = this.value;
			console.log("value aplikasiKendaraan selected : "+valueSelected);
			if(valueSelected==0){
				$("#kategoriKendaraan").empty();
				$('#containerKategoriKendaraan').hide('fade');
			}
			else
			{
				$('#containerKategoriKendaraan').hide('fade');
				$("#kategoriKendaraan").empty();
				$.ajax({
	            	type : "POST",
	               	url  : "<?php echo base_url(); ?>index.php/transaksi/rekapitulasi/getKategoriKendaraanByAplikasi",
	               	data : "aplikasiKendaraanNama=" + valueSelected,
	               	success: function(data){
	               		if(data.length>0){
							console.log(data);
							$("#kategoriKendaraan").html(data);	
						}
						else console.log("kosong");
	               		
	               	}
	            });
				$('#containerKategoriKendaraan').show('fade');                          	
			}
		});
		
		var base_url = "<?php echo base_url() ?>";
        $('#RekapitulasiTransaksiTableContainer').jtable({
            title: 'Daftar Rekapitulasi Transaksi Tanggal <?php echo $hariTransaksiTanggal?>',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'KENDARAAN_NOMORPOLISI ASC',
			columnResizable: true, 
            columnSelectable: true, 
            saveUserPreferences: true, 
            actions: {
                listAction: base_url+'index.php/transaksi/rekapitulasi/getrekapitulasitransaksibyfilter'
            },
			toolbar: {
				items: [{
					//icon: '/images/excel.png',
					tooltip: 'Click here to add new record',
					text: 'Add new record',
					click: function () {
						alert('Add');
					}
				}]
			},
            fields: {
				HARITRANSAKSI_ID: {
					title: 'ID Hari',
                    visibility: 'hidden'
                },
                TRANSAKSIANGKUTSAMPAH_ID: {
                    key: true,
					title: 'ID',
					create: false,
					display: function (data) {
                   		return $('<a href="'+base_url+'index.php/transaksi/rekapitulasi/detailtransaksi/' + data.record.TRANSAKSIANGKUTSAMPAH_ID + '">' + data.record.TRANSAKSIANGKUTSAMPAH_ID + '</a>');
                    }
                },
				detailTransaksi: {
					title: '',
					sorting: false,
                    edit: false,
                    create: false,
					width: '3%',
					display: function (transaksiData){
						var $iconDetailTransaksi = $('<span class="icon-bus large fg-cyan"></span>');
						$iconDetailTransaksi.click(function (){
							$iconDetailTransaksi.closest('#RekapitulasiTransaksiTableContainer').jtable('openChildTable', $iconDetailTransaksi.closest('tr'),                                                        
							{   
								title: 'Transaksi Nomor '+transaksiData.record.TRANSAKSIANGKUTSAMPAH_ID+', Tanggal <?php echo $hariTransaksiTanggal?>, Kendaraan '+transaksiData.record.KENDARAAN_NOMORPOLISI,
								actions: {
									listAction: base_url+'index.php/transaksi/rekapitulasi/getrekapitulasidetailtransaksibytransaksi?TRANSAKSIANGKUTSAMPAH_ID='+transaksiData.record.TRANSAKSIANGKUTSAMPAH_ID
								},
								fields: {
									TRANSAKSIANGKUTSAMPAH_ID: {
										type: 'hidden',
										defaultValue: transaksiData.record.TRANSAKSIANGKUTSAMPAH_ID
									},
									DETAILTRANSAKSIANGKUTSAMPAH_ID: {
										key: true,
										create: false,
										edit: false,
										title: 'ID',
										display: function (data) {
					                   		return $('<a href="'+base_url+'index.php/transaksi/rekapitulasi/trayek/' + data.record.DETAILTRANSAKSIANGKUTSAMPAH_ID + '">' + data.record.DETAILTRANSAKSIANGKUTSAMPAH_ID + '</a>');
					                    }
									},
									trayek: {
										title: '',
										sorting: false,
										edit: false,
										create: false,
										width: '3%',
										display: function (trayekData){
											var $iconTrayek = $('<span class="icon-bus large fg-red"></span>');
											$iconTrayek.click(function (){
												$iconTrayek.closest('.jtable-child-table-container').jtable('openChildTable', $iconTrayek.closest('tr'),                                                        
												{   
													title: 'Detail Transaksi Nomor '+trayekData.record.DETAILTRANSAKSIANGKUTSAMPAH_ID+', Transaksi Nomor '+transaksiData.record.TRANSAKSIANGKUTSAMPAH_ID+', Tanggal <?php echo $hariTransaksiTanggal?>, Kendaraan '+transaksiData.record.KENDARAAN_NOMORPOLISI+', Pengemudi '+trayekData.record.PENGEMUDI_NAMA,
													actions: {
														listAction: base_url+'index.php/transaksi/rekapitulasi/getrekapitulasitrayekbydetailtransaksi?DETAILTRANSAKSIANGKUTSAMPAH_ID='+trayekData.record.DETAILTRANSAKSIANGKUTSAMPAH_ID
													},
													fields: {
														DETAILTRANSAKSIANGKUTSAMPAH_ID: {
															type: 'hidden',
															defaultValue: trayekData.record.DETAILTRANSAKSIANGKUTSAMPAH_ID
														},
														TRAYEK_ID: {
															key: true,
															create: false,
															edit: false,
															title: 'ID'
														},
														TRAYEK_NAMA: {
															title: 'Nama'
														},
														RUTE_ASAL: {
															title: 'Asal'
														},
														RUTE_TUJUAN: {
															title: 'Tujuan'
														},
														TRAYEK_WAKTUTARGET: {
															title: 'Waktu Target'
														},
														TRAYEK_WAKTUREALISASI: {
															title: 'Waktu Realisasi'
														},
														TRAYEK_KMTARGET: {
															title: 'KM Target'
														},
														TRAYEK_KMREALISASI: {
															title: 'KM Realisasi'
														},
														TRAYEK_BERATKOSONGKENDARAAN: {
															title: 'Berat Kosong Kendaraan',
															visibility: 'hidden'
														},
														TRAYEK_BERATKOTORTIMBANGAN: {
															title: 'Berat Kotor Timbangan',
															visibility: 'hidden'
														},
														TRAYEK_BERATBERSIHSAMPAH: {
															title: 'Berat Bersih Sampah'
														},
														TRAYEK_JUMLAHISIBBMDIAJUKAN: {
															title: 'BBM Diajukan'
														},
														TRAYEK_JUMLAHISIBBMDISETUJUI: {
															title: 'BBM Disetujui'
														},
														STATUSTRAYEK_NAMA: {
															title: 'Status'
														},
														TRAYEK_KETERANGAN: {
															title: 'Keterangan'
														}
													}
												},function (data){				
													data.childTable.jtable('load');
												});
											});     
											return $iconTrayek;
										}
									},
									PENGEMUDI_NAMA: {
										title: 'Pengemudi'
									},
									DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETBERANGKATKANDANG: {
										title: 'KM Target Berangkat',
										visibility: 'hidden'
									},
									DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMREALISASIBERANGKATKANDANG: {
										title: 'KM Realisasi Berangkat',
										visibility: 'hidden'
									},
									DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETKEMBALIKANDANG: {
										title: 'KM Target Kembali',
										visibility: 'hidden'
									},
									DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMREALISASIKEMBALIKANDANG: {
										title: 'KM Realisasi Kembali',
										visibility: 'hidden'
									},
									DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETBERANGKATKANDANG: {
										title: 'Waktu Target Berangkat',
										visibility: 'hidden'
									},
									DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIBERANGKATKANDANG: {
										title: 'Waktu Realisasi Berangkat',
										visibility: 'hidden'
									},
									DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETKEMBALIKANDANG: {
										title: 'Waktu Target Kembali',
										visibility: 'hidden'
									},
									DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIKEMBALIKANDANG: {
										title: 'Waktu Realisasi Kembali',
										visibility: 'hidden'
									},
									STATUSDETAILTRANSAKSIANGKUTSAMPAH_NAMA: {
										title: 'Status'
									},
									DETAILTRANSAKSIANGKUTSAMPAH_KETERANGAN: {
										title: 'Keterangan'
									}
								}
							},function (data){				
								data.childTable.jtable('load');
						    });
						});    
						return $iconDetailTransaksi;
					}
				},
				HARITRANSAKSI_TANGGAL: {
                    title: 'Tanggal',
					 visibility: 'hidden'		
                },
				KENDARAAN_NOMORPOLISI: {
                    title: 'Nopol'		
                },
				APLIKASIKENDARAAN_NAMA: {
					title: 'Aplikasi'
				},
				KATEGORIKENDARAAN_MERK: {
					title: 'Merk'
				},
				SPOT_NAMA: {
					title: 'Pool'
				},
				KATEGORISUMBERSAMPAH_KODE: {
					title: 'Kode'
				},
				STATUSTRANSAKSIANGKUTSAMPAH_NAMA: {
					title: 'Status'
				},
				TRANSAKSIANGKUTSAMPAH_KETERANGAN: {
					title: 'Keterangan'
				}
            }
        });
		//$('#RekapitulasiTransaksiTableContainer').jtable('load');
		$('#LoadRecordsButton').click(function (e) {
            e.preventDefault();
			console.log($('#tanggalHariTransaksi').val()+" "+$('#nomorPolisiKendaraan').val()+" "+$('#aplikasiKendaraan').val()+" "+$('#kategoriKendaraan').val()+" "+$('#poolKendaraan').val()+" "+$('#kodeKendaraan').val()+" "+$('#statusTransaksi').val());
            $('#RekapitulasiTransaksiTableContainer').jtable('load', {
				tanggalHariTransaksi: $('#tanggalHariTransaksi').val(),			               
                nomorPolisiKendaraan: $('#nomorPolisiKendaraan').val(),
                aplikasiKendaraan: $('#aplikasiKendaraan').val(),
                kategoriKendaraan: $('#kategoriKendaraan').val(),
                poolKendaraan: $('#poolKendaraan').val(),
                kodeKendaraan: $('#kodeKendaraan').val(),
				statusTransaksi: $('#statusTransaksi').val()
            });
        });
 
        $('#LoadRecordsButton').click();
    });
</script>
<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/rekapitulasi'; ?>">Rekapitulasi</a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/rekapitulasi'; ?>">Hari</a></li>
		<li class="active"><a href="#">Transaksi</a></li>
    </ul>
</nav>
</br>
<legend>Rekapitulasi Kendaraan<?php echo ', Tanggal '.$hariTransaksiTanggal ?></legend>
<div class="filtering">
    <form>
		<div>
			Tanggal :
			<div class="input-control text" style="width: 150px">
				<?php if($hariTransaksiTanggal!=''){				
						echo form_input(['name' => 'tanggalHariTransaksi', 'id' => 'tanggalHariTransaksi','value' => $hariTransaksiTanggal]);
					}
					else 
						echo form_input(['name' => 'tanggalHariTransaksi', 'id' => 'tanggalHariTransaksi','value' => set_value('tanggalHariTransaksi')]);
				?>
				<span id="image_button_tanggalHariTransaksi" class="btn-date"></span>
			</div>
			Nopol :
			<div class="input-control text" style="width: 150px">
				<input type="text" name="nomorPolisiKendaraan" id="nomorPolisiKendaraan" placeholder="Nomor Polisi" />
			</div>
			Aplikasi :
			<div class="input-control select" style="width: 150px"> 
				<select id="aplikasiKendaraan" name="aplikasiKendaraan">
					<option selected="selected" value="0">All Aplikasi</option>
					<?php
						foreach($all_aplikasikendaraan->result() as $row)
						{
							echo '<option value="'.$row->APLIKASIKENDARAAN_NAMA.'">'.$row->APLIKASIKENDARAAN_NAMA.'</option>';
						}
						
					?>
				</select>
			</div>
			<span id="containerKategoriKendaraan" style="display: none">
				Kategori :
				<div class="input-control select" style="width: 150px"> 
					<select id="kategoriKendaraan" name="kategoriKendaraan">
					</select>
				</div>
			</span>
		</div>
		<div>
			Pool :
			<div class="input-control select" style="width: 150px"> 
		        <select id="poolKendaraan" name="poolKendaraan">
		            <option selected="selected" value="0">All Pool</option>
					<?php
			       		foreach($all_pool->result() as $row)
			       		{
							echo '<option value="'.$row->SPOT_ID.'">'.$row->SPOT_NAMA.'</option>';
			       		}
			       		
		    		?>
		        </select>
			</div>
			Kode :
			<div class="input-control select" style="width: 150px"> 
		        <select id="kodeKendaraan" name="kodeKendaraan">
		            <option selected="selected" value="0">All Kode</option>
					<?php
			       		foreach($all_kode->result() as $row)
			       		{
							echo '<option value="'.$row->KATEGORISUMBERSAMPAH_ID.'">'.$row->KATEGORISUMBERSAMPAH_NAMA.'</option>';
			       		}
			       		
		    		?>
		        </select>
			</div>
	        Status :
			<div class="input-control select" style="width: 150px"> 
		        <select id="statusTransaksi" name="statusTransaksi">
		            <option selected="selected" value="0">All Status</option>
					<?php
			       		foreach($all_statustransaksiangkutsampah->result() as $row)
			       		{
							echo '<option value="'.$row->STATUSTRANSAKSIANGKUTSAMPAH_ID.'">'.$row->STATUSTRANSAKSIANGKUTSAMPAH_NAMA.'</option>';
			       		}
			       		
		    		?>
		        </select>
			</div>
	        <button class="primary" type="submit" id="LoadRecordsButton">Load records</button>
		</div>
    </form>
</div>
<div id="RekapitulasiTransaksiTableContainer"></div>