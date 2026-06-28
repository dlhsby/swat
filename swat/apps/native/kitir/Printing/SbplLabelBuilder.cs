using System.Text;

namespace SwatKitirPrinter.Printing;

/// <summary>
/// Builds SATO Barcode Programming Language (SBPL) for kitir labels, reproducing
/// the legacy <c>BarcodePrinter/Form1.cs</c> template: per label, one or two
/// PDF417 barcodes (<c>&lt;ESC&gt;BK</c>) each with a human-readable caption
/// (<c>&lt;ESC&gt;XS</c>), wrapped in a job (<c>&lt;ESC&gt;A … &lt;ESC&gt;Z</c>).
/// </summary>
public sealed class SbplLabelBuilder
{
    private const string Esc = "<ESC>";
    private readonly LabelConfig _config;

    public SbplLabelBuilder(LabelConfig config)
    {
        _config = config;
    }

    /// <summary>Human-readable SBPL (keeps the literal <c>&lt;ESC&gt;</c> token) for dry-run inspection.</summary>
    public string BuildReadable(IReadOnlyList<string> codes)
    {
        if (codes.Count == 0)
        {
            return string.Empty;
        }
        var sb = new StringBuilder();
        var perLabel = _config.TwoUp ? 2 : 1;
        for (var i = 0; i < codes.Count; i += perLabel)
        {
            var first = codes[i];
            var second = _config.TwoUp && i + 1 < codes.Count ? codes[i + 1] : null;
            AppendLabel(sb, first, second);
        }
        return sb.ToString();
    }

    /// <summary>Printer-ready SBPL with <c>&lt;ESC&gt;</c> resolved to the ESC byte (0x1B).</summary>
    public string Build(IReadOnlyList<string> codes) =>
        BuildReadable(codes).Replace(Esc, "\x1B");

    /// <summary>Appends one label job: barcode + caption in slot 1, and slot 2 when two-up.</summary>
    private void AppendLabel(StringBuilder sb, string code1, string? code2)
    {
        sb.AppendLine();
        sb.AppendLine($"{Esc}A");
        AppendSlot(sb, _config.Slot1, code1);
        if (code2 is not null)
        {
            AppendSlot(sb, _config.Slot2, code2);
        }
        sb.AppendLine($"{Esc}Z");
    }

    /// <summary>One kitir in a slot: PDF417 payload + text caption at the slot's dot positions.</summary>
    private void AppendSlot(StringBuilder sb, LabelSlot slot, string code)
    {
        var payload = _config.EncodePrefix + code;
        sb.AppendLine($"{Esc}H{slot.BarcodeH}{Esc}V{slot.BarcodeV}{Esc}BK{_config.Pdf417Params}{payload}");
        sb.AppendLine($"{Esc}H{slot.TextH}{Esc}V{slot.TextV}{Esc}XS{code}");
    }
}
