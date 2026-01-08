  $idCol = detect_id_column($pg,$schema,$baseTable,$entity);

  // Verifica si está en temp
  $st = $pg->prepare("SELECT 1 FROM ".opa_qident($schema).".".opa_qident($tempTable)." WHERE ".opa_qident($idCol)." = :id LIMIT 1");
  $st->execute(['id'=>$idValue]);
  $existsTemp = (bool)$st->fetchColumn();

  $moved = false;
  $deletedTemp = false;
  $updatedBase = false;

  $pg->beginTransaction();
  try {
  if ($existsTemp) {
  // Intersección de columnas (sin duplicar). Queremos todas menos quizá 'verificacion' para forzar 'aprobado'.
  $inter = [];
  foreach ($colsTemp as $k=>$orig) {
  if (isset($colsBase[$k])) {
  $inter[$k] = $orig; // nombre real del temp (asumimos coincide)
  }
  }

  // Si existe columna verificacion, la forzamos a aprobado al insertar.
  $hasVerif = isset($inter['verificacion']);

  // Construye lista de columnas para insert
  $colNamesBase = [];
  $selectExprs = [];
  foreach ($inter as $lk=>$real) {
  $colNamesBase[] = opa_qident($colsBase[$lk]); // nombre en base
  if ($hasVerif && $lk==='verificacion') {
  $selectExprs[] = $pg->quote('aprobado') . " AS " . opa_qident($real);
  } else {
  $selectExprs[] = opa_qident($real);
  }
  }

  if (!in_array(opa_qident($idCol), $colNamesBase, true)) {
  // Asegura que la PK esté incluida
  if(isset($colsTemp[strtolower($idCol)]) && isset($colsBase[strtolower($idCol)])){
  $colNamesBase[] = opa_qident($idCol);
  $selectExprs[] = opa_qident($idCol);
  }
  }

  if (empty($colNamesBase)) {
  throw new RuntimeException("No hay columnas compatibles para mover $entity id=$idValue");
  }

  // Construye ON CONFLICT para upsert
  $assignments = [];
  foreach ($colNamesBase as $c) {
  $cPlain = trim($c,'"');
  if ($cPlain === $idCol) continue;
  $assignments[] = "$c = EXCLUDED.$c";
  }
  $onConflict = "ON CONFLICT (".opa_qident($idCol).") DO UPDATE SET ".implode(', ',$assignments);

  $sqlInsert = "INSERT INTO ".opa_qident($schema).".".opa_qident($baseTable)." (".
  implode(', ',$colNamesBase).")
  SELECT ".implode(', ',$selectExprs)."
  FROM ".opa_qident($schema).".".opa_qident($tempTable)."
  WHERE ".opa_qident($idCol)." = :id
  $onConflict";
  $stI = $pg->prepare($sqlInsert);
  $stI->execute(['id'=>$idValue]);
  $moved = ($stI->rowCount() > 0);

  // Borra de temp
  $stD = $pg->prepare("DELETE FROM ".opa_qident($schema).".".opa_qident($tempTable)." WHERE ".opa_qident($idCol)." = :id");
  $stD->execute(['id'=>$idValue]);
  $deletedTemp = ($stD->rowCount() > 0);
  } else {
  // No está en temp => sólo intenta marcar aprobado en base si existe
  $stU = $pg->prepare("UPDATE ".opa_qident($schema).".".opa_qident($baseTable)."
  SET verificacion='aprobado'
  WHERE ".opa_qident($idCol)." = :id");
  $stU->execute(['id'=>$idValue]);
  $updatedBase = ($stU->rowCount() > 0);
  }

  // Asegura estado aprobado en base si el registro existe allí
  if ($moved || $updatedBase) {
  $stV = $pg->prepare("UPDATE ".opa_qident($schema).".".opa_qident($baseTable)."
  SET verificacion='aprobado'
  WHERE ".opa_qident($idCol)." = :id");
  $stV->execute(['id'=>$idValue]);
  }

  $pg->commit();
  return [
  'success' => true,
  'moved' => $moved,
  'deleted_temp' => $deletedTemp,
  'updated_base' => $updatedBase,
  'id' => $idValue,
  'message' => $moved ? 'Registro aprobado y movido a tabla base'
  : ($updatedBase ? 'Registro ya estaba en base, marcado aprobado'
  : 'No se encontró el registro en temporal ni en base')
  ];
  } catch (Throwable $e) {
  $pg->rollBack();
  return [
  'success'=>false,
  'error'=>'exception',
  'message'=>$e->getMessage(),
  'id'=>$idValue
  ];
  }
  }

  /**
  * Rechaza: deja el registro en la tabla temporal y ajusta verificacion.
  * Si prefieres que al rechazar vuelva a 'pendiente', cambia el valor.
  */
  function rechazar_registro(PDO $pg, string $entity, $idValue, string $schema='public', string $estado='rechazado'): array {
  $entity = strtolower($entity);
  $tempTable = $entity . '_temp';

  $idCol = detect_id_column($pg,$schema,$tempTable,$entity);

  $sql = "UPDATE ".opa_qident($schema).".".opa_qident($tempTable)."
  SET verificacion = :v
  WHERE ".opa_qident($idCol)." = :id";
  $st = $pg->prepare($sql);
  $st->execute(['v'=>$estado,'id'=>$idValue]);

  return [
  'success' => $st->rowCount() > 0,
  'id' => $idValue,
  'estado' => $estado,
  'message' => $st->rowCount() > 0
  ? "Registro en temporal marcado como $estado"
  : "No se encontró el registro en temporal"
  ];
  }