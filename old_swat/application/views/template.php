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
    <link rel="shortcut icon" href="<?php echo base_url() . 'assets/images/50.png'; ?>">
    <!-- CSS -->
    <link href="<?php echo base_url() . 'assets/jtable.2.4.0/themes/metro/blue/jtable.css'; ?>" rel="stylesheet"
          type="text/css"/>
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/css/jquery-ui.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/css/jquery.datetimepicker.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/css/metro-bootstrap.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/css/metro-bootstrap-responsive.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/css/jquery.autocomplete.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/css/iconFont.css'; ?>">
    <link rel="stylesheet" href="<?php echo base_url() . 'assets/css/validationEngine.jquery.css'; ?>">


    <!-- Script -->
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jquery-1.11.0.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jquery-ui.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/jtable.2.4.0/jquery.jtable.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jquery.datetimepicker.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jquery.autocomplete.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jquery.maskedinput.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jquery.widget.min.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jquery.mousewheel.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jquery.validationEngine.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jquery.validationEngine-id.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/metro.min.js'; ?>"></script>
    <script type="text/javascript" src="https://www.google.com/jsapi"></script>

    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/websocket.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/jms/JmsClient.js'; ?>"></script>
    <script type="text/javascript" src="<?php echo base_url() . 'assets/js/websocket-client.js'; ?>"></script>

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
            <?php
            if ($this->auth->is_logged_in() == TRUE) {
            ?>
            /*
            $("#content-slider").lightSlider({
                loop: true,
                keyPress: true
            });
            $('#image-gallery2').lightSlider({
                gallery: true,
                item: 1,
                slideMargin: 0,
                speed: 2000,
                pause: 10000,
                auto: true,
                loop: true,
                onSliderLoad: function () {
                    $('#image-gallery').removeClass('cS-hidden');
                }
            });
            */
            <?php
            }
            ?>
        });
    </script>

</head>
<body class="metro">
<?php
if ($this->auth->is_logged_in() == TRUE) {
    ?>
    <!--
    <div class="demo">
        <div class="item">
            <div class="clearfix" style="max-width:54%;">
                <ul id="image-gallery2" class="gallery list-unstyled cS-hidden">
                    <li>
                        <img src="<?php //echo base_url() . 'assets/slider/header/' ?>background_index_head.jpg"/>
                    </li>
                    <li>
                        <img src="<?php //echo base_url() . 'assets/slider/header/' ?>background_index_1_head.jpg"/>
                    </li>
                    <li>
                        <img src="<?php //echo base_url() . 'assets/slider/header/' ?>background_index_2_head.jpg"/>
                    </li>
                    <li>
                        <img src="<?php //echo base_url() . 'assets/slider/header/' ?>background_index_3_head.jpg"/>
                    </li>
                    <li>
                        <img src="<?php //echo base_url() . 'assets/slider/header/' ?>background_index_4_head.jpg"/>
                    </li>
                    <li>
                        <img src="<?php //echo base_url() . 'assets/slider/header/' ?>background_index_5_head.jpg"/>
                    </li>
                    <li>
                        <img src="<?php //echo base_url() . 'assets/slider/header/' ?>background_index_6_head.jpg"/>
                    </li>
                    <li>
                        <img src="<?php //echo base_url() . 'assets/slider/header/' ?>background_index_7_head.jpg"/>
                    </li>
                    <li>
                        <img src="<?php //echo base_url() . 'assets/slider/header/' ?>background_index_8_head.jpg"/>
                    </li>
                    <li>
                        <img src="<?php //echo base_url() . 'assets/slider/header/' ?>background_index_9_head.jpg"/>
                    </li>
                    <li>
                        <img src="<?php //echo base_url() . 'assets/slider/header/' ?>background_index_10_head.jpg"/>
                    </li>
                </ul>
            </div>
        </div>
    </div>
    -->
    <?php
}
?>
<nav class="navigation-bar static-top">
    <div class="navigation-bar-content">
        <!--<a href="<?php echo base_url() ?>" class="element"><span class="icon-bus"></span> SWAT DKP
            Surabaya<sup>1.1</sup></a>-->
        <button class="element image-button image-left" style="width: 120px">
            <img src="<?php echo base_url() . 'assets/images/new_logo.png' ?>" style="width: 120px">
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
                <span class="element place-right">Selamat Datang, <a style="color: #FFFFFF;"
                                                                     href="<?php echo base_url() . 'index.php/profil/' ?>"><?php echo $this->session->userdata('pengguna_nama'); ?></a> </span>
                <?php
            } else {
                ?>
                <a id="createLoginWindow" class="element place-right no-tablet" href="#">Login</a>
                <a id="createLoginForm" class="element place-right on-tablet no-desktop"
                   href="<?php echo site_url() . '/home/form_login' ?>">Login</a>
                <?php
            }
            ?>
        </div>
    </div>
</nav>

<div class="container" style="padding: 50px">
    <?php echo $contents ?>
</div>

<nav class="navigation-bar fixed-bottom">
    <div class="navigation-bar-content">
        <a href="/" class="element"><sup>&copy;</sup><?php echo date("Y"); ?> - SWAT DKP Surabaya</a>
</nav>
</body>
</html>