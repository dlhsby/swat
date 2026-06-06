<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
        $('#RekapitulasiDetailTransaksiTableContainer').jtable({
            title: 'Daftar Rekapitulasi Detail Transaksi<?php echo ", Transaksi Nomor".$transaksiID ?>',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'DETAILTRANSAKSIANGKUTSAMPAH_ID ASC',
			columnResizable: true, 
            columnSelectable: true, 
            saveUserPreferences: true, 
            actions: {
                listAction: base_url+'index.php/transaksi/rekapitulasi/getrekapitulasidetailtransaksibyfilter'
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
				TRANSAKSIANGKUTSAMPAH_ID: {
					title: 'ID Transaksi',
                    visibility: 'hidden'
                },
                DETAILTRANSAKSIANGKUTSAMPAH_ID: {
                    key: true,
					title: 'ID',
					create: false,
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
							$iconTrayek.closest('#RekapitulasiDetailTransaksiTableContainer').jtable('openChildTable', $iconTrayek.closest('tr'),                                                        
							{   
								title: 'Detail Transaksi Nomor '+trayekData.record.DETAILTRANSAKSIANGKUTSAMPAH_ID+', Pengemudi '+trayekData.record.PENGEMUDI_NAMA,
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
        });
		$('#LoadRecordsButton').click(function (e) {
            e.preventDefault();
			console.log($('#transaksiID').val()+" "+$('#statusDetailTransaksi').val());
            $('#RekapitulasiDetailTransaksiTableContainer').jtable('load', {
				transaksiID: $('#transaksiID').val(),			               
                statusDetailTransaksi: $('#statusDetailTransaksi').val()
            });
        });
 
        $('#LoadRecordsButton').click();
    });
</script>
<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/rekapitulasi'; ?>">Rekapitulasi</a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/rekapitulasi/hari'; ?>">Hari</a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/rekapitulasi/transaksi'; ?>">Transaksi</a></li>
		<li class="active"><a href="#">Detail Transaksi</a></li>
    </ul>
</nav>
</br>
<legend>Rekapitulasi Detail Transaksi<?php echo ', Transaksi Nomor '.$transaksiID ?></legend>
<div class="filtering">
    <form>
		Transaksi :
		<div class="input-control text" style="width: 150px">
			<?php if($transaksiID!=''){				
					echo form_input(['name' => 'transaksiID', 'id' => 'transaksiID','value' => $transaksiID]);
				}
				else 
					echo form_input(['name' => 'transaksiID', 'id' => 'transaksiID','value' => set_value('transaksiID'),'placeholder' => 'ID Transaksi']);
			?>
		</div>		
        Status :
		<div class="input-control select" style="width: 150px"> 
	        <select id="statusDetailTransaksi" name="statusDetailTransaksi">
	            <option selected="selected" value="0">All Status</option>
				<?php
		       		foreach($all_statusdetailtransaksiangkutsampah->result() as $row)
		       		{
						echo '<option value="'.$row->STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID.'">'.$row->STATUSDETAILTRANSAKSIANGKUTSAMPAH_NAMA.'</option>';
		       		}
		       		
	    		?>
	        </select>
		</div>
        <button class="primary" type="submit" id="LoadRecordsButton">Load records</button>
    </form>
</div>
<div id="RekapitulasiDetailTransaksiTableContainer"></div>