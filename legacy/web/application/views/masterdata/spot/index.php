<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
		var cachedKategoriSpotOptions = null;
        $('#SpotTableContainer').jtable({
            title: 'Daftar Spot',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'SPOT_ID ASC',
			columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url+'index.php/masterdata/spot/getspotbyfilter',
				createAction: base_url+'index.php/masterdata/spot/createspot',
				updateAction: base_url+'index.php/masterdata/spot/updatespot',
                deleteAction: base_url+'index.php/masterdata/spot/deletespot'
            },
            fields: {
                SPOT_ID: {
                    key: true,
					title: 'ID',
					create: false
                },
				KATEGORISPOT_ID: {
					title: 'Kategori Spot',
					options: function () {
                        if (cachedKategoriSpotOptions) { //Check for cache
                            return cachedKategoriSpotOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/masterdata/spot/getkategorispot',
                            type: 'POST',
                            dataType: 'json',
                            async: false,
                            success: function (data) {
                                if (data.Result != 'OK') {
                                    alert(data.Message);
                                    return;
                                }
                                options = data.Options;
                            }
                        });
                         
                        return cachedKategoriSpotOptions = options;
                    }
                },
				SPOT_NAMA: {
					title: 'Nama'
                },
				SPOT_ALAMAT: {
					title: 'Alamat'
                },
				SPOT_LATITUDE: {
					title: 'Latitude',
					visibility: false
                },
				SPOT_LONGITUDE: {
					title: 'Longitude',
					visibility: false
                },
				SPOT_FOTO: {
					title: 'Foto'
                }
				
            }
        });
		//$('#SpotTableContainer').jtable('load');
		$('#LoadRecordsButton').click(function (e) {
            e.preventDefault();
			console.log($('#kategoriSpot').val()+" "+$('#namaSpot').val());
            $('#SpotTableContainer').jtable('load', {
                kategoriSpot: $('#kategoriSpot').val(),
                namaSpot: $('#namaSpot').val()
            });
        });
 
        $('#LoadRecordsButton').click();
    });
</script>
<legend>Master Data Spot</legend>
<div class="filtering">
    <form>
		Nama :
		<div class="input-control text" style="width: 200px">
			<input type="text" name="namaSpot" id="namaSpot" placeholder="Nama Spot" />
		</div>
         Parent :
		<div class="input-control select" style="width: 200px"> 
	        <select id="kategoriSpot" name="kategoriSpot">
	            <option selected="selected" value="0">All Kategori Spot</option>
				<?php
		       		foreach($all_kategorispot->result() as $row)
		       		{
						echo '<option value="'.$row->KATEGORISPOT_ID.'">'.$row->KATEGORISPOT_NAMA.'</option>';
		       		}
		       		
	    		?>
	        </select>
		</div>
        <button class="primary" type="submit" id="LoadRecordsButton">Load records</button>
    </form>
</div>
<div id="SpotTableContainer"></div>