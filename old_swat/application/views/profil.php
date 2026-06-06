<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var site_url = "<?php echo site_url()?>";
		var base_url = "<?php echo base_url()?>";
		
		$("#namaPengguna").prop('readonly', true);
		$("#rowUbahPassword1").hide();
		$("#rowUbahPassword2").hide();
		$("#rowUbahPassword3").hide();
		$("#editNamaPengguna").attr("href","javascript:editNamaPenggunaClick()");$("#editNamaPengguna").show();
		$("#saveNamaPengguna").removeAttr("href");$("#saveNamaPengguna").hide();
		$("#cancelNamaPengguna").removeAttr("href");$("#cancelNamaPengguna").hide();
		$("#cancelNamaPengguna").removeAttr("href");$("#cancelNamaPengguna").hide();
		
		$("#usernamePengguna").prop('readonly', true);
		$("#editUsernamePengguna").attr("href","javascript:editUsernamePenggunaClick()");$("#usernamePengguna").show();
		$("#saveUsernamePengguna").removeAttr("href");$("#saveUsernamePengguna").hide();
		$("#cancelUsernamePengguna").removeAttr("href");$("#cancelUsernamePengguna").hide();
		
		$("#passwordPengguna").prop('readonly', true);
		$("#editPasswordPengguna").attr("href","javascript:editPasswordPenggunaClick()");$("#passwordPengguna").show();
		$("#savePasswordPengguna").removeAttr("href");$("#savePasswordPengguna").hide();
		$("#cancelPasswordPengguna").removeAttr("href");$("#cancelPasswordPengguna").hide();
		
		$("#formProfil").validationEngine({
			'custom_error_messages': {
				// Custom Error Messages for Validation Types
				'equals': {
                    'message': "Password Yang Anda Masukkan Tidak Sama"
                }
			}
		});
		$("#formProfil").bind("jqv.field.result", function(event, field, errorFound, prompText){ console.log(errorFound) })
	});
	function editNamaPenggunaClick() {
		$("#namaPengguna").prop('readonly', false);
		$("#namaPengguna").focus();
		$("#editNamaPengguna").removeAttr("href");$("#editNamaPengguna").hide();
		$("#saveNamaPengguna").attr("href","javascript:saveNamaPenggunaClick()");$("#saveNamaPengguna").show();
		$("#cancelNamaPengguna").attr("href","javascript:cancelNamaPenggunaClick()");$("#cancelNamaPengguna").show();
	}
	function saveNamaPenggunaClick() {
		$("#namaPengguna").prop('readonly', true);
		$("#editNamaPengguna").attr("href","javascript:editNamaPenggunaClick()");$("#editNamaPengguna").show();
		$("#saveNamaPengguna").removeAttr("href");$("#saveNamaPengguna").hide();
		$("#cancelNamaPengguna").removeAttr("href");$("#cancelNamaPengguna").hide();
	}
	function cancelNamaPenggunaClick() {
		$("#namaPengguna").prop('readonly', true);
		$("#namaPengguna").val("<?php echo $namaPengguna ?>");
		$("#editNamaPengguna").attr("href","javascript:editNamaPenggunaClick()");$("#editNamaPengguna").show();
		$("#saveNamaPengguna").removeAttr("href");$("#saveNamaPengguna").hide();
		$("#cancelNamaPengguna").removeAttr("href");$("#cancelNamaPengguna").hide();
	}
	
	function editUsernamePenggunaClick() {
		$("#usernamePengguna").prop('readonly', false);
		$("#usernamePengguna").focus();
		$("#editUsernamePengguna").removeAttr("href");$("#editUsernamePengguna").hide();
		$("#saveUsernamePengguna").attr("href","javascript:saveUsernamePenggunaClick()");$("#saveUsernamePengguna").show();
		$("#cancelUsernamePengguna").attr("href","javascript:cancelUsernamePenggunaClick()");$("#cancelUsernamePengguna").show();
	}
	function saveUsernamePenggunaClick() {
		$("#usernamePengguna").prop('readonly', true);
		$("#editUsernamePengguna").attr("href","javascript:editUsernamePenggunaClick()");$("#editUsernamePengguna").show();
		$("#saveUsernamePengguna").removeAttr("href");$("#saveUsernamePengguna").hide();
		$("#cancelUsernamePengguna").removeAttr("href");$("#cancelUsernamePengguna").hide();
	}
	function cancelUsernamePenggunaClick() {
		$("#usernamePengguna").prop('readonly', true);
		$("#usernamePengguna").val("<?php echo $usernamePengguna ?>");
		$("#editUsernamePengguna").attr("href","javascript:editUsernamePenggunaClick()");$("#editUsernamePengguna").show();
		$("#saveUsernamePengguna").removeAttr("href");$("#saveUsernamePengguna").hide();
		$("#cancelUsernamePengguna").removeAttr("href");$("#cancelUsernamePengguna").hide();
	}
	
	function editPasswordPenggunaClick(){
		$("#rowUbahPassword1").show();
		$("#rowUbahPassword2").show();
		$("#rowUbahPassword3").show();
		$("#editPasswordPengguna").removeAttr("href");$("#editPasswordPengguna").hide();
		$("#savePasswordPengguna").attr("href","javascript:savePasswordPenggunaClick()");$("#savePasswordPengguna").show();
		$("#cancelPasswordPengguna").attr("href","javascript:cancelPasswordPenggunaClick()");$("#cancelPasswordPengguna").show();
	}
	
	function savePasswordPenggunaClick() {
		$("#rowUbahPassword1").hide();
		$("#rowUbahPassword2").hide();
		$("#rowUbahPassword3").hide();
		$("#editPasswordPengguna").attr("href","javascript:editPasswordPenggunaClick()");$("#editPasswordPengguna").show();
		$("#savePasswordPengguna").removeAttr("href");$("#savePasswordPengguna").hide();
	}
	
	function cancelPasswordPenggunaClick() {
		$("#rowUbahPassword1").hide();
		$("#rowUbahPassword2").hide();
		$("#rowUbahPassword3").hide();
		$("#passwordLamaPengguna").val("");
		$("#passwordBaruPengguna").val("");
		$("#konfirmasiPasswordPengguna").val("");
		$("#editPasswordPengguna").attr("href","javascript:editPasswordPenggunaClick()");$("#editPasswordPengguna").show();
		$("#savePasswordPengguna").removeAttr("href");$("#savePasswordPengguna").hide();
		$("#cancelPasswordPengguna").removeAttr("href");$("#cancelPasswordPengguna").hide();
	}
</script>

<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li><a href="<?php echo base_url(); ?>">Home</a></li>
        <li class="active"><a href="#">Profil Pengguna</a></li>
    </ul>
</nav>
<legend align="left">Profil Pengguna</legend>
<?php 
	echo form_open('profil',['class'=>'form-horizontal','id' => 'formProfil']);
?>

<table align="center" width="500px">
	<tr align="center">
		<td colspan="5">
			<?php 
				if(isset($error_info))
				{
					echo "<span style='color:red;background-color:#eee;padding:3px;'>";
			   		echo $error_info;
			   		echo '</span>';
				}
				if(isset($success_info))
				{
					echo "<span style='color:green;background-color:#eee;padding:3px;'>";
			   		echo $success_info;
			   		echo '</span>';
				}
			?>
		</td>
	</tr>
	<tr align="center">
		<td colspan="5">
			<!--Foto-->
		</td>
	</tr>
	<tr align="center">
		<td align="left" width="20%">
			<label class="control-label">Nama</label>			
		</td>
		<td align="center" width="5%">:
		</td>
		<td align="left" width="45%">
			<div class="input-control text">
				<?php echo form_input(['name' => 'namaPengguna', 'id' => 'namaPengguna','class' => 'validate[required]', 'style'=>'width:100%;', 'value' => $namaPengguna]); echo form_error('namaPengguna');?>
			</div>
		</td>
		<td align="left" width="15%">
			<a id="editNamaPengguna">Ubah</a><a id="saveNamaPengguna">Simpan</a>
		</td>
		<td align="left" width="15%">
			<a id="cancelNamaPengguna">Cancel</a>
		</td>
	</tr>
	<tr align="center">
		<td align="left">
			<label class="control-label">Username</label>			
		</td>
		<td align="center">:
		</td>
		<td align="left">
			<div class="input-control text">
				<?php echo form_input(['name' => 'usernamePengguna', 'id' => 'usernamePengguna','class' => 'validate[required,custom[onlyUsername],ajax[ajaxUsernameCall]]','style'=>'width:100%;', 'value' => $usernamePengguna]); echo form_error('usernamePengguna');?>
			</div>
		</td>
		<td align="left">
			<a id="editUsernamePengguna">Ubah</a><a id="saveUsernamePengguna">Simpan</a>
		</td>
		<td align="left">
			<a id="cancelUsernamePengguna">Cancel</a>
		</td>
	</tr>
	<tr align="center">
		<td align="left">
			<label class="control-label">Password</label>			
		</td>
		<td align="center">:
		</td>
		<td align="left">
			<div class="input-control text">
				<?php echo form_password(['name' => 'passwordPengguna', 'id' => 'passwordPengguna', 'style'=>'width:100%;', 'value' => $passwordPengguna]); echo form_error('passwordPengguna');?>
			</div>
		</td>
		<td align="left">
			<a id="editPasswordPengguna">Ubah</a>
		</td>
		<td align="left">
			
		</td>
	</tr>
	<tr id="rowUbahPassword1" align="center">
		<td align="left">
			<label class="control-label">Password Lama</label>			
		</td>
		<td align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_password(['name' => 'passwordLamaPengguna', 'id' => 'passwordLamaPengguna','class' => 'validate[required,ajax[ajaxPasswordCall]]', 'style'=>'width:100%;','value' => set_value('passwordLamaPengguna')]); echo form_error('passwordLamaPengguna');?>
			</div>
		</td>
		<td align="left">
			<a id="savePasswordPengguna">Simpan</a>
		</td>
		<td align="left">
			<a id="cancelPasswordPengguna">Cancel</a>
		</td>
	</tr>
	<tr id="rowUbahPassword2" align="center">
		<td align="left">
			<label class="control-label">Password Baru</label>			
		</td>
		<td align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_password(['name' => 'passwordBaruPengguna', 'id' => 'passwordBaruPengguna','class' => 'validate[required]', 'style'=>'width:100%;','value' => set_value('passwordBaruPengguna')]); echo form_error('passwordBaruPengguna');?>
			</div>
		</td>
		<td align="left">
		</td>
		<td align="left">
		</td>
	</tr>
	<tr id="rowUbahPassword3" align="center">
		<td align="left">
			<label class="control-label">Konfirmasi Password Baru</label>			
		</td>
		<td align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_password(['name' => 'konfirmasiPasswordPengguna', 'id' => 'konfirmasiPasswordPengguna','class' => 'validate[required,equals[passwordBaruPengguna]]', 'style'=>'width:100%;','value' => set_value('konfirmasiPasswordPengguna')]); echo form_error('konfirmasiPasswordPengguna');?>
			</div>
		</td>
		<td align="left">
		</td>
		<td align="left">
		</td>
	</tr>
	<tr align="center">
		<td>
			
		</td>
		<td>
			
		</td>
		<td>
			<button class="btn btn-primary" type="submit" value="upload">Simpan</button>
		</td>
		<td>
		</td>
		<td>
		</td>
	</tr>
	</table>
<?php	
	echo form_close();
?>