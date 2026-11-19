<?php
/**
 * AuiPark · Página de estado del servidor (Apache2 + PHP 8.3)
 * Comprueba Apache, el certificado SSL, la app en Vercel (/api/health → Supabase)
 * y las copias de seguridad diarias.
 */
declare(strict_types=1);

$vercelHost = getenv('VERCEL_HOST') ?: '';
$zabbixUrl  = getenv('ZABBIX_URL') ?: 'http://localhost:8081';

// 1) App en Vercel + base de datos de Supabase
$app = ['ok' => false, 'ms' => null, 'detail' => 'VERCEL_HOST sin configurar'];
if ($vercelHost !== '') {
    $start = microtime(true);
    $ch = curl_init("https://{$vercelHost}/api/health");
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8]);
    $body = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $json = json_decode((string) $body, true);
    $app = [
        'ok'     => $code === 200 && ($json['status'] ?? '') === 'ok',
        'ms'     => (int) round((microtime(true) - $start) * 1000),
        'detail' => $code ? "HTTP {$code} · base de datos: " . ($json['database'] ?? 'desconocida') : 'Sin respuesta',
    ];
}

// 2) Certificado SSL
$cert = @openssl_x509_parse((string) @file_get_contents('/etc/apache2/ssl/auipark.crt'));
$certDays = $cert ? (int) floor(($cert['validTo_time_t'] - time()) / 86400) : null;

// 3) Copias de seguridad
$backups = glob('/backups/*.sql.gz') ?: [];
usort($backups, fn ($a, $b) => filemtime($b) <=> filemtime($a));
$lastBackup = $backups[0] ?? null;
$backupOk = $lastBackup && (time() - filemtime($lastBackup)) < 26 * 3600;

$h = fn ($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
$badge = fn (bool $ok) => $ok ? '<span class="ok">Operativo</span>' : '<span class="ko">Revisar</span>';
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="60">
  <title>AuiPark · Estado del servidor</title>
  <style>
    :root { --blue:#1d4ed8; --ink:#0f172a; --muted:#64748b; --bg:#f6f8fb; --line:#e4e9f1; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, "Segoe UI", Arial, sans-serif; background:var(--bg); color:var(--ink); }
    header { background:var(--blue); color:#fff; padding:28px 0; }
    .wrap { max-width:1000px; margin:0 auto; padding:0 20px; }
    h1 { margin:0; font-size:28px; } header p { margin:6px 0 0; opacity:.85; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:16px; margin:24px 0; }
    .card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:18px; }
    .card h2 { margin:0 0 10px; font-size:17px; display:flex; justify-content:space-between; align-items:center; }
    .card p, .card li { margin:4px 0; color:var(--muted); font-size:14px; }
    .card ul { padding-left:18px; margin:6px 0 0; }
    .ok, .ko { font-size:12px; font-weight:700; padding:3px 10px; border-radius:99px; }
    .ok { background:#ecfdf5; color:#059669; } .ko { background:#fef2f2; color:#dc2626; }
    .btn { display:inline-block; background:var(--blue); color:#fff; text-decoration:none; padding:10px 16px; border-radius:10px; font-weight:600; margin:4px 6px 0 0; }
    .btn.alt { background:#fff; color:var(--blue); border:1px solid var(--blue); }
    code { background:#eef2ff; padding:1px 6px; border-radius:6px; }
    footer { color:var(--muted); font-size:13px; padding:10px 0 30px; }
  </style>
</head>
<body>
<header>
  <div class="wrap">
    <h1>AuiPark · Estado del servidor</h1>
    <p>Apache2 + PHP <?= $h(PHP_VERSION) ?> en Docker · se actualiza cada minuto · <?= $h(date('d/m/Y H:i:s')) ?></p>
  </div>
</header>
<main class="wrap">
  <p>
    <a class="btn" href="/app/">Abrir la aplicación (proxy a Vercel)</a>
    <?php if ($vercelHost): ?><a class="btn alt" href="https://<?= $h($vercelHost) ?>" target="_blank" rel="noopener">Abrir en Vercel</a><?php endif; ?>
    <a class="btn alt" href="<?= $h($zabbixUrl) ?>" target="_blank" rel="noopener">Monitorización (Zabbix)</a>
  </p>

  <div class="grid">
    <section class="card">
      <h2>Servidor web <?= $badge(true) ?></h2>
      <p><?= $h($_SERVER['SERVER_SOFTWARE'] ?? 'Apache') ?> · PHP <?= $h(PHP_VERSION) ?></p>
      <p>Conexión: <?= !empty($_SERVER['HTTPS']) ? 'HTTPS (' . $h($_SERVER['SSL_PROTOCOL'] ?? 'TLS') . ')' : 'HTTP' ?></p>
    </section>

    <section class="card">
      <h2>Certificado SSL <?= $badge($certDays !== null && $certDays > 15) ?></h2>
      <?php if ($cert): ?>
        <p>Emitido para: <code><?= $h($cert['subject']['CN'] ?? '') ?></code> (autofirmado)</p>
        <p>Caduca el <?= $h(date('d/m/Y', $cert['validTo_time_t'])) ?> · quedan <?= $h($certDays) ?> días</p>
      <?php else: ?>
        <p>No se encuentra el certificado.</p>
      <?php endif; ?>
    </section>

    <section class="card">
      <h2>Aplicación y base de datos <?= $badge($app['ok']) ?></h2>
      <p>Vercel: <code><?= $h($vercelHost ?: '—') ?></code></p>
      <p><?= $h($app['detail']) ?><?= $app['ms'] !== null ? ' · ' . $h($app['ms']) . ' ms' : '' ?></p>
    </section>

    <section class="card">
      <h2>Copias de seguridad <?= $badge($backupOk) ?></h2>
      <?php if ($lastBackup): ?>
        <p>Última: <code><?= $h(basename($lastBackup)) ?></code></p>
        <p><?= $h(date('d/m/Y H:i', filemtime($lastBackup))) ?> · <?= $h(round(filesize($lastBackup) / 1024, 1)) ?> KB · <?= count($backups) ?> copias guardadas</p>
      <?php else: ?>
        <p>Todavía no hay copias en <code>/backups</code>.</p>
      <?php endif; ?>
    </section>
  </div>

  <?php if ($backups): ?>
  <section class="card">
    <h2>Últimas copias (pg_dump de Supabase)</h2>
    <ul>
      <?php foreach (array_slice($backups, 0, 7) as $b): ?>
        <li><code><?= $h(basename($b)) ?></code> · <?= $h(round(filesize($b) / 1024, 1)) ?> KB</li>
      <?php endforeach; ?>
    </ul>
  </section>
  <?php endif; ?>
</main>
<footer class="wrap">AuiPark · ASIX · Infraestructura: Apache2 + PHP + SSL · Zabbix 7.0 · backup diario con pg_dump</footer>
</body>
</html>
