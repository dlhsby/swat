<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
		var cachedStatusMenuOptions = null;
		var cachedParentMenuOptions = null;
        $('#MenuTableContainer').jtable({
            title: 'Daftar Menu',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'MENU_ID ASC',
			columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url+'index.php/masterdata/menu/getmenubyfilter',
				createAction: base_url+'index.php/masterdata/menu/createmenu',
				updateAction: base_url+'index.php/masterdata/menu/updatemenu',
                deleteAction: base_url+'index.php/masterdata/menu/deletemenu'
            },
			/*toolbar: {
				items: [{
					tooltip: 'Click here to export this table to excel',
					text: 'Export To Excel',
					click: function () {
						alert('This item is just a demonstration for new toolbar feature. You can add your custom toolbar items here. Then, for example, you can download excel file from server when user clicks this item. See toolbar in API reference documentation for usage.');
					}
				}]
			},*/
            fields: {
                MENU_ID: {
                    key: true,
					title: 'ID',
					create: false
                },
				MENU_NAMA: {
					title: 'Nama'
                },
				MENU_URI: {
					title: 'Uri'
                },
				MENU_PARENT_ID: {
					title: 'Parent',
					options: function () {
                        if (cachedParentMenuOptions) { //Check for cache
                            return cachedParentMenuOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/masterdata/menu/getmenuparent',
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
                         
                        return cachedParentMenuOptions = options;
                    }
                },
				STATUSMENU_ID: {
					title: 'Status',
					options: function () {
                        if (cachedStatusMenuOptions) { //Check for cache
                            return cachedStatusMenuOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/masterdata/menu/getstatusmenu',
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
                         
                        return cachedStatusMenuOptions = options;
                    }
					
                }
				
            }
        });
		//$('#MenuTableContainer').jtable('load');
		 //Re-load records when user click 'load records' button.
        $('#LoadRecordsButton').click(function (e) {
            e.preventDefault();
			console.log($('#namaMenu').val()+" "+$('#parentMenu').val());
            $('#MenuTableContainer').jtable('load', {
                namaMenu: $('#namaMenu').val(),
                parentMenu: $('#parentMenu').val()
            });
        });
 
        //Load all records when page is first shown
        $('#LoadRecordsButton').click();
    });
</script>
<legend>Master Data Menu</legend>
<div class="filtering">
    <form>
		Nama :
		<div class="input-control text" style="width: 200px">
			<input type="text" name="namaMenu" id="namaMenu" placeholder="Nama Menu" />
		</div>
         Parent :
		<div class="input-control select" style="width: 200px"> 
	        <select id="parentMenu" name="parentMenu">
	            <option selected="selected" value="0">All Parent Menu</option>
				<?php
		       		foreach($all_parent_menu->result() as $row)
		       		{
						echo '<option value="'.$row->MENU_ID.'">'.$row->MENU_NAMA.'</option>';
		       		}
		       		
	    		?>
	        </select>
		</div>
        <button class="primary" type="submit" id="LoadRecordsButton">Load records</button>
    </form>
</div>
<div id="MenuTableContainer"></div>