using System.IO;
using System.Runtime.InteropServices;

namespace SwatKitirPrinter.Printing;

/// <summary>
/// Sends raw bytes straight to a Windows print queue via the winspool spooler,
/// bypassing the GDI driver (datatype "RAW"). Ported verbatim from the legacy
/// SWAT Barcode Printer (<c>BarcodePrinter/Form1.cs</c>) — the proven path for
/// shipping SBPL to the SATO label printer.
/// </summary>
public static class RawPrinterHelper
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    private class DOCINFOA
    {
        [MarshalAs(UnmanagedType.LPStr)] public string? pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string? pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string? pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    private static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    private static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    private static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    private static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    private static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    private static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    private static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    /// <summary>Sends an unmanaged byte buffer to the named printer. Returns false on failure.</summary>
    private static bool SendBytesToPrinter(string szPrinterName, IntPtr pBytes, int dwCount)
    {
        var di = new DOCINFOA { pDocName = "SWAT Kitir", pDataType = "RAW" };
        var success = false;

        if (OpenPrinter(szPrinterName, out var hPrinter, IntPtr.Zero))
        {
            if (StartDocPrinter(hPrinter, 1, di))
            {
                if (StartPagePrinter(hPrinter))
                {
                    success = WritePrinter(hPrinter, pBytes, dwCount, out _);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return success;
    }

    /// <summary>
    /// Sends an SBPL string as ANSI bytes to the named printer queue.
    /// Throws <see cref="IOException"/> when the spooler rejects the job.
    /// </summary>
    public static void SendString(string printerName, string data)
    {
        var bytes = Marshal.StringToCoTaskMemAnsi(data);
        try
        {
            // The ANSI string is null-terminated; the printer wants only the payload.
            var count = System.Text.Encoding.ASCII.GetByteCount(data);
            if (!SendBytesToPrinter(printerName, bytes, count))
            {
                var code = Marshal.GetLastWin32Error();
                throw new IOException(
                    $"Gagal mengirim ke printer \"{printerName}\" (kode {code}). " +
                    "Pastikan driver SATO terpasang dan antrean printer aktif.");
            }
        }
        finally
        {
            Marshal.FreeCoTaskMem(bytes);
        }
    }
}
