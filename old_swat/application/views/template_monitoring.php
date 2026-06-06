<?php if (!defined('BASEPATH')) exit('No direct script access allowed'); ?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="description" content="">
    <meta name="author" content="">
    <title><?php echo $title; ?></title>
	<link rel="shortcut icon" href="<?php echo base_url().'assets/images/50.png';?>">
    <!-- CSS -->
    <link href="<?php echo base_url() . 'assets/jtable.2.4.0/themes/metro/blue/jtable.css'; ?>" rel="stylesheet"
          type="text/css"/>
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/css/jquery-ui.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/css/jquery.datetimepicker.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/css/bootstrap.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/css/metro-bootstrap.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/css/metro-bootstrap-responsive.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/css/iconFont.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/css/style.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/css/style-responsive.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/js/morris-chart/morris.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/js/advanced-datatable/css/demo_page.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/js/advanced-datatable/css/demo_table.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/js/data-tables/DT_bootstrap.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/font-awesome/css/font-awesome.css';?>">
        <link rel="stylesheet" href="<?php echo base_url() . 'assets/css/validationEngine.jquery.css';?>">
    <!-- Script -->
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jquery-1.11.0.js'; ?>"></script>
	    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/bootstrap.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jquery-ui.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/jtable.2.4.0/jquery.jtable.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jquery.validationEngine.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jquery.validationEngine-en.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jquery.datetimepicker.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jquery.widget.min.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jquery.mousewheel.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/metro.min.js'; ?>"></script>
    <!-- Script Websocket-->
    <!--<script src="http://demo.kaazing.com/lib/client/javascript/StompJms.js" type="text/javascript" language="javascript"></script>-->
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/websocket.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jms/JmsClient.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/websocket-client.js'; ?>"></script>

    <!-- script untuk load monitoring-->
    <!--<script type="text/javascript" src="https://www.google.com/jsapi"></script>
    <script src="https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false"></script>-->
    <script type="text/javascript">
        $(document).ready(function () {
            $("#createLoginWindow").on('click', function () {
                $.Dialog({
                    overlay: true,
                    shadow: true,
                    flat: true,
                    width: 300,
                    draggable: true,
                    title: 'Login window',
                    content: '',
                    padding: 10,
                    onShow: function (_dialog) {
                        var content = '<?php echo form_open("home/login", ["class" => "user-input", "role" => "form"])?>' +
                            '<label>Login</label>' +

                            '<div class="input-control text"><?php echo form_input(["name" => "username", "id" => "username", "class" => "form-control", "value" => set_value("username"), "placeholder" => "Username"]); echo form_error("username");?></div>' +
                            '<label>Password</label>' +
                            '<div class="input-control password"><?php echo form_password(["name" => "password", "id" => "password", "class" => "form-control", "placeholder" => "Password"]); echo form_error("password");?></div>' +
                            '<div class="form-actions">' +
                            '<button class="button primary">Login to...</button>&nbsp;' +
                            '<button class="button" type="button" onclick="$.Dialog.close()">Cancel</button> ' +
                            '</div>' +
                            '<?php echo form_close() ?>';

                        $.Dialog.title("User login");
                        $.Dialog.content(content);
                    }
                });
            });
        });
    </script>

</head>
<body class="metro" style="background-color: #ffffff">
<nav class="navigation-bar static-top">
    <div class="navigation-bar-content">
        <button class="element image-button image-left" style="width: 100px">
			<img src="<?php echo base_url().'assets/images/logo.png' ?>" style="width: 100px">
	    </button>
        <span class="element-divider"></span>

        <a class="pull-menu" href="#"></a>
        <ul class="element-menu">
            <?php
            if ($this->auth->is_logged_in() == TRUE):
                $hakakses = $this->session->userdata('pengguna_hakakses_id');
                $menu = $this->model_menu->get_multilevel_menu_data(1, $hakakses);
                ?>
                <?php
                echo '<li><a href="' . base_url() . '" class="active">Home</a></li>';
                ?>

                <?php
                foreach ($menu as $data) {
                    $parentsubchild = print_recursive_list($data['child']);
                    if ($parentsubchild != '') {
                        echo '<li>';
                        echo '<a href="' . base_url() . 'index.php/' . $data['uri'] . '" class="dropdown-toggle">' . $data['nama'] . '</a>';
                        echo '<ul class="dropdown-menu" data-role="dropdown">';
                        echo print_recursive_list($data['child'], $hakakses);
                        echo '</ul>';
                    } else {
                        echo '<li><a href="' . base_url() . 'index.php/' . $data['uri'] . '">' . $data['nama'] . '</a>';
                    }
                }
                ?>
            <?php
            endif;
            ?>
        </ul>

        <div>
            <span class="element-divider"></span>
            <?php
            if ($this->auth->is_logged_in() == TRUE) {
                $hakakses = $this->session->userdata('pengguna_hakakses_id');
                $menu = $this->model_menu->get_multilevel_menu_data(1, $hakakses);
                ?>
                <a class="element place-right" href="<?php echo base_url() . 'index.php/home/logout' ?>">Logout</a>
                <span class="element-divider place-right"></span>
                <span
                    class="element place-right">Welcome, <?php echo $this->session->userdata('pengguna_nama'); ?> </span>
            <?php
            } else {
                ?>
                <a id="createLoginWindow" class="element place-right" href="#">Login</a>
            <?php
            }
            ?>
        </div>
    </div>
</nav>

<div class="container" style="padding: 50px; background-color: #eeeeee">
    <?php echo $contents ?>
</div>

<nav class="navigation-bar fixed-bottom">
    <div class="navigation-bar-content">
        <a href="/" class="element"><sup>&copy;</sup>2014 - SI Angkutan DKP</a>
</nav>
</body>
</html>
