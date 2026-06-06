<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
        $('#RekapitulasiTrayekTableContainer').jtable({
            title: 'Daftar Rekapitulasi Trayek<?php echo ", Detail Transaksi Nomor ".$detailTransaksiID ?>',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'TRAYEK_ID ASC',
			columnResizable: true, 
            columnSelectable: true, 
            saveUserPreferences: true, 
            actions: {
                listAction: base_url+'index.php/transaksi/rekapitulasi/getrekapitulasitrayekbyfilter'
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
				DETAILTRANSAKSIANGKUTSAMPAH_ID: {
					title: 'ID Detail Transaksi',
                    visibility: 'hidden'
                },
                TRAYEK_ID: {
                    key: true,
					title: 'ID',
					create: false,
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
					title: 'Waktu Realisasi',
                    visibility: 'hidden'
				},
				TRAYEK_KMTARGET: {
					title: 'KM Target'
				},
				TRAYEK_KMREALISASI: {
					title: 'KM Realisasi',
                    visibility: 'hidden'
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
					title: 'Berat Bersih Sampah',
                    visibility: 'hidden'
				},
				TRAYEK_JUMLAHISIBBMDIAJUKAN: {
					title: 'BBM Diajukan'
				},
				TRAYEK_JUMLAHISIBBMDISETUJUI: {
					title: 'BBM Disetujui',
                    visibility: 'hidden'
				},
				STATUSTRAYEK_NAMA: {
					title: 'Status'
				},
				TRAYEK_KETERANGAN: {
					title: 'Keterangan'
				}
            }
        });
		$('#LoadRecordsButton').click(function (e) {
            e.preventDefault();
			console.log($('#detailTransaksiID').val()+" "+$('#statusTrayek').val());
            $('#RekapitulasiTrayekTableContainer').jtable('load', {
				detailTransaksiID: $('#detailTransaksiID').val(),			               
                statusTrayek: $('#statusTrayek').val()
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
		<li><a href="<?php echo base_url().'index.php/transaksi/rekapitulasi/detailtransaksi'; ?>">Detail Transaksi</a></li>
		<li class="active"><a href="#">Trayekk</a></li>
    </ul>
</nav>
</br>
<legend>Rekapitulasi Trayek<?php echo ', Detail Transaksi Nomor '.$detailTransaksiID ?></legend>
<div class="filtering">
    <form>
		Detail Transaksi :
		<div class="input-control text" style="width: 150px">
			<?php if($detailTransaksiID!=''){				
					echo form_input(['name' => 'detailTransaksiID', 'id' => 'detailTransaksiID','value' => $detailTransaksiID]);
				}
				else 
					echo form_input(['name' => 'detailTransaksiID', 'id' => 'detailTransaksiID','value' => set_value('detailTransaksiID'),'placeholder' => 'ID Detail Transaksi']);
			?>
		</div>		
        Status :
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
        <button class="primary" type="submit" id="LoadRecordsButton">Load records</button>
    </form>
</div>
<div id="RekapitulasiTrayekTableContainer"></div>