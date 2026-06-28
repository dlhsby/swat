<?php echo form_open("home/login", ["class" => "user-input", "role" => "form"])?>
<label>Login</label>
<div class="input-control text"><?php echo form_input(["name" => "username", "id" => "username", "class" => "form-control", "value" => set_value("username"), "placeholder" => "Username"]); echo form_error("username");?></div>
<label>Password</label>
<div class="input-control password"><?php echo form_password(["name" => "password", "id" => "password", "class" => "form-control", "placeholder" => "Password"]); echo form_error("password");?></div>
<div class="form-actions">
<button class="button primary">Login to...</button>
<button class="button" type="button" onclick="$.Dialog.close()">Cancel</button>
</div>
<?php echo form_close() ?>