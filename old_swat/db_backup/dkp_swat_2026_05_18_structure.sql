-- phpMyAdmin SQL Dump
-- version 4.3.11
-- http://www.phpmyadmin.net
--
-- Host: 127.0.0.1
-- Generation Time: May 18, 2026 at 02:38 PM
-- Server version: 5.6.24
-- PHP Version: 5.6.8

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `dkp_swat`
--
CREATE DATABASE IF NOT EXISTS `dkp_swat` DEFAULT CHARACTER SET latin1 COLLATE latin1_swedish_ci;
USE `dkp_swat`;

DELIMITER $$
--
-- Procedures
--
DROP PROCEDURE IF EXISTS `deleteDetailTransaksiByHariTransaksiTanggal`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `deleteDetailTransaksiByHariTransaksiTanggal`(IN `oldTanggalHariTransaksi` DATE)
BEGIN
 
DECLARE v_finished INTEGER DEFAULT 0;
DECLARE v_detailtransaksiangkutsampah BIGINT(13);
 
 -- declare cursor for employee email

 DEClARE detailtransaksiangkutsampah_cursor CURSOR FOR 
 SELECT detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID 
 FROM haritransaksi 
 JOIN transaksiangkutsampah ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID 
 JOIN detailtransaksiangkutsampah ON transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID 
 WHERE haritransaksi.HARITRANSAKSI_TANGGAL = oldTanggalHariTransaksi;
 
 -- declare NOT FOUND handler
 DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;
 
 OPEN detailtransaksiangkutsampah_cursor;
 
 get_detailtransaksiangkutsampah: LOOP
 
 FETCH detailtransaksiangkutsampah_cursor INTO v_detailtransaksiangkutsampah;
 
 IF v_finished = 1 THEN 
 LEAVE get_detailtransaksiangkutsampah;
 END IF;
 
 -- build email list
 DELETE FROM detailtransaksiangkutsampah WHERE detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID = v_detailtransaksiangkutsampah;
 
 END LOOP get_detailtransaksiangkutsampah;
 
 CLOSE detailtransaksiangkutsampah_cursor;
 
END$$

DROP PROCEDURE IF EXISTS `deleteDetailTransaksiByKendaraanID`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `deleteDetailTransaksiByKendaraanID`(IN `oldIdKendaraan` INT)
BEGIN
 
DECLARE v_finished INTEGER DEFAULT 0;
DECLARE v_detailtransaksiangkutsampah BIGINT(20);
 
 -- declare cursor for employee email
 DEClARE detailtransaksiangkutsampah_cursor CURSOR FOR 
 SELECT detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID 
 FROM haritransaksi 
 JOIN transaksiangkutsampah ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID 
 JOIN detailtransaksiangkutsampah ON transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID 
 WHERE transaksiangkutsampah.KENDARAAN_ID = oldIdKendaraan;
 
 -- declare NOT FOUND handler
 DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;
 
 OPEN detailtransaksiangkutsampah_cursor;
 
 get_detailtransaksiangkutsampah: LOOP
 
 FETCH detailtransaksiangkutsampah_cursor INTO v_detailtransaksiangkutsampah;
 
 IF v_finished = 1 THEN 
 LEAVE get_detailtransaksiangkutsampah;
 END IF;
 
 -- build email list
 DELETE FROM detailtransaksiangkutsampah WHERE detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID = v_detailtransaksiangkutsampah;
 
 END LOOP get_detailtransaksiangkutsampah;
 
 CLOSE detailtransaksiangkutsampah_cursor;
 
END$$

DROP PROCEDURE IF EXISTS `deleteDokumentasiTrayekByKendaraanID`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `deleteDokumentasiTrayekByKendaraanID`(IN `oldIdKendaraan` INT)
BEGIN
 
DECLARE v_finished INTEGER DEFAULT 0;
DECLARE v_dokumentasitrayek BIGINT(20);
 
 -- declare cursor for employee email
 DEClARE dokumentasitrayek_cursor CURSOR FOR 
 SELECT dokumentasitrayek.DOKUMENTASITRAYEK_ID 
 FROM haritransaksi 
 JOIN transaksiangkutsampah ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID 
 JOIN detailtransaksiangkutsampah ON transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID 
 JOIN trayek ON detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID = trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID 
 JOIN dokumentasitrayek ON trayek.TRAYEK_ID = dokumentasitrayek.TRAYEK_ID 
 WHERE transaksiangkutsampah.KENDARAAN_ID = oldIdKendaraan;
 
 -- declare NOT FOUND handler
 DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;
 
 OPEN dokumentasitrayek_cursor;
 
 get_dokumentasitrayek: LOOP
 
 FETCH dokumentasitrayek_cursor INTO v_dokumentasitrayek;
 
 IF v_finished = 1 THEN 
 LEAVE get_dokumentasitrayek;
 END IF;
 
 -- build email list
 DELETE FROM dokumentasitrayek WHERE dokumentasitrayek.DOKUMENTASITRAYEK_ID = v_dokumentasitrayek;
 
 END LOOP get_dokumentasitrayek;
 
 CLOSE dokumentasitrayek_cursor;
 
END$$

DROP PROCEDURE IF EXISTS `deleteJatahKitirByKendaraanID`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `deleteJatahKitirByKendaraanID`(IN `oldIdKendaraan` INT)
BEGIN
 
DECLARE v_finished INTEGER DEFAULT 0;
DECLARE v_jatahkitir INT;
 
 -- declare cursor for employee email
 DEClARE jatahkitir_cursor CURSOR FOR 
 SELECT jatahkitir.JATAHKITIR_ID 
 FROM jatahkitir
 WHERE jatahkitir.KENDARAAN_ID = oldIdKendaraan
 ORDER BY jatahkitir.JATAHKITIR_ID;
 
 -- declare NOT FOUND handler
 DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;
 
 OPEN jatahkitir_cursor;
 
 get_jatahkitir: LOOP
 
 FETCH jatahkitir_cursor INTO v_jatahkitir;
 
 IF v_finished = 1 THEN 
 LEAVE get_jatahkitir;
 END IF;
 
 -- build email list
 DELETE FROM jatahkitir WHERE jatahkitir.JATAHKITIR_ID = v_jatahkitir;
 
 END LOOP get_jatahkitir;
 
 CLOSE jatahkitir_cursor;
 
END$$

DROP PROCEDURE IF EXISTS `deleteKategoriSumberSampahKendaraanByKendaraanID`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `deleteKategoriSumberSampahKendaraanByKendaraanID`(IN `oldIdKendaraan` INT)
BEGIN

DECLARE oldIdKategoriSumberSampahKendaraan INT;
 
 SELECT kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAHKENDARAAN_ID INTO oldIdKategoriSumberSampahKendaraan FROM kategorisumbersampahkendaraan WHERE kategorisumbersampahkendaraan.KENDARAAN_ID = oldIdKendaraan;
 
 DELETE FROM kategorisumbersampahkendaraan WHERE kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAHKENDARAAN_ID = oldIdKategoriSumberSampahKendaraan;
 
END$$

DROP PROCEDURE IF EXISTS `deleteMasterDetailTransaksiByKendaraanID`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `deleteMasterDetailTransaksiByKendaraanID`(IN `oldIdKendaraan` INT)
BEGIN
 
DECLARE v_finished INTEGER DEFAULT 0;
DECLARE v_masterdetailtransaksiangkutsampah INT;
 
 DEClARE masterdetailtransaksiangkutsampah_cursor CURSOR FOR 

 SELECT masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID FROM masterdetailtransaksiangkutsampah WHERE masterdetailtransaksiangkutsampah.KENDARAAN_ID = oldIdKendaraan;
 
 DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;
 
 OPEN masterdetailtransaksiangkutsampah_cursor;
 
 get_masterdetailtransaksiangkutsampah: LOOP
 
 FETCH masterdetailtransaksiangkutsampah_cursor INTO v_masterdetailtransaksiangkutsampah;
 
 IF v_finished = 1 THEN 
 LEAVE get_masterdetailtransaksiangkutsampah;
 END IF;
 
  DELETE FROM masterdetailtransaksiangkutsampah WHERE masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID = v_masterdetailtransaksiangkutsampah;
 
 END LOOP get_masterdetailtransaksiangkutsampah;
 
 CLOSE masterdetailtransaksiangkutsampah_cursor;
 
END$$

DROP PROCEDURE IF EXISTS `deleteTransaksiByHariTransaksiTanggal`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `deleteTransaksiByHariTransaksiTanggal`(IN `oldTanggalHariTransaksi` DATE)
BEGIN
 
DECLARE v_finished INTEGER DEFAULT 0;
DECLARE v_transaksiangkutsampah BIGINT(13);
 
 -- declare cursor for employee email
 DEClARE transaksiangkutsampah_cursor CURSOR FOR 
 SELECT transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID 
 FROM haritransaksi 
 JOIN transaksiangkutsampah ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID 
 WHERE haritransaksi.HARITRANSAKSI_TANGGAL = oldTanggalHariTransaksi;
 
 -- declare NOT FOUND handler
 DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;
 
 OPEN transaksiangkutsampah_cursor;
 
 get_transaksiangkutsampah: LOOP
 
 FETCH transaksiangkutsampah_cursor INTO v_transaksiangkutsampah;
 
 IF v_finished = 1 THEN 
 LEAVE get_transaksiangkutsampah;
 END IF;
 
 -- build email list
 DELETE FROM transaksiangkutsampah WHERE transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = v_transaksiangkutsampah;
 
 END LOOP get_transaksiangkutsampah;
 
 CLOSE transaksiangkutsampah_cursor;
 
END$$

DROP PROCEDURE IF EXISTS `deleteTransaksiByKendaraanID`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `deleteTransaksiByKendaraanID`(IN `oldIdKendaraan` INT)
BEGIN
 
DECLARE v_finished INTEGER DEFAULT 0;
DECLARE v_transaksiangkutsampah BIGINT(13);
 
 -- declare cursor for employee email
 DEClARE transaksiangkutsampah_cursor CURSOR FOR 
 SELECT transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID 
 FROM haritransaksi 
 JOIN transaksiangkutsampah ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID 
 WHERE transaksiangkutsampah.KENDARAAN_ID = oldIdKendaraan;
 
 -- declare NOT FOUND handler
 DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;
 
 OPEN transaksiangkutsampah_cursor;
 
 get_transaksiangkutsampah: LOOP
 
 FETCH transaksiangkutsampah_cursor INTO v_transaksiangkutsampah;
 
 IF v_finished = 1 THEN 
 LEAVE get_transaksiangkutsampah;
 END IF;
 
 -- build email list
 DELETE FROM transaksiangkutsampah WHERE transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = v_transaksiangkutsampah;
 
 END LOOP get_transaksiangkutsampah;
 
 CLOSE transaksiangkutsampah_cursor;
 
END$$

DROP PROCEDURE IF EXISTS `deleteTrayekByHariTransaksiTanggal`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `deleteTrayekByHariTransaksiTanggal`(IN `oldTanggalHariTransaksi` DATE)
BEGIN
 
DECLARE v_finished INTEGER DEFAULT 0;
DECLARE v_trayek BIGINT(20);
 
 -- declare cursor for employee email
 DEClARE trayek_cursor CURSOR FOR 
 SELECT trayek.TRAYEK_ID 
 FROM haritransaksi 
 JOIN transaksiangkutsampah ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID 
 JOIN detailtransaksiangkutsampah ON transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID 
 JOIN trayek ON detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID = trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID 
 WHERE haritransaksi.HARITRANSAKSI_TANGGAL = oldTanggalHariTransaksi;
 
 -- declare NOT FOUND handler
 DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;
 
 OPEN trayek_cursor;
 
 get_trayek: LOOP
 
 FETCH trayek_cursor INTO v_trayek;
 
 IF v_finished = 1 THEN 
 LEAVE get_trayek;
 END IF;
 
 -- build email list
 DELETE FROM trayek WHERE trayek.TRAYEK_ID = v_trayek;
 
 END LOOP get_trayek;
 
 CLOSE trayek_cursor;
 
END$$

DROP PROCEDURE IF EXISTS `deleteTrayekByKendaraanID`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `deleteTrayekByKendaraanID`(IN `oldIdKendaraan` INT)
BEGIN
 
DECLARE v_finished INTEGER DEFAULT 0;
DECLARE v_trayek BIGINT(20);
 
 -- declare cursor for employee email
 DEClARE trayek_cursor CURSOR FOR 
 SELECT trayek.TRAYEK_ID 
 FROM haritransaksi 
 JOIN transaksiangkutsampah ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID 
 JOIN detailtransaksiangkutsampah ON transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID 
 JOIN trayek ON detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID = trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID 
 WHERE transaksiangkutsampah.KENDARAAN_ID = oldIdKendaraan;
 
 -- declare NOT FOUND handler
 DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;
 
 OPEN trayek_cursor;
 
 get_trayek: LOOP
 
 FETCH trayek_cursor INTO v_trayek;
 
 IF v_finished = 1 THEN 
 LEAVE get_trayek;
 END IF;
 
 -- build email list
 DELETE FROM trayek WHERE trayek.TRAYEK_ID = v_trayek;
 
 END LOOP get_trayek;
 
 CLOSE trayek_cursor;
 
END$$

DROP PROCEDURE IF EXISTS `GetAllKendaraan`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `GetAllKendaraan`()
BEGIN
   SELECT *  FROM kendaraan;
   END$$

DROP PROCEDURE IF EXISTS `updateJatahKitirByKendaraanID`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `updateJatahKitirByKendaraanID`(IN `oldIdKendaraan` INT, IN `newIdKendaraan` INT)
BEGIN
 
DECLARE v_finished INTEGER DEFAULT 0;
DECLARE v_jatahkitir INT;
 
 -- declare cursor for employee email
 DEClARE jatahkitir_cursor CURSOR FOR 
 SELECT jatahkitir.JATAHKITIR_ID 
 FROM jatahkitir
 WHERE jatahkitir.KENDARAAN_ID = oldIdKendaraan
 ORDER BY jatahkitir.JATAHKITIR_ID;
 
 -- declare NOT FOUND handler
 DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;
 
 OPEN jatahkitir_cursor;
 
 get_jatahkitir: LOOP
 
 FETCH jatahkitir_cursor INTO v_jatahkitir;

 
 IF v_finished = 1 THEN 
 LEAVE get_jatahkitir;
 END IF;
 
 -- build email list
 UPDATE jatahkitir SET KENDARAAN_ID = newIdKendaraan WHERE JATAHKITIR_ID = v_jatahkitir;
 
 END LOOP get_jatahkitir;
 
 CLOSE jatahkitir_cursor;
 
END$$

DROP PROCEDURE IF EXISTS `updateMasterDetailTransaksiInDetailTransaksiByKendaraanID`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `updateMasterDetailTransaksiInDetailTransaksiByKendaraanID`(IN `oldIdKendaraan` INT, IN `newIdKendaraan` INT)
BEGIN

DECLARE v_finished INTEGER DEFAULT 0;
DECLARE v_detailtransaksiangkutsampah BIGINT;
DECLARE oldIdMasterDetailTransaksi INT;
DECLARE newIdMasterDetailTransaksi INT;
 
 DECLARE detailtransaksiangkutsampah_cursor CURSOR FOR 
 SELECT detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID 
 FROM detailtransaksiangkutsampah
 JOIN masterdetailtransaksiangkutsampah ON detailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID = masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID
 WHERE masterdetailtransaksiangkutsampah.KENDARAAN_ID = oldIdKendaraan;
 
 DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;
 
 OPEN detailtransaksiangkutsampah_cursor;
 
 SELECT MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID INTO newIdMasterDetailTransaksi FROM masterdetailtransaksiangkutsampah WHERE masterdetailtransaksiangkutsampah.KENDARAAN_ID = newIdKendaraan;
 
 get_detailtransaksiangkutsampah: LOOP
 
 FETCH detailtransaksiangkutsampah_cursor INTO v_detailtransaksiangkutsampah;
 
 IF v_finished = 1 THEN 
 LEAVE get_detailtransaksiangkutsampah;
 END IF;
 
 UPDATE detailtransaksiangkutsampah SET detailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID = newIdMasterDetailTransaksi WHERE detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID = v_detailtransaksiangkutsampah;
 
 END LOOP get_detailtransaksiangkutsampah;
 
 CLOSE detailtransaksiangkutsampah_cursor;
 
END$$

DROP PROCEDURE IF EXISTS `updateTransaksiByKendaraanID`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `updateTransaksiByKendaraanID`(IN `oldIdKendaraan` INT, IN `newIdKendaraan` INT)
BEGIN
 
DECLARE v_finished INTEGER DEFAULT 0;
DECLARE v_transaksiangkutsampah BIGINT;
 
 -- declare cursor for employee email
 DEClARE transaksiangkutsampah_cursor CURSOR FOR 
 SELECT transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID 
 FROM transaksiangkutsampah
 WHERE transaksiangkutsampah.KENDARAAN_ID = oldIdKendaraan
 ORDER BY transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID;
 
 -- declare NOT FOUND handler
 DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;
 
 OPEN transaksiangkutsampah_cursor;
 
 get_transaksiangkutsampah: LOOP
 
 FETCH transaksiangkutsampah_cursor INTO v_transaksiangkutsampah;
 
 IF v_finished = 1 THEN 
 LEAVE get_transaksiangkutsampah;
 END IF;
 
 -- build email list
 UPDATE transaksiangkutsampah SET KENDARAAN_ID = newIdKendaraan WHERE TRANSAKSIANGKUTSAMPAH_ID = v_transaksiangkutsampah;
 
 END LOOP get_transaksiangkutsampah;
 
 CLOSE transaksiangkutsampah_cursor;
 
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `aplikasikendaraan`
--
-- Creation: Nov 19, 2020 at 02:02 AM
--

DROP TABLE IF EXISTS `aplikasikendaraan`;
CREATE TABLE IF NOT EXISTS `aplikasikendaraan` (
  `APLIKASIKENDARAAN_ID` int(11) NOT NULL,
  `APLIKASIKENDARAAN_NAMA` varchar(100) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `aplikasikendaraan`:
--

-- --------------------------------------------------------

--
-- Table structure for table `bahanbakar`
--
-- Creation: May 08, 2015 at 03:07 AM
--

DROP TABLE IF EXISTS `bahanbakar`;
CREATE TABLE IF NOT EXISTS `bahanbakar` (
  `BAHANBAKAR_ID` int(11) NOT NULL,
  `KATEGORIBAHANBAKAR_ID` int(11) NOT NULL,
  `BAHANBAKAR_NAMA` varchar(100) NOT NULL,
  `BAHANBAKAR_HARGAPERLITER` int(11) NOT NULL DEFAULT '0'
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `bahanbakar`:
--   `KATEGORIBAHANBAKAR_ID`
--       `kategoribahanbakar` -> `KATEGORIBAHANBAKAR_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `detailriwayatperawatan`
--
-- Creation: May 08, 2015 at 03:07 AM
--

DROP TABLE IF EXISTS `detailriwayatperawatan`;
CREATE TABLE IF NOT EXISTS `detailriwayatperawatan` (
  `DETAILRIWAYATPERAWATAN_ID` bigint(20) NOT NULL,
  `RIWAYATPERAWATAN_ID` bigint(13) NOT NULL,
  `DETAILRIWAYATPERAWATAN_NAMA` varchar(256) NOT NULL,
  `DETAILRIWAYATPERAWATAN_JUMLAH` int(11) NOT NULL DEFAULT '0',
  `DETAILRIWAYATPERAWATAN_HARGASATUAN` int(11) NOT NULL DEFAULT '0',
  `DETAILRIWAYATPERAWATAN_HARGATOTAL` int(11) NOT NULL DEFAULT '0',
  `DETAILRIWAYATPERAWATAN_KETERANGAN` varchar(512) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `detailriwayatperawatan`:
--   `RIWAYATPERAWATAN_ID`
--       `riwayatperawatan` -> `RIWAYATPERAWATAN_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `detailtransaksiangkutsampah`
--
-- Creation: May 08, 2015 at 03:07 AM
--

DROP TABLE IF EXISTS `detailtransaksiangkutsampah`;
CREATE TABLE IF NOT EXISTS `detailtransaksiangkutsampah` (
  `DETAILTRANSAKSIANGKUTSAMPAH_ID` bigint(13) NOT NULL,
  `PENGEMUDI_ID` int(11) NOT NULL,
  `MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID` int(11) DEFAULT NULL,
  `STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID` int(11) NOT NULL DEFAULT '1',
  `TRANSAKSIANGKUTSAMPAH_ID` bigint(13) NOT NULL,
  `DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETBERANGKATKANDANG` int(11) NOT NULL DEFAULT '0',
  `DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMREALISASIBERANGKATKANDANG` int(11) DEFAULT NULL,
  `DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETKEMBALIKANDANG` int(11) NOT NULL DEFAULT '0',
  `DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMREALISASIKEMBALIKANDANG` int(11) DEFAULT NULL,
  `DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETBERANGKATKANDANG` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIBERANGKATKANDANG` datetime DEFAULT NULL,
  `DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETKEMBALIKANDANG` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIKEMBALIKANDANG` datetime DEFAULT NULL,
  `DETAILTRANSAKSIANGKUTSAMPAH_KETERANGAN` varchar(256) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=4346631 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `detailtransaksiangkutsampah`:
--   `TRANSAKSIANGKUTSAMPAH_ID`
--       `transaksiangkutsampah` -> `TRANSAKSIANGKUTSAMPAH_ID`
--   `PENGEMUDI_ID`
--       `pengemudi` -> `PENGEMUDI_ID`
--   `STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID`
--       `statusdetailtransaksiangkutsampah` -> `STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID`
--   `MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID`
--       `masterdetailtransaksiangkutsampah` -> `MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `dokumentasidetailriwayatperawatan`
--
-- Creation: May 08, 2015 at 03:07 AM
--

DROP TABLE IF EXISTS `dokumentasidetailriwayatperawatan`;
CREATE TABLE IF NOT EXISTS `dokumentasidetailriwayatperawatan` (
  `DOKUMENTASIDETAILRIWAYATPERAWATAN_ID` bigint(20) NOT NULL,
  `DETAILRIWAYATPERAWATAN_ID` bigint(20) NOT NULL,
  `DOKUMENTASIDETAILRIWAYATPERAWATAN_FOTO` varchar(1024) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `dokumentasidetailriwayatperawatan`:
--   `DETAILRIWAYATPERAWATAN_ID`
--       `detailriwayatperawatan` -> `DETAILRIWAYATPERAWATAN_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `dokumentasikendaraan`
--
-- Creation: May 08, 2015 at 03:07 AM
--

DROP TABLE IF EXISTS `dokumentasikendaraan`;
CREATE TABLE IF NOT EXISTS `dokumentasikendaraan` (
  `DOKUMENTASIKENDARAAN_ID` int(11) NOT NULL,
  `KENDARAAN_ID` int(11) NOT NULL,
  `DOKUMENTASIKENDARAAN_FOTO` varchar(1024) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `dokumentasikendaraan`:
--   `KENDARAAN_ID`
--       `kendaraan` -> `KENDARAAN_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `dokumentasitrayek`
--
-- Creation: May 08, 2015 at 03:07 AM
--

DROP TABLE IF EXISTS `dokumentasitrayek`;
CREATE TABLE IF NOT EXISTS `dokumentasitrayek` (
  `DOKUMENTASITRAYEK_ID` bigint(20) NOT NULL,
  `TRAYEK_ID` bigint(20) NOT NULL,
  `DOKUMENTASITRAYEK_FOTO` varchar(1024) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=2124174 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `dokumentasitrayek`:
--   `TRAYEK_ID`
--       `trayek` -> `TRAYEK_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `hakakses`
--
-- Creation: May 08, 2015 at 03:07 AM
--

DROP TABLE IF EXISTS `hakakses`;
CREATE TABLE IF NOT EXISTS `hakakses` (
  `HAKAKSES_ID` int(11) NOT NULL,
  `HAKAKSES_NAMA` varchar(100) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `hakakses`:
--

-- --------------------------------------------------------

--
-- Table structure for table `hakaksesmenu`
--
-- Creation: May 08, 2015 at 03:07 AM
--

DROP TABLE IF EXISTS `hakaksesmenu`;
CREATE TABLE IF NOT EXISTS `hakaksesmenu` (
  `HAKAKSESMENU_ID` int(11) NOT NULL,
  `MENU_ID` int(11) NOT NULL,
  `HAKAKSES_ID` int(11) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=198 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `hakaksesmenu`:
--   `HAKAKSES_ID`
--       `hakakses` -> `HAKAKSES_ID`
--   `MENU_ID`
--       `menu` -> `MENU_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `haritransaksi`
--
-- Creation: Nov 19, 2020 at 02:00 AM
--

DROP TABLE IF EXISTS `haritransaksi`;
CREATE TABLE IF NOT EXISTS `haritransaksi` (
  `HARITRANSAKSI_ID` int(11) NOT NULL,
  `STATUSHARITRANSAKSI_ID` int(11) NOT NULL DEFAULT '1',
  `HARITRANSAKSI_TANGGAL` date NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=4421 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `haritransaksi`:
--   `STATUSHARITRANSAKSI_ID`
--       `statusharitransaksi` -> `STATUSHARITRANSAKSI_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `jatahkitir`
--
-- Creation: May 08, 2015 at 03:07 AM
--

DROP TABLE IF EXISTS `jatahkitir`;
CREATE TABLE IF NOT EXISTS `jatahkitir` (
  `JATAHKITIR_ID` int(11) NOT NULL,
  `STATUSJATAHKITIR_ID` int(11) NOT NULL,
  `SPOT_ID` int(11) NOT NULL,
  `KENDARAAN_ID` int(11) NOT NULL,
  `JATAHKITIR_WAKTUDITERBITKAN` datetime NOT NULL,
  `JATAHKITIR_MASABERLAKUAWAL` date NOT NULL,
  `JATAHKITIR_MASABERLAKUAKHIR` date NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=3375949 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `jatahkitir`:
--   `STATUSJATAHKITIR_ID`
--       `statusjatahkitir` -> `STATUSJATAHKITIR_ID`
--   `KENDARAAN_ID`
--       `kendaraan` -> `KENDARAAN_ID`
--   `SPOT_ID`
--       `spot` -> `SPOT_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `kategoribahanbakar`
--
-- Creation: Nov 19, 2020 at 02:03 AM
--

DROP TABLE IF EXISTS `kategoribahanbakar`;
CREATE TABLE IF NOT EXISTS `kategoribahanbakar` (
  `KATEGORIBAHANBAKAR_ID` int(11) NOT NULL,
  `KATEGORIBAHANBAKAR_NAMA` varchar(20) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `kategoribahanbakar`:
--

-- --------------------------------------------------------

--
-- Table structure for table `kategorikendaraan`
--
-- Creation: Nov 19, 2020 at 02:01 AM
--

DROP TABLE IF EXISTS `kategorikendaraan`;
CREATE TABLE IF NOT EXISTS `kategorikendaraan` (
  `KATEGORIKENDARAAN_ID` int(11) NOT NULL,
  `APLIKASIKENDARAAN_ID` int(11) NOT NULL,
  `BAHANBAKAR_ID` int(11) NOT NULL,
  `KATEGORIKENDARAAN_MERK` varchar(100) NOT NULL,
  `KATEGORIKENDARAAN_KAPASITASBAHANBAKAR` int(11) NOT NULL,
  `KATEGORIKENDARAAN_RASIOBAHANBAKARNORMAL` int(11) NOT NULL DEFAULT '1',
  `KATEGORIKENDARAAN_BERATKOSONGNORMAL` int(11) NOT NULL,
  `KATEGORIKENDARAAN_BERATBERSIHMUATANMAKSIMUM` int(11) DEFAULT '0',
  `KATEGORIKENDARAAN_VOLUMEBERSIHMUATANMAKSIMUM` int(11) DEFAULT '0',
  `KATEGORIKENDARAAN_JUMLAHRODA` int(11) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=257 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `kategorikendaraan`:
--   `BAHANBAKAR_ID`
--       `bahanbakar` -> `BAHANBAKAR_ID`
--   `APLIKASIKENDARAAN_ID`
--       `aplikasikendaraan` -> `APLIKASIKENDARAAN_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `kategorirute`
--
-- Creation: Nov 19, 2020 at 01:58 AM
--

DROP TABLE IF EXISTS `kategorirute`;
CREATE TABLE IF NOT EXISTS `kategorirute` (
  `KATEGORIRUTE_ID` int(11) NOT NULL,
  `KATEGORIRUTE_NAMA` varchar(100) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `kategorirute`:
--

-- --------------------------------------------------------

--
-- Table structure for table `kategorispot`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `kategorispot`;
CREATE TABLE IF NOT EXISTS `kategorispot` (
  `KATEGORISPOT_ID` int(11) NOT NULL,
  `KATEGORISPOT_NAMA` varchar(100) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `kategorispot`:
--

-- --------------------------------------------------------

--
-- Table structure for table `kategorisumbersampah`
--
-- Creation: Nov 19, 2020 at 02:02 AM
--

DROP TABLE IF EXISTS `kategorisumbersampah`;
CREATE TABLE IF NOT EXISTS `kategorisumbersampah` (
  `KATEGORISUMBERSAMPAH_ID` int(11) NOT NULL,
  `KATEGORISUMBERSAMPAH_KODE` varchar(5) NOT NULL,
  `KATEGORISUMBERSAMPAH_NAMA` varchar(128) NOT NULL,
  `KATEGORISUMBERSAMPAH_KETERANGAN` varchar(1024) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `kategorisumbersampah`:
--

-- --------------------------------------------------------

--
-- Table structure for table `kategorisumbersampahkendaraan`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `kategorisumbersampahkendaraan`;
CREATE TABLE IF NOT EXISTS `kategorisumbersampahkendaraan` (
  `KATEGORISUMBERSAMPAHKENDARAAN_ID` int(11) NOT NULL,
  `KATEGORISUMBERSAMPAH_ID` int(11) NOT NULL,
  `KENDARAAN_ID` int(11) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=1557 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `kategorisumbersampahkendaraan`:
--   `KATEGORISUMBERSAMPAH_ID`
--       `kategorisumbersampah` -> `KATEGORISUMBERSAMPAH_ID`
--   `KENDARAAN_ID`
--       `kendaraan` -> `KENDARAAN_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `kendaraan`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `kendaraan`;
CREATE TABLE IF NOT EXISTS `kendaraan` (
  `KENDARAAN_ID` int(11) NOT NULL,
  `SPOT_POOL_ID` int(11) NOT NULL,
  `STATUSKENDARAAN_ID` int(11) NOT NULL DEFAULT '1',
  `KATEGORIKENDARAAN_ID` int(11) NOT NULL,
  `KENDARAAN_NOMORPOLISI` varchar(10) NOT NULL,
  `KENDARAAN_NOMORRANGKA` varchar(100) NOT NULL,
  `KENDARAAN_NOMORMESIN` varchar(100) NOT NULL,
  `KENDARAAN_TAHUNPEMBUATAN` year(4) NOT NULL,
  `KENDARAAN_RASIOBAHANBAKARTERKINI` int(11) NOT NULL DEFAULT '1',
  `KENDARAAN_BERATKOSONGTERKINI` int(11) NOT NULL,
  `KENDARAAN_KMTERKINI` int(11) NOT NULL,
  `KENDARAAN_MASABERLAKUSTNK` date NOT NULL,
  `KENDARAAN_MASABERLAKUPAJAKSTNK` date NOT NULL,
  `KENDARAAN_KETERANGAN` varchar(512) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=1538 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `kendaraan`:
--   `STATUSKENDARAAN_ID`
--       `statuskendaraan` -> `STATUSKENDARAAN_ID`
--   `SPOT_POOL_ID`
--       `spot` -> `SPOT_ID`
--   `KATEGORIKENDARAAN_ID`
--       `kategorikendaraan` -> `KATEGORIKENDARAAN_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `kepemilikansim`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `kepemilikansim`;
CREATE TABLE IF NOT EXISTS `kepemilikansim` (
  `KEPEMILIKANSIM_ID` int(11) NOT NULL,
  `PENGEMUDI_ID` int(11) NOT NULL,
  `SIM_ID` int(11) NOT NULL,
  `KEPEMILIKANSIM_NOMORSIM` varchar(12) NOT NULL,
  `KEPEMILIKANSIM_MASABERLAKUSIM` date NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `kepemilikansim`:
--   `PENGEMUDI_ID`
--       `pengemudi` -> `PENGEMUDI_ID`
--   `SIM_ID`
--       `sim` -> `SIM_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `konversi_si_swat`
--
-- Creation: Aug 23, 2018 at 04:34 PM
-- Last update: Aug 23, 2018 at 04:34 PM
--

DROP TABLE IF EXISTS `konversi_si_swat`;
CREATE TABLE IF NOT EXISTS `konversi_si_swat` (
  `id` int(11) NOT NULL,
  `si` varchar(250) DEFAULT NULL,
  `swat` varchar(250) DEFAULT NULL
) ENGINE=MyISAM AUTO_INCREMENT=32 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `konversi_si_swat`:
--

-- --------------------------------------------------------

--
-- Table structure for table `masterdetailtransaksiangkutsampah`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `masterdetailtransaksiangkutsampah`;
CREATE TABLE IF NOT EXISTS `masterdetailtransaksiangkutsampah` (
  `MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID` int(11) NOT NULL,
  `KENDARAAN_ID` int(11) NOT NULL,
  `PENGEMUDI_ID` int(11) NOT NULL,
  `MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUBERANGKATKANDANG` time NOT NULL,
  `MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUKEMBALIKANDANG` time NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=1449 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `masterdetailtransaksiangkutsampah`:
--   `PENGEMUDI_ID`
--       `pengemudi` -> `PENGEMUDI_ID`
--   `KENDARAAN_ID`
--       `kendaraan` -> `KENDARAAN_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `mastertrayek`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `mastertrayek`;
CREATE TABLE IF NOT EXISTS `mastertrayek` (
  `MASTERTRAYEK_ID` int(11) NOT NULL,
  `MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID` int(11) NOT NULL,
  `RUTE_ID` int(11) NOT NULL,
  `MASTERTRAYEK_WAKTUTARGET` time NOT NULL,
  `MASTERTRAYEK_JUMLAHISIBBMDIAJUKAN` int(11) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=2540 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `mastertrayek`:
--   `RUTE_ID`
--       `rute` -> `RUTE_ID`
--   `MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID`
--       `masterdetailtransaksiangkutsampah` -> `MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `menu`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `menu`;
CREATE TABLE IF NOT EXISTS `menu` (
  `MENU_ID` int(11) NOT NULL,
  `STATUSMENU_ID` int(11) NOT NULL DEFAULT '1',
  `MENU_PARENT_ID` int(11) DEFAULT NULL,
  `MENU_NAMA` varchar(100) NOT NULL,
  `MENU_URI` varchar(512) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=131 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `menu`:
--   `MENU_PARENT_ID`
--       `menu` -> `MENU_ID`
--   `STATUSMENU_ID`
--       `statusmenu` -> `STATUSMENU_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `pengemudi`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `pengemudi`;
CREATE TABLE IF NOT EXISTS `pengemudi` (
  `PENGEMUDI_ID` int(11) NOT NULL,
  `SPOT_POOL_ID` int(11) NOT NULL,
  `STATUSKEPEGAWAIAN_ID` int(11) NOT NULL,
  `PENGEMUDI_NAMA` varchar(100) NOT NULL,
  `PENGEMUDI_NOMORKTP` varchar(16) NOT NULL,
  `PENGEMUDI_ALAMATASAL` varchar(256) NOT NULL,
  `PENGEMUDI_ALAMATDOMISILI` varchar(256) NOT NULL,
  `PENGEMUDI_TANGGALLAHIR` date NOT NULL,
  `PENGEMUDI_KONTAK` varchar(100) NOT NULL,
  `PENGEMUDI_PELATIHANSAFETY` varchar(100) DEFAULT 'BELUM',
  `PENGEMUDI_FOTO` varchar(1024) DEFAULT NULL,
  `PENGEMUDI_KETERANGAN` varchar(256) DEFAULT 'AKTIF'
) ENGINE=InnoDB AUTO_INCREMENT=327 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `pengemudi`:
--   `STATUSKEPEGAWAIAN_ID`
--       `statuskepegawaian` -> `STATUSKEPEGAWAIAN_ID`
--   `SPOT_POOL_ID`
--       `spot` -> `SPOT_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `pengguna`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `pengguna`;
CREATE TABLE IF NOT EXISTS `pengguna` (
  `PENGGUNA_ID` int(11) NOT NULL,
  `HAKAKSES_ID` int(11) NOT NULL,
  `PENGGUNA_NAMA` varchar(100) NOT NULL,
  `PENGGUNA_FOTO` varchar(1024) DEFAULT NULL,
  `PENGGUNA_USERNAME` varchar(100) NOT NULL,
  `PENGGUNA_PASSWORD` varchar(100) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `pengguna`:
--   `HAKAKSES_ID`
--       `hakakses` -> `HAKAKSES_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `retribusi`
--
-- Creation: Sep 26, 2017 at 10:42 AM
--

DROP TABLE IF EXISTS `retribusi`;
CREATE TABLE IF NOT EXISTS `retribusi` (
  `ID_KATEGORI_RETRIBUSI` int(11) NOT NULL,
  `NAMA_KATEGORI_RETRIBUSI` varchar(50) NOT NULL,
  `TANGGAL` date NOT NULL,
  `JUMLAH` bigint(20) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=196 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `retribusi`:
--

-- --------------------------------------------------------

--
-- Table structure for table `riwayatperawatan`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `riwayatperawatan`;
CREATE TABLE IF NOT EXISTS `riwayatperawatan` (
  `RIWAYATPERAWATAN_ID` bigint(13) NOT NULL,
  `KENDARAAN_ID` int(11) NOT NULL,
  `STATUSRIWAYATPERAWATAN_ID` int(11) NOT NULL DEFAULT '1',
  `RIWAYATPERAWATAN_TANGGAL` date NOT NULL,
  `RIWAYATPERAWATAN_HARGATOTAL` int(11) NOT NULL DEFAULT '0',
  `RIWAYATPERAWATAN_KETERANGAN` varchar(512) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `riwayatperawatan`:
--   `STATUSRIWAYATPERAWATAN_ID`
--       `statusriwayatperawatan` -> `STATUSRIWAYATPERAWATAN_ID`
--   `KENDARAAN_ID`
--       `kendaraan` -> `KENDARAAN_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `rute`
--
-- Creation: Nov 19, 2020 at 01:56 AM
--

DROP TABLE IF EXISTS `rute`;
CREATE TABLE IF NOT EXISTS `rute` (
  `RUTE_ID` int(11) NOT NULL,
  `KATEGORIRUTE_ID` int(11) NOT NULL,
  `SPOT_ASAL_ID` int(11) NOT NULL,
  `SPOT_TUJUAN_ID` int(11) NOT NULL,
  `RUTE_JARAK` int(11) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=128539 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `rute`:
--   `SPOT_ASAL_ID`
--       `spot` -> `SPOT_ID`
--   `SPOT_TUJUAN_ID`
--       `spot` -> `SPOT_ID`
--   `KATEGORIRUTE_ID`
--       `kategorirute` -> `KATEGORIRUTE_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `sampahmasuktpa`
--
-- Creation: Oct 24, 2018 at 03:12 PM
-- Last update: Oct 24, 2018 at 03:12 PM
--

DROP TABLE IF EXISTS `sampahmasuktpa`;
CREATE TABLE IF NOT EXISTS `sampahmasuktpa` (
  `id` int(11) NOT NULL,
  `tgltitle` varchar(50) DEFAULT NULL,
  `tgl` int(11) DEFAULT NULL,
  `nopol` varchar(20) DEFAULT NULL,
  `lpsdepo` varchar(200) DEFAULT NULL,
  `trukasal` varchar(200) DEFAULT NULL,
  `bkotor` int(11) DEFAULT NULL,
  `bkosong` int(11) DEFAULT NULL,
  `bbersih` int(11) DEFAULT NULL
) ENGINE=MyISAM AUTO_INCREMENT=11172 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `sampahmasuktpa`:
--

-- --------------------------------------------------------

--
-- Table structure for table `sim`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `sim`;
CREATE TABLE IF NOT EXISTS `sim` (
  `SIM_ID` int(11) NOT NULL,
  `SIM_NAMA` varchar(10) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `sim`:
--

-- --------------------------------------------------------

--
-- Table structure for table `spot`
--
-- Creation: Nov 19, 2020 at 01:56 AM
--

DROP TABLE IF EXISTS `spot`;
CREATE TABLE IF NOT EXISTS `spot` (
  `SPOT_ID` int(11) NOT NULL,
  `KATEGORISPOT_ID` int(11) NOT NULL,
  `SPOT_NAMA` varchar(256) NOT NULL,
  `SPOT_ALAMAT` varchar(512) NOT NULL,
  `SPOT_FOTO` varchar(1024) DEFAULT NULL,
  `SPOT_LATITUDE` decimal(11,6) DEFAULT NULL,
  `SPOT_LONGITUDE` decimal(11,6) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=950 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `spot`:
--   `KATEGORISPOT_ID`
--       `kategorispot` -> `KATEGORISPOT_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `statusdetailtransaksiangkutsampah`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `statusdetailtransaksiangkutsampah`;
CREATE TABLE IF NOT EXISTS `statusdetailtransaksiangkutsampah` (
  `STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID` int(11) NOT NULL,
  `STATUSDETAILTRANSAKSIANGKUTSAMPAH_NAMA` varchar(100) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `statusdetailtransaksiangkutsampah`:
--

-- --------------------------------------------------------

--
-- Table structure for table `statusharitransaksi`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `statusharitransaksi`;
CREATE TABLE IF NOT EXISTS `statusharitransaksi` (
  `STATUSHARITRANSAKSI_ID` int(11) NOT NULL,
  `STATUSHARITRANSAKSI_NAMA` varchar(100) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `statusharitransaksi`:
--

-- --------------------------------------------------------

--
-- Table structure for table `statusjatahkitir`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `statusjatahkitir`;
CREATE TABLE IF NOT EXISTS `statusjatahkitir` (
  `STATUSJATAHKITIR_ID` int(11) NOT NULL,
  `STATUSJATAHKITIR_NAMA` varchar(128) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `statusjatahkitir`:
--

-- --------------------------------------------------------

--
-- Table structure for table `statuskendaraan`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `statuskendaraan`;
CREATE TABLE IF NOT EXISTS `statuskendaraan` (
  `STATUSKENDARAAN_ID` int(11) NOT NULL,
  `STATUSKENDARAAN_NAMA` varchar(100) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `statuskendaraan`:
--

-- --------------------------------------------------------

--
-- Table structure for table `statuskepegawaian`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `statuskepegawaian`;
CREATE TABLE IF NOT EXISTS `statuskepegawaian` (
  `STATUSKEPEGAWAIAN_ID` int(11) NOT NULL,
  `STATUSKEPEGAWAIAN_NAMA` varchar(100) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `statuskepegawaian`:
--

-- --------------------------------------------------------

--
-- Table structure for table `statusmenu`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `statusmenu`;
CREATE TABLE IF NOT EXISTS `statusmenu` (
  `STATUSMENU_ID` int(11) NOT NULL,
  `STATUSMENU_NAMA` varchar(100) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `statusmenu`:
--

-- --------------------------------------------------------

--
-- Table structure for table `statusriwayatperawatan`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `statusriwayatperawatan`;
CREATE TABLE IF NOT EXISTS `statusriwayatperawatan` (
  `STATUSRIWAYATPERAWATAN_ID` int(11) NOT NULL,
  `STATUSRIWAYATPERAWATAN_NAMA` varchar(100) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `statusriwayatperawatan`:
--

-- --------------------------------------------------------

--
-- Table structure for table `statustransaksiangkutsampah`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `statustransaksiangkutsampah`;
CREATE TABLE IF NOT EXISTS `statustransaksiangkutsampah` (
  `STATUSTRANSAKSIANGKUTSAMPAH_ID` int(11) NOT NULL,
  `STATUSTRANSAKSIANGKUTSAMPAH_NAMA` varchar(100) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `statustransaksiangkutsampah`:
--

-- --------------------------------------------------------

--
-- Table structure for table `statustrayek`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `statustrayek`;
CREATE TABLE IF NOT EXISTS `statustrayek` (
  `STATUSTRAYEK_ID` int(11) NOT NULL,
  `STATUSTRAYEK_NAMA` varchar(100) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `statustrayek`:
--

-- --------------------------------------------------------

--
-- Table structure for table `tonase`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `tonase`;
CREATE TABLE IF NOT EXISTS `tonase` (
  `TONASE_ID` int(11) NOT NULL,
  `TONASE_TANGGAL` date NOT NULL,
  `TONASE_NOMINAL` double NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=365 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `tonase`:
--

-- --------------------------------------------------------

--
-- Table structure for table `transaksiangkutsampah`
--
-- Creation: May 08, 2015 at 03:08 AM
--

DROP TABLE IF EXISTS `transaksiangkutsampah`;
CREATE TABLE IF NOT EXISTS `transaksiangkutsampah` (
  `TRANSAKSIANGKUTSAMPAH_ID` bigint(13) NOT NULL,
  `HARITRANSAKSI_ID` int(11) NOT NULL,
  `KENDARAAN_ID` int(11) NOT NULL,
  `STATUSTRANSAKSIANGKUTSAMPAH_ID` int(11) NOT NULL DEFAULT '1',
  `TRANSAKSIANGKUTSAMPAH_KETERANGAN` varchar(256) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=4040491 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `transaksiangkutsampah`:
--   `HARITRANSAKSI_ID`
--       `haritransaksi` -> `HARITRANSAKSI_ID`
--   `KENDARAAN_ID`
--       `kendaraan` -> `KENDARAAN_ID`
--   `STATUSTRANSAKSIANGKUTSAMPAH_ID`
--       `statustransaksiangkutsampah` -> `STATUSTRANSAKSIANGKUTSAMPAH_ID`
--

-- --------------------------------------------------------

--
-- Table structure for table `trayek`
--
-- Creation: May 08, 2015 at 03:09 AM
--

DROP TABLE IF EXISTS `trayek`;
CREATE TABLE IF NOT EXISTS `trayek` (
  `TRAYEK_ID` bigint(20) NOT NULL,
  `STATUSTRAYEK_ID` int(11) NOT NULL DEFAULT '1',
  `DETAILTRANSAKSIANGKUTSAMPAH_ID` bigint(13) NOT NULL,
  `PENGGUNA_ID` int(11) DEFAULT NULL,
  `RUTE_ID` int(11) DEFAULT NULL,
  `TRAYEK_NAMA` varchar(256) NOT NULL,
  `TRAYEK_WAKTUTARGET` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `TRAYEK_WAKTUREALISASI` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `TRAYEK_KMTARGET` int(11) NOT NULL DEFAULT '0',
  `TRAYEK_KMREALISASI` int(11) NOT NULL DEFAULT '0',
  `TRAYEK_BERATKOSONGKENDARAAN` int(11) NOT NULL DEFAULT '0',
  `TRAYEK_KETERANGAN` varchar(512) DEFAULT NULL,
  `TRAYEK_BERATKOTORTIMBANGAN` int(11) DEFAULT NULL,
  `TRAYEK_BERATBERSIHSAMPAH` int(11) DEFAULT NULL,
  `TRAYEK_VOLUMESAMPAH` int(11) DEFAULT NULL,
  `TRAYEK_JUMLAHISIBBMDIAJUKAN` float DEFAULT '0',
  `TRAYEK_JUMLAHISIBBMDISETUJUI` float DEFAULT NULL,
  `TRAYEK_WAKTUENTRIPENJADWALAN` datetime DEFAULT NULL,
  `TRAYEK_WAKTUENTRIREALISASI` datetime DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=7975577 DEFAULT CHARSET=latin1;

--
-- RELATIONS FOR TABLE `trayek`:
--   `STATUSTRAYEK_ID`
--       `statustrayek` -> `STATUSTRAYEK_ID`
--   `DETAILTRANSAKSIANGKUTSAMPAH_ID`
--       `detailtransaksiangkutsampah` -> `DETAILTRANSAKSIANGKUTSAMPAH_ID`
--   `RUTE_ID`
--       `rute` -> `RUTE_ID`
--   `PENGGUNA_ID`
--       `pengguna` -> `PENGGUNA_ID`
--

--
-- Indexes for dumped tables
--

--
-- Indexes for table `aplikasikendaraan`
--
ALTER TABLE `aplikasikendaraan`
  ADD PRIMARY KEY (`APLIKASIKENDARAAN_ID`), ADD KEY `APLIKASIKENDARAAN_ID` (`APLIKASIKENDARAAN_ID`);

--
-- Indexes for table `bahanbakar`
--
ALTER TABLE `bahanbakar`
  ADD PRIMARY KEY (`BAHANBAKAR_ID`), ADD KEY `FK_RELATIONSHIP_13` (`KATEGORIBAHANBAKAR_ID`);

--
-- Indexes for table `detailriwayatperawatan`
--
ALTER TABLE `detailriwayatperawatan`
  ADD PRIMARY KEY (`DETAILRIWAYATPERAWATAN_ID`), ADD KEY `FK_RELATIONSHIP_5` (`RIWAYATPERAWATAN_ID`);

--
-- Indexes for table `detailtransaksiangkutsampah`
--
ALTER TABLE `detailtransaksiangkutsampah`
  ADD PRIMARY KEY (`DETAILTRANSAKSIANGKUTSAMPAH_ID`), ADD KEY `FK_RELATIONSHIP_17` (`TRANSAKSIANGKUTSAMPAH_ID`), ADD KEY `FK_RELATIONSHIP_23` (`PENGEMUDI_ID`), ADD KEY `FK_RELATIONSHIP_30` (`STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID`), ADD KEY `FK_RELATIONSHIP_31` (`MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID`);

--
-- Indexes for table `dokumentasidetailriwayatperawatan`
--
ALTER TABLE `dokumentasidetailriwayatperawatan`
  ADD PRIMARY KEY (`DOKUMENTASIDETAILRIWAYATPERAWATAN_ID`), ADD KEY `FK_RELATIONSHIP_49` (`DETAILRIWAYATPERAWATAN_ID`);

--
-- Indexes for table `dokumentasikendaraan`
--
ALTER TABLE `dokumentasikendaraan`
  ADD PRIMARY KEY (`DOKUMENTASIKENDARAAN_ID`), ADD KEY `FK_RELATIONSHIP_53` (`KENDARAAN_ID`);

--
-- Indexes for table `dokumentasitrayek`
--
ALTER TABLE `dokumentasitrayek`
  ADD PRIMARY KEY (`DOKUMENTASITRAYEK_ID`), ADD KEY `FK_RELATIONSHIP_48` (`TRAYEK_ID`);

--
-- Indexes for table `hakakses`
--
ALTER TABLE `hakakses`
  ADD PRIMARY KEY (`HAKAKSES_ID`);

--
-- Indexes for table `hakaksesmenu`
--
ALTER TABLE `hakaksesmenu`
  ADD PRIMARY KEY (`HAKAKSESMENU_ID`), ADD KEY `FK_RELATIONSHIP_2` (`HAKAKSES_ID`), ADD KEY `FK_RELATIONSHIP_3` (`MENU_ID`);

--
-- Indexes for table `haritransaksi`
--
ALTER TABLE `haritransaksi`
  ADD PRIMARY KEY (`HARITRANSAKSI_ID`), ADD KEY `FK_RELATIONSHIP_15` (`STATUSHARITRANSAKSI_ID`), ADD KEY `HARITRANSAKSI_ID` (`HARITRANSAKSI_ID`);

--
-- Indexes for table `jatahkitir`
--
ALTER TABLE `jatahkitir`
  ADD PRIMARY KEY (`JATAHKITIR_ID`), ADD KEY `STATUSJATAHKITIR_ID` (`STATUSJATAHKITIR_ID`,`SPOT_ID`,`KENDARAAN_ID`), ADD KEY `SPOT_ID` (`SPOT_ID`), ADD KEY `KENDARAAN_ID` (`KENDARAAN_ID`);

--
-- Indexes for table `kategoribahanbakar`
--
ALTER TABLE `kategoribahanbakar`
  ADD PRIMARY KEY (`KATEGORIBAHANBAKAR_ID`), ADD KEY `KATEGORIBAHANBAKAR_ID` (`KATEGORIBAHANBAKAR_ID`);

--
-- Indexes for table `kategorikendaraan`
--
ALTER TABLE `kategorikendaraan`
  ADD PRIMARY KEY (`KATEGORIKENDARAAN_ID`), ADD KEY `FK_RELATIONSHIP_10` (`BAHANBAKAR_ID`), ADD KEY `FK_RELATIONSHIP_8` (`APLIKASIKENDARAAN_ID`), ADD KEY `KATEGORIKENDARAAN_ID` (`KATEGORIKENDARAAN_ID`);

--
-- Indexes for table `kategorirute`
--
ALTER TABLE `kategorirute`
  ADD PRIMARY KEY (`KATEGORIRUTE_ID`), ADD KEY `KATEGORIRUTE_ID` (`KATEGORIRUTE_ID`);

--
-- Indexes for table `kategorispot`
--
ALTER TABLE `kategorispot`
  ADD PRIMARY KEY (`KATEGORISPOT_ID`);

--
-- Indexes for table `kategorisumbersampah`
--
ALTER TABLE `kategorisumbersampah`
  ADD PRIMARY KEY (`KATEGORISUMBERSAMPAH_ID`), ADD KEY `KATEGORISUMBERSAMPAH_ID` (`KATEGORISUMBERSAMPAH_ID`);

--
-- Indexes for table `kategorisumbersampahkendaraan`
--
ALTER TABLE `kategorisumbersampahkendaraan`
  ADD PRIMARY KEY (`KATEGORISUMBERSAMPAHKENDARAAN_ID`), ADD KEY `FK_RELATIONSHIP_50` (`KATEGORISUMBERSAMPAH_ID`), ADD KEY `FK_RELATIONSHIP_52` (`KENDARAAN_ID`);

--
-- Indexes for table `kendaraan`
--
ALTER TABLE `kendaraan`
  ADD PRIMARY KEY (`KENDARAAN_ID`), ADD KEY `FK_RELATIONSHIP_4` (`STATUSKENDARAAN_ID`), ADD KEY `FK_RELATIONSHIP_42` (`SPOT_POOL_ID`), ADD KEY `FK_RELATIONSHIP_9` (`KATEGORIKENDARAAN_ID`);

--
-- Indexes for table `kepemilikansim`
--
ALTER TABLE `kepemilikansim`
  ADD PRIMARY KEY (`KEPEMILIKANSIM_ID`), ADD KEY `FK_RELATIONSHIP_41` (`PENGEMUDI_ID`), ADD KEY `FK_RELATIONSHIP_47` (`SIM_ID`);

--
-- Indexes for table `konversi_si_swat`
--
ALTER TABLE `konversi_si_swat`
  ADD KEY `id` (`id`);

--
-- Indexes for table `masterdetailtransaksiangkutsampah`
--
ALTER TABLE `masterdetailtransaksiangkutsampah`
  ADD PRIMARY KEY (`MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID`), ADD KEY `FK_RELATIONSHIP_21` (`PENGEMUDI_ID`), ADD KEY `FK_RELATIONSHIP_22` (`KENDARAAN_ID`);

--
-- Indexes for table `mastertrayek`
--
ALTER TABLE `mastertrayek`
  ADD PRIMARY KEY (`MASTERTRAYEK_ID`), ADD KEY `FK_RELATIONSHIP_37` (`MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID`), ADD KEY `RUTE_ID` (`RUTE_ID`);

--
-- Indexes for table `menu`
--
ALTER TABLE `menu`
  ADD PRIMARY KEY (`MENU_ID`), ADD KEY `FK_RELATIONSHIP_43` (`MENU_PARENT_ID`), ADD KEY `FK_RELATIONSHIP_44` (`STATUSMENU_ID`);

--
-- Indexes for table `pengemudi`
--
ALTER TABLE `pengemudi`
  ADD PRIMARY KEY (`PENGEMUDI_ID`), ADD KEY `FK_RELATIONSHIP_12` (`STATUSKEPEGAWAIAN_ID`), ADD KEY `FK_RELATIONSHIP_26` (`SPOT_POOL_ID`);

--
-- Indexes for table `pengguna`
--
ALTER TABLE `pengguna`
  ADD PRIMARY KEY (`PENGGUNA_ID`), ADD KEY `FK_RELATIONSHIP_51` (`HAKAKSES_ID`);

--
-- Indexes for table `retribusi`
--
ALTER TABLE `retribusi`
  ADD PRIMARY KEY (`ID_KATEGORI_RETRIBUSI`);

--
-- Indexes for table `riwayatperawatan`
--
ALTER TABLE `riwayatperawatan`
  ADD PRIMARY KEY (`RIWAYATPERAWATAN_ID`), ADD KEY `FK_RELATIONSHIP_6` (`STATUSRIWAYATPERAWATAN_ID`), ADD KEY `FK_RELATIONSHIP_7` (`KENDARAAN_ID`);

--
-- Indexes for table `rute`
--
ALTER TABLE `rute`
  ADD PRIMARY KEY (`RUTE_ID`), ADD KEY `FK_RELATIONSHIP_19` (`SPOT_ASAL_ID`), ADD KEY `FK_RELATIONSHIP_20` (`SPOT_TUJUAN_ID`), ADD KEY `FK_RELATIONSHIP_38` (`KATEGORIRUTE_ID`), ADD KEY `RUTE_ID` (`RUTE_ID`);

--
-- Indexes for table `sampahmasuktpa`
--
ALTER TABLE `sampahmasuktpa`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sim`
--
ALTER TABLE `sim`
  ADD PRIMARY KEY (`SIM_ID`);

--
-- Indexes for table `spot`
--
ALTER TABLE `spot`
  ADD PRIMARY KEY (`SPOT_ID`), ADD KEY `FK_RELATIONSHIP_18` (`KATEGORISPOT_ID`), ADD KEY `SPOT_ID` (`SPOT_ID`);

--
-- Indexes for table `statusdetailtransaksiangkutsampah`
--
ALTER TABLE `statusdetailtransaksiangkutsampah`
  ADD PRIMARY KEY (`STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID`);

--
-- Indexes for table `statusharitransaksi`
--
ALTER TABLE `statusharitransaksi`
  ADD PRIMARY KEY (`STATUSHARITRANSAKSI_ID`);

--
-- Indexes for table `statusjatahkitir`
--
ALTER TABLE `statusjatahkitir`
  ADD PRIMARY KEY (`STATUSJATAHKITIR_ID`);

--
-- Indexes for table `statuskendaraan`
--
ALTER TABLE `statuskendaraan`
  ADD PRIMARY KEY (`STATUSKENDARAAN_ID`);

--
-- Indexes for table `statuskepegawaian`
--
ALTER TABLE `statuskepegawaian`
  ADD PRIMARY KEY (`STATUSKEPEGAWAIAN_ID`);

--
-- Indexes for table `statusmenu`
--
ALTER TABLE `statusmenu`
  ADD PRIMARY KEY (`STATUSMENU_ID`);

--
-- Indexes for table `statusriwayatperawatan`
--
ALTER TABLE `statusriwayatperawatan`
  ADD PRIMARY KEY (`STATUSRIWAYATPERAWATAN_ID`);

--
-- Indexes for table `statustransaksiangkutsampah`
--
ALTER TABLE `statustransaksiangkutsampah`
  ADD PRIMARY KEY (`STATUSTRANSAKSIANGKUTSAMPAH_ID`);

--
-- Indexes for table `statustrayek`
--
ALTER TABLE `statustrayek`
  ADD PRIMARY KEY (`STATUSTRAYEK_ID`);

--
-- Indexes for table `tonase`
--
ALTER TABLE `tonase`
  ADD PRIMARY KEY (`TONASE_ID`), ADD KEY `TONASE_TANGGAL` (`TONASE_TANGGAL`);

--
-- Indexes for table `transaksiangkutsampah`
--
ALTER TABLE `transaksiangkutsampah`
  ADD PRIMARY KEY (`TRANSAKSIANGKUTSAMPAH_ID`), ADD KEY `FK_RELATIONSHIP_16` (`HARITRANSAKSI_ID`), ADD KEY `FK_RELATIONSHIP_24` (`KENDARAAN_ID`), ADD KEY `FK_RELATIONSHIP_35` (`STATUSTRANSAKSIANGKUTSAMPAH_ID`);

--
-- Indexes for table `trayek`
--
ALTER TABLE `trayek`
  ADD PRIMARY KEY (`TRAYEK_ID`), ADD KEY `FK_RELATIONSHIP_39` (`STATUSTRAYEK_ID`), ADD KEY `FK_RELATIONSHIP_45` (`DETAILTRANSAKSIANGKUTSAMPAH_ID`), ADD KEY `FK_RELATIONSHIP_46` (`RUTE_ID`), ADD KEY `PENGGUNA_ID` (`PENGGUNA_ID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `aplikasikendaraan`
--
ALTER TABLE `aplikasikendaraan`
  MODIFY `APLIKASIKENDARAAN_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=29;
--
-- AUTO_INCREMENT for table `bahanbakar`
--
ALTER TABLE `bahanbakar`
  MODIFY `BAHANBAKAR_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=7;
--
-- AUTO_INCREMENT for table `detailriwayatperawatan`
--
ALTER TABLE `detailriwayatperawatan`
  MODIFY `DETAILRIWAYATPERAWATAN_ID` bigint(20) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `detailtransaksiangkutsampah`
--
ALTER TABLE `detailtransaksiangkutsampah`
  MODIFY `DETAILTRANSAKSIANGKUTSAMPAH_ID` bigint(13) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=4346631;
--
-- AUTO_INCREMENT for table `dokumentasidetailriwayatperawatan`
--
ALTER TABLE `dokumentasidetailriwayatperawatan`
  MODIFY `DOKUMENTASIDETAILRIWAYATPERAWATAN_ID` bigint(20) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `dokumentasikendaraan`
--
ALTER TABLE `dokumentasikendaraan`
  MODIFY `DOKUMENTASIKENDARAAN_ID` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `dokumentasitrayek`
--
ALTER TABLE `dokumentasitrayek`
  MODIFY `DOKUMENTASITRAYEK_ID` bigint(20) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=2124174;
--
-- AUTO_INCREMENT for table `hakakses`
--
ALTER TABLE `hakakses`
  MODIFY `HAKAKSES_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=18;
--
-- AUTO_INCREMENT for table `hakaksesmenu`
--
ALTER TABLE `hakaksesmenu`
  MODIFY `HAKAKSESMENU_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=198;
--
-- AUTO_INCREMENT for table `haritransaksi`
--
ALTER TABLE `haritransaksi`
  MODIFY `HARITRANSAKSI_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=4421;
--
-- AUTO_INCREMENT for table `jatahkitir`
--
ALTER TABLE `jatahkitir`
  MODIFY `JATAHKITIR_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=3375949;
--
-- AUTO_INCREMENT for table `kategoribahanbakar`
--
ALTER TABLE `kategoribahanbakar`
  MODIFY `KATEGORIBAHANBAKAR_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT for table `kategorikendaraan`
--
ALTER TABLE `kategorikendaraan`
  MODIFY `KATEGORIKENDARAAN_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=257;
--
-- AUTO_INCREMENT for table `kategorirute`
--
ALTER TABLE `kategorirute`
  MODIFY `KATEGORIRUTE_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=6;
--
-- AUTO_INCREMENT for table `kategorispot`
--
ALTER TABLE `kategorispot`
  MODIFY `KATEGORISPOT_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=5;
--
-- AUTO_INCREMENT for table `kategorisumbersampah`
--
ALTER TABLE `kategorisumbersampah`
  MODIFY `KATEGORISUMBERSAMPAH_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=7;
--
-- AUTO_INCREMENT for table `kategorisumbersampahkendaraan`
--
ALTER TABLE `kategorisumbersampahkendaraan`
  MODIFY `KATEGORISUMBERSAMPAHKENDARAAN_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=1557;
--
-- AUTO_INCREMENT for table `kendaraan`
--
ALTER TABLE `kendaraan`
  MODIFY `KENDARAAN_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=1538;
--
-- AUTO_INCREMENT for table `kepemilikansim`
--
ALTER TABLE `kepemilikansim`
  MODIFY `KEPEMILIKANSIM_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=18;
--
-- AUTO_INCREMENT for table `konversi_si_swat`
--
ALTER TABLE `konversi_si_swat`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=32;
--
-- AUTO_INCREMENT for table `masterdetailtransaksiangkutsampah`
--
ALTER TABLE `masterdetailtransaksiangkutsampah`
  MODIFY `MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=1449;
--
-- AUTO_INCREMENT for table `mastertrayek`
--
ALTER TABLE `mastertrayek`
  MODIFY `MASTERTRAYEK_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=2540;
--
-- AUTO_INCREMENT for table `menu`
--
ALTER TABLE `menu`
  MODIFY `MENU_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=131;
--
-- AUTO_INCREMENT for table `pengemudi`
--
ALTER TABLE `pengemudi`
  MODIFY `PENGEMUDI_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=327;
--
-- AUTO_INCREMENT for table `pengguna`
--
ALTER TABLE `pengguna`
  MODIFY `PENGGUNA_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=72;
--
-- AUTO_INCREMENT for table `retribusi`
--
ALTER TABLE `retribusi`
  MODIFY `ID_KATEGORI_RETRIBUSI` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=196;
--
-- AUTO_INCREMENT for table `riwayatperawatan`
--
ALTER TABLE `riwayatperawatan`
  MODIFY `RIWAYATPERAWATAN_ID` bigint(13) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `rute`
--
ALTER TABLE `rute`
  MODIFY `RUTE_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=128539;
--
-- AUTO_INCREMENT for table `sampahmasuktpa`
--
ALTER TABLE `sampahmasuktpa`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=11172;
--
-- AUTO_INCREMENT for table `sim`
--
ALTER TABLE `sim`
  MODIFY `SIM_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=8;
--
-- AUTO_INCREMENT for table `spot`
--
ALTER TABLE `spot`
  MODIFY `SPOT_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=950;
--
-- AUTO_INCREMENT for table `statusdetailtransaksiangkutsampah`
--
ALTER TABLE `statusdetailtransaksiangkutsampah`
  MODIFY `STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT for table `statusharitransaksi`
--
ALTER TABLE `statusharitransaksi`
  MODIFY `STATUSHARITRANSAKSI_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT for table `statusjatahkitir`
--
ALTER TABLE `statusjatahkitir`
  MODIFY `STATUSJATAHKITIR_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT for table `statuskendaraan`
--
ALTER TABLE `statuskendaraan`
  MODIFY `STATUSKENDARAAN_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=5;
--
-- AUTO_INCREMENT for table `statuskepegawaian`
--
ALTER TABLE `statuskepegawaian`
  MODIFY `STATUSKEPEGAWAIAN_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=4;
--
-- AUTO_INCREMENT for table `statusmenu`
--
ALTER TABLE `statusmenu`
  MODIFY `STATUSMENU_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT for table `statusriwayatperawatan`
--
ALTER TABLE `statusriwayatperawatan`
  MODIFY `STATUSRIWAYATPERAWATAN_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT for table `statustransaksiangkutsampah`
--
ALTER TABLE `statustransaksiangkutsampah`
  MODIFY `STATUSTRANSAKSIANGKUTSAMPAH_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT for table `statustrayek`
--
ALTER TABLE `statustrayek`
  MODIFY `STATUSTRAYEK_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=4;
--
-- AUTO_INCREMENT for table `tonase`
--
ALTER TABLE `tonase`
  MODIFY `TONASE_ID` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=365;
--
-- AUTO_INCREMENT for table `transaksiangkutsampah`
--
ALTER TABLE `transaksiangkutsampah`
  MODIFY `TRANSAKSIANGKUTSAMPAH_ID` bigint(13) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=4040491;
--
-- AUTO_INCREMENT for table `trayek`
--
ALTER TABLE `trayek`
  MODIFY `TRAYEK_ID` bigint(20) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=7975577;
--
-- Constraints for dumped tables
--

--
-- Constraints for table `bahanbakar`
--
ALTER TABLE `bahanbakar`
ADD CONSTRAINT `FK_RELATIONSHIP_13` FOREIGN KEY (`KATEGORIBAHANBAKAR_ID`) REFERENCES `kategoribahanbakar` (`KATEGORIBAHANBAKAR_ID`);

--
-- Constraints for table `detailriwayatperawatan`
--
ALTER TABLE `detailriwayatperawatan`
ADD CONSTRAINT `FK_RELATIONSHIP_5` FOREIGN KEY (`RIWAYATPERAWATAN_ID`) REFERENCES `riwayatperawatan` (`RIWAYATPERAWATAN_ID`);

--
-- Constraints for table `detailtransaksiangkutsampah`
--
ALTER TABLE `detailtransaksiangkutsampah`
ADD CONSTRAINT `FK_RELATIONSHIP_17` FOREIGN KEY (`TRANSAKSIANGKUTSAMPAH_ID`) REFERENCES `transaksiangkutsampah` (`TRANSAKSIANGKUTSAMPAH_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_23` FOREIGN KEY (`PENGEMUDI_ID`) REFERENCES `pengemudi` (`PENGEMUDI_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_30` FOREIGN KEY (`STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID`) REFERENCES `statusdetailtransaksiangkutsampah` (`STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_31` FOREIGN KEY (`MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID`) REFERENCES `masterdetailtransaksiangkutsampah` (`MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID`);

--
-- Constraints for table `dokumentasidetailriwayatperawatan`
--
ALTER TABLE `dokumentasidetailriwayatperawatan`
ADD CONSTRAINT `FK_RELATIONSHIP_49` FOREIGN KEY (`DETAILRIWAYATPERAWATAN_ID`) REFERENCES `detailriwayatperawatan` (`DETAILRIWAYATPERAWATAN_ID`);

--
-- Constraints for table `dokumentasikendaraan`
--
ALTER TABLE `dokumentasikendaraan`
ADD CONSTRAINT `FK_RELATIONSHIP_53` FOREIGN KEY (`KENDARAAN_ID`) REFERENCES `kendaraan` (`KENDARAAN_ID`);

--
-- Constraints for table `dokumentasitrayek`
--
ALTER TABLE `dokumentasitrayek`
ADD CONSTRAINT `FK_RELATIONSHIP_48` FOREIGN KEY (`TRAYEK_ID`) REFERENCES `trayek` (`TRAYEK_ID`);

--
-- Constraints for table `hakaksesmenu`
--
ALTER TABLE `hakaksesmenu`
ADD CONSTRAINT `FK_RELATIONSHIP_2` FOREIGN KEY (`HAKAKSES_ID`) REFERENCES `hakakses` (`HAKAKSES_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_3` FOREIGN KEY (`MENU_ID`) REFERENCES `menu` (`MENU_ID`);

--
-- Constraints for table `haritransaksi`
--
ALTER TABLE `haritransaksi`
ADD CONSTRAINT `FK_RELATIONSHIP_15` FOREIGN KEY (`STATUSHARITRANSAKSI_ID`) REFERENCES `statusharitransaksi` (`STATUSHARITRANSAKSI_ID`);

--
-- Constraints for table `jatahkitir`
--
ALTER TABLE `jatahkitir`
ADD CONSTRAINT `RELATIONSHIP_54` FOREIGN KEY (`STATUSJATAHKITIR_ID`) REFERENCES `statusjatahkitir` (`STATUSJATAHKITIR_ID`),
ADD CONSTRAINT `RELATIONSHIP_60` FOREIGN KEY (`KENDARAAN_ID`) REFERENCES `kendaraan` (`KENDARAAN_ID`),
ADD CONSTRAINT `RELATIONSHIP_64` FOREIGN KEY (`SPOT_ID`) REFERENCES `spot` (`SPOT_ID`);

--
-- Constraints for table `kategorikendaraan`
--
ALTER TABLE `kategorikendaraan`
ADD CONSTRAINT `FK_RELATIONSHIP_10` FOREIGN KEY (`BAHANBAKAR_ID`) REFERENCES `bahanbakar` (`BAHANBAKAR_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_8` FOREIGN KEY (`APLIKASIKENDARAAN_ID`) REFERENCES `aplikasikendaraan` (`APLIKASIKENDARAAN_ID`);

--
-- Constraints for table `kategorisumbersampahkendaraan`
--
ALTER TABLE `kategorisumbersampahkendaraan`
ADD CONSTRAINT `FK_RELATIONSHIP_50` FOREIGN KEY (`KATEGORISUMBERSAMPAH_ID`) REFERENCES `kategorisumbersampah` (`KATEGORISUMBERSAMPAH_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_52` FOREIGN KEY (`KENDARAAN_ID`) REFERENCES `kendaraan` (`KENDARAAN_ID`);

--
-- Constraints for table `kendaraan`
--
ALTER TABLE `kendaraan`
ADD CONSTRAINT `FK_RELATIONSHIP_4` FOREIGN KEY (`STATUSKENDARAAN_ID`) REFERENCES `statuskendaraan` (`STATUSKENDARAAN_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_42` FOREIGN KEY (`SPOT_POOL_ID`) REFERENCES `spot` (`SPOT_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_9` FOREIGN KEY (`KATEGORIKENDARAAN_ID`) REFERENCES `kategorikendaraan` (`KATEGORIKENDARAAN_ID`);

--
-- Constraints for table `kepemilikansim`
--
ALTER TABLE `kepemilikansim`
ADD CONSTRAINT `FK_RELATIONSHIP_41` FOREIGN KEY (`PENGEMUDI_ID`) REFERENCES `pengemudi` (`PENGEMUDI_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_47` FOREIGN KEY (`SIM_ID`) REFERENCES `sim` (`SIM_ID`);

--
-- Constraints for table `masterdetailtransaksiangkutsampah`
--
ALTER TABLE `masterdetailtransaksiangkutsampah`
ADD CONSTRAINT `FK_RELATIONSHIP_21` FOREIGN KEY (`PENGEMUDI_ID`) REFERENCES `pengemudi` (`PENGEMUDI_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_22` FOREIGN KEY (`KENDARAAN_ID`) REFERENCES `kendaraan` (`KENDARAAN_ID`);

--
-- Constraints for table `mastertrayek`
--
ALTER TABLE `mastertrayek`
ADD CONSTRAINT `FK_RELATIONSHIP_28` FOREIGN KEY (`RUTE_ID`) REFERENCES `rute` (`RUTE_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_37` FOREIGN KEY (`MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID`) REFERENCES `masterdetailtransaksiangkutsampah` (`MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID`);

--
-- Constraints for table `menu`
--
ALTER TABLE `menu`
ADD CONSTRAINT `FK_RELATIONSHIP_43` FOREIGN KEY (`MENU_PARENT_ID`) REFERENCES `menu` (`MENU_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_44` FOREIGN KEY (`STATUSMENU_ID`) REFERENCES `statusmenu` (`STATUSMENU_ID`);

--
-- Constraints for table `pengemudi`
--
ALTER TABLE `pengemudi`
ADD CONSTRAINT `FK_RELATIONSHIP_12` FOREIGN KEY (`STATUSKEPEGAWAIAN_ID`) REFERENCES `statuskepegawaian` (`STATUSKEPEGAWAIAN_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_26` FOREIGN KEY (`SPOT_POOL_ID`) REFERENCES `spot` (`SPOT_ID`);

--
-- Constraints for table `pengguna`
--
ALTER TABLE `pengguna`
ADD CONSTRAINT `FK_RELATIONSHIP_51` FOREIGN KEY (`HAKAKSES_ID`) REFERENCES `hakakses` (`HAKAKSES_ID`);

--
-- Constraints for table `riwayatperawatan`
--
ALTER TABLE `riwayatperawatan`
ADD CONSTRAINT `FK_RELATIONSHIP_6` FOREIGN KEY (`STATUSRIWAYATPERAWATAN_ID`) REFERENCES `statusriwayatperawatan` (`STATUSRIWAYATPERAWATAN_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_7` FOREIGN KEY (`KENDARAAN_ID`) REFERENCES `kendaraan` (`KENDARAAN_ID`);

--
-- Constraints for table `rute`
--
ALTER TABLE `rute`
ADD CONSTRAINT `FK_RELATIONSHIP_19` FOREIGN KEY (`SPOT_ASAL_ID`) REFERENCES `spot` (`SPOT_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_20` FOREIGN KEY (`SPOT_TUJUAN_ID`) REFERENCES `spot` (`SPOT_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_38` FOREIGN KEY (`KATEGORIRUTE_ID`) REFERENCES `kategorirute` (`KATEGORIRUTE_ID`);

--
-- Constraints for table `spot`
--
ALTER TABLE `spot`
ADD CONSTRAINT `FK_RELATIONSHIP_18` FOREIGN KEY (`KATEGORISPOT_ID`) REFERENCES `kategorispot` (`KATEGORISPOT_ID`);

--
-- Constraints for table `transaksiangkutsampah`
--
ALTER TABLE `transaksiangkutsampah`
ADD CONSTRAINT `FK_RELATIONSHIP_16` FOREIGN KEY (`HARITRANSAKSI_ID`) REFERENCES `haritransaksi` (`HARITRANSAKSI_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_24` FOREIGN KEY (`KENDARAAN_ID`) REFERENCES `kendaraan` (`KENDARAAN_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_35` FOREIGN KEY (`STATUSTRANSAKSIANGKUTSAMPAH_ID`) REFERENCES `statustransaksiangkutsampah` (`STATUSTRANSAKSIANGKUTSAMPAH_ID`);

--
-- Constraints for table `trayek`
--
ALTER TABLE `trayek`
ADD CONSTRAINT `FK_RELATIONSHIP_39` FOREIGN KEY (`STATUSTRAYEK_ID`) REFERENCES `statustrayek` (`STATUSTRAYEK_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_45` FOREIGN KEY (`DETAILTRANSAKSIANGKUTSAMPAH_ID`) REFERENCES `detailtransaksiangkutsampah` (`DETAILTRANSAKSIANGKUTSAMPAH_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_46` FOREIGN KEY (`RUTE_ID`) REFERENCES `rute` (`RUTE_ID`),
ADD CONSTRAINT `FK_RELATIONSHIP_69` FOREIGN KEY (`PENGGUNA_ID`) REFERENCES `pengguna` (`PENGGUNA_ID`);
SET FOREIGN_KEY_CHECKS=1;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
