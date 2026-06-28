<?php if (!defined('BASEPATH')) exit('No direct script access allowed'); ?>
<style type="text/css">
    .body_index {
        text-align: center;
        position: relative;
        top: -49px;
    }
</style>
<link rel="stylesheet" href="<?php echo base_url() . 'assets/slider/css/lightslider.css'; ?>">
<style>
    ul {
        list-style: none outside none;
        padding-left: 0;
        margin: 0;
    }

    .demo .item {
        margin-bottom: 60px;
    }

    .demo {
        width: 1924px;
    }
</style>
<!--
<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"></script>
-->
<script src="<?php echo base_url() . 'assets/slider/js/lightslider.js'; ?>"></script>
<script>
    $(document).ready(function () {
        <?php
          if (!isset($islogin)) {
        ?>
        $("#content-slider").lightSlider({
            loop: true,
            keyPress: true
        });
        $('#image-gallery').lightSlider({
            gallery: true,
            item: 1,
            thumbItem: 9,
            slideMargin: 0,
            speed: 2000,
            pause: 10000,
            auto: true,
            loop: true,
            onSliderLoad: function () {
                $('#image-gallery').removeClass('cS-hidden');
            }
        });
        <?php
          }
        ?>
    });
</script>

<div class="body_index">
    <!--
	<img src="<?php //echo base_url().'assets/images/background_index.jpg' ?>"/>
	-->
    <?php
        if (!isset($islogin)) {
            ?>
            <div class="demo">
                <div class="item">
                    <div class="clearfix" style="max-width:54%;">
                        <ul id="image-gallery" class="gallery list-unstyled cS-hidden">
                            <li data-thumb="<?php echo base_url() . 'assets/slider/' ?>thumb/background_index_5_t.jpg">
                                <img src="<?php echo base_url() . 'assets/slider/' ?>background_index_5.jpg"/>
                            </li>
                            <li data-thumb="<?php echo base_url() . 'assets/slider/' ?>thumb/background_index_7_t.jpg">
                                <img src="<?php echo base_url() . 'assets/slider/' ?>background_index_7.jpg"/>
                            </li>
                            <li data-thumb="<?php echo base_url() . 'assets/slider/' ?>thumb/background_index_10_t.jpg">
                                <img src="<?php echo base_url() . 'assets/slider/' ?>background_index_10.jpg"/>
                            </li>
                            <li data-thumb="<?php echo base_url() . 'assets/slider/' ?>thumb/background_index_6_t.jpg">
                                <img src="<?php echo base_url() . 'assets/slider/' ?>background_index_6.jpg"/>
                            </li>
                            <li data-thumb="<?php echo base_url() . 'assets/slider/' ?>thumb/background_index_4_t.jpg">
                                <img src="<?php echo base_url() . 'assets/slider/' ?>background_index_4.jpg"/>
                            </li>
                            <li data-thumb="<?php echo base_url() . 'assets/slider/' ?>thumb/background_index_1_t.jpg">
                                <img src="<?php echo base_url() . 'assets/slider/' ?>background_index_1.jpg"/>
                            </li>
                            <li data-thumb="<?php echo base_url() . 'assets/slider/' ?>thumb/background_index_2_t.jpg">
                                <img src="<?php echo base_url() . 'assets/slider/' ?>background_index_2.jpg"/>
                            </li>
                            <li data-thumb="<?php echo base_url() . 'assets/slider/' ?>thumb/background_index_3_t.jpg">
                                <img src="<?php echo base_url() . 'assets/slider/' ?>background_index_3.jpg"/>
                            </li>
                            <li data-thumb="<?php echo base_url() . 'assets/slider/' ?>thumb/background_index_9_t.jpg">
                                <img src="<?php echo base_url() . 'assets/slider/' ?>background_index_9.jpg"/>
                            </li>
                            <li data-thumb="<?php echo base_url() . 'assets/slider/' ?>thumb/background_index_t.jpg">
                                <img src="<?php echo base_url() . 'assets/slider/' ?>background_index.jpg"/>
                            </li>
                            <!--
                            <li data-thumb="<?php //echo base_url() . 'assets/slider/' ?>thumb/background_index_10_t.jpg">
                                <img src="<?php //echo base_url() . 'assets/slider/' ?>background_index_10.jpg"/>
                                -->
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <?php
        } else {

    ?>
            <img src="<?php echo base_url().'assets/images/background_index.jpg' ?>"/>
            <?php
        }
    ?>
</div>
<!--<style type="text/css">
.starter-template {
  padding: 40px;
  text-align: center;
}
</style>
<div class="grid">
	<div class="row">
		<div class="span8 offset2">
			<div class="carousel" id="carousel2">
                <div class="slide" align="center">
                    <img src="<?php //echo base_url().'assets/images/bungkul.jpg' ?>" class="cover1" />
                </div>

                <div class="slide" align="center">
                    <img src="<?php //secho base_url().'assets/images/prestasi.jpg' ?>" class="cover1" />
                </div>
            </div>
                <script>
                    $(function(){
                        $("#carousel2").carousel({
                            height: 300,
                            effect: 'fade',
                            markers: {
                                show: true,
                                type: 'square',
                                position: 'bottom-right'
                            }
                        });
                    })
                </script>
		</div>
	</div>
	<div class="starter-template">
			<h1>Keep Surabaya Green And Clean</h1>
			<p class="lead">Selamat Datang di Sistem InformaSWAT DKP Surabaya</p>
		</div>
</div>
-->