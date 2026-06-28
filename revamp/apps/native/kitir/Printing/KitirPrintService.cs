using System.IO;
using System.Text;

namespace SwatKitirPrinter.Printing;

/// <summary>Orchestrates building kitir SBPL and either spooling it or dumping a dry-run .prn.</summary>
public sealed class KitirPrintService
{
    private readonly AppConfig _config;
    private readonly SbplLabelBuilder _builder;

    public KitirPrintService(AppConfig config)
    {
        _config = config;
        _builder = new SbplLabelBuilder(config.Label);
    }

    /// <summary>Sends the codes to the configured SATO queue as raw SBPL.</summary>
    public void Print(IReadOnlyList<string> codes)
    {
        if (codes.Count == 0)
        {
            return;
        }
        RawPrinterHelper.SendString(_config.PrinterName, _builder.Build(codes));
    }

    /// <summary>
    /// Writes the printer-ready SBPL bytes to a .prn file instead of the spooler
    /// (no hardware needed) and returns the path. Used by the "Uji cetak" toggle.
    /// </summary>
    public string DryRunToFile(IReadOnlyList<string> codes)
    {
        var dir = Path.Combine(AppContext.BaseDirectory, "dryrun");
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, $"kitir-{codes.Count}.prn");
        File.WriteAllText(path, _builder.Build(codes), Encoding.ASCII);
        return path;
    }

    /// <summary>Human-readable SBPL (with the literal &lt;ESC&gt; token) for on-screen preview.</summary>
    public string Preview(IReadOnlyList<string> codes) => _builder.BuildReadable(codes);
}
