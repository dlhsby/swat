namespace SwatKitirPrinter.Api;

/// <summary>
/// A user-safe API failure. Carries the machine-readable <see cref="Code"/>
/// (e.g. <c>mustChangePassword</c>) and a localized message; never the raw body.
/// </summary>
public sealed class ApiException : Exception
{
    public string Code { get; }

    public ApiException(string code, string message) : base(message)
    {
        Code = code;
    }
}
