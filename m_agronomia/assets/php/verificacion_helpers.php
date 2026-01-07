<?php

/**
 * supervision_helpers.php (o verificacion_helpers.php)
 *
 * Funciones de apoyo para gestión de base de datos y normalización de datos.
 * Principalmente utilizado para asegurar la existencia de columnas de supervisión
 * y normalizar valores de estado.
 */

/**
 * Valida y encierra el identificador de columna entre comillas dobles.
 * 
 * @param string $name Nombre del identificador.
 * @return string Identificador entre comillas.
 * @throws RuntimeException Si el identificador no es válido.
 */
function vh_quote_ident(string $name): string
{
    if (!preg_match('/^[A-Za-z0-9_]+$/', $name)) {
        throw new RuntimeException("Identificador inválido: $name");
    }
    return '"' . $name . '"';
}

/**
 * Asegura que la columna de supervisión exista en la tabla especificada.
 * Si no existe, intenta crearla con valor por defecto 'pendiente'.
 * 
 * @param PDO $pg Conexión a la base de datos.
 * @param string $schema Esquema de la tabla.
 * @param string $table Nombre de la tabla.
 * @return bool True si la operación fue exitosa.
 */
function ensure_supervision_column(PDO $pg, string $schema, string $table): bool
{
    $sql = "SELECT 1 FROM information_schema.columns
            WHERE table_schema = :s AND table_name = :t AND column_name = 'supervision'";
    $st = $pg->prepare($sql);
    $st->execute(['s' => $schema, 't' => $table]);
    if ($st->fetchColumn()) return true;

    $full = vh_quote_ident($schema) . '.' . vh_quote_ident($table);
    $pg->exec("ALTER TABLE $full ADD COLUMN supervision VARCHAR(20) DEFAULT 'pendiente'");
    return true;
}

/**
 * Normaliza el valor de la columna supervision.
 * 
 * @param string|null $v Valor actual.
 * @param bool $isAdmin Si el usuario es administrador.
 * @return string Valor normalizado: 'pendiente', 'aprobado' o 'rechazado'.
 */
function normalize_supervision(?string $v, bool $isAdmin): string
{
    $v = trim((string)$v);
    if ($v === '') return $isAdmin ? 'aprobado' : 'pendiente';
    $v = strtolower($v);
    if (!in_array($v, ['pendiente', 'aprobado', 'rechazado'], true)) {
        return 'pendiente';
    }
    return $v;
}
