var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => Results.Text("ok\n", "text/plain; charset=utf-8"));
app.MapGet("/health", () => Results.Text("ok\n", "text/plain; charset=utf-8"));

app.Run();
