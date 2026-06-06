<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
        $('#AplikasikendaraanTableContainer').jtable({
            title: 'Daftar Aplikasi Kendaraan',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'APLIKASIKENDARAAN_ID ASC',
			columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url+'index.php/masterdata/aplikasikendaraan/getaplikasikendaraanbyfilter',
				createAction: base_url+'index.php/masterdata/aplikasikendaraan/createaplikasikendaraan',
				updateAction: base_url+'index.php/masterdata/aplikasikendaraan/updateaplikasikendaraan',
                deleteAction: base_url+'index.php/masterdata/aplikasikendaraan/deleteaplikasikendaraan'
            },
            fields: {
                APLIKASIKENDARAAN_ID: {
                    key: true,
					title: 'ID',
					create: false
                },
				APLIKASIKENDARAAN_NAMA: {
					title: 'Nama Aplikasi Kendaraan'										
                }
				
            }
        });
		//$('#AplikasikendaraanTableContainer').jtable('load');
		$('#LoadRecordsButton').click(function (e) {
            e.preventDefault();
			console.log($('#namaAplikasi').val());
            $('#AplikasikendaraanTableContainer').jtable('load', {
                namaAplikasi: $('#namaAplikasi').val(),
            });
        });
        $('#LoadRecordsButton').click();
    });
</script>
<legend>Master Data Aplikasi Kendaraan</legend>
<div class="filtering">
    <form>
		Nama :
		<div class="input-control text" style="width: 200px">
			<input type="text" name="namaAplikasi" id="namaAplikasi" placeholder="Nama Aplikasi" />
		</div>
        <button class="primary" type="submit" id="LoadRecordsButton">Load records</button>
    </form>
</div>
<div id="AplikasikendaraanTableContainer"></div>