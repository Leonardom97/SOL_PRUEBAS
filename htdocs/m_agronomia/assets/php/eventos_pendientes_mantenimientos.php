<?php
// SSE: notificaciones en tiempo real de pendientes de mantenimientos
header('Content-Type: text/event-stream; charset=utf-8');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('X-Accel-Buffering: no'); // Nginx
// Desactivar compresión/buffering en PHP/Apache si aplica
if (function_exists('apache_setenv')) { @apache_setenv('no-gzip', '1'); }
@ini_set('zlib.output_compression', '0');
@ini_set('implicit_flush', '1');
@ini_set('output_buffering', 'off');

ignore_user_abort(true);
set_time_limit(0);

// Cerrar sesión si estuviera abierta para no bloquear
if (session_status() === PHP_SESSION_ACTIVE) { session_write_close(); }

// Vaciar buffers para flush inmediato
while (ob_get_level() > 0) { @ob_end_flush(); }
ob_implicit_flush(true);

function sse_send(string $event, $data): void {
    echo "event: {$event}\n";
    echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n\n";
    @flush();
}

function contar_pendientes(PDO $pg): array {
    $q = "
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_type='BASE TABLE'
        AND table_schema NOT IN ('pg_catalog','information_schema')
        AND lower(table_name) IN ('mantenimientos','mantenimientos_temp')
      ORDER BY CASE lower(table_name) WHEN 'mantenimientos' THEN 0 ELSE 1 END
    ";
    $cand = $pg->query($q)->fetchAll(PDO::FETCH_ASSOC);

    $total = 0;
    $detalles = [];

    foreach ($cand as $t) {
        $schema = $t['table_schema'];
        $table  = $t['table_name'];

        $st = $pg->prepare("
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = ? AND table_name = ?
        ");
        $st->execute([$schema, $table]);
        $cols = $st->fetchAll(PDO::FETCH_COLUMN) ?: [];
        $map = [];
        foreach ($cols as $c) $map[strtolower($c)] = $c;

        $full = "\"$schema\"" . '.' . "\"$table\"";

        if (!isset($map['verificacion'])) {
            $count = (int)$pg->query("SELECT COUNT(*) FROM $full")->fetchColumn();
            $total += $count;
            $detalles[] = ['tabla'=>"$schema.$table", 'total'=>$count, 'fallback'=>'sin_columna_verificacion'];
            continue;
        }

        $verifCol = $map['verificacion'];
        $where = "LOWER(COALESCE(\"$verifCol\", 'pendiente')) = 'pendiente'";

        $sql = "SELECT COUNT(*) FROM $full WHERE $where";
        $count = (int)$pg->query($sql)->fetchColumn();

        $total += $count;
        $detalles[] = ['tabla'=>"$schema.$table", 'total'=>$count];
    }

    return ['total'=>$total, 'detalles'=>$detalles];
}

require_once __DIR__ . '/db_temporal.php';
if (!isset($pg)) {
    sse_send('error', ['message'=>'db_temporal.php no define $pg']);
    exit;
}
$pg->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Evento inicial
try {
    $estado = contar_pendientes($pg);
    sse_send('init', $estado);
    $ultimoTotal = (int)$estado['total'];
} catch (Throwable $e) {
    sse_send('error', ['message'=>$e->getMessage()]);
    exit;
}

// Bucle SSE
$inicio = time();
$timeoutSegundos = 300; // 5 min
$intervalo = 5; // seg

while (!connection_aborted()) {
    if ((time() - $inicio) > $timeoutSegundos) {
        sse_send('end', ['reason' => 'timeout']);
        break;
    }

    try {
        $estado = contar_pendientes($pg);
        $total = (int)$estado['total'];

        if ($total !== $ultimoTotal) {
            $ultimoTotal = $total;
            sse_send('update', $estado);
        } else {
            sse_send('ping', ['ts' => time()]);
        }
    } catch (Throwable $e) {
        sse_send('error', ['message'=>$e->getMessage()]);
        break;
    }

    sleep($intervalo);
}