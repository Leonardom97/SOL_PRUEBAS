import type { ColumnDef } from './components/AgronomiaTable';

export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'date' | 'number' | 'time' | 'select' | 'textarea';
    required?: boolean;
    readOnly?: boolean;
    options?: { value: string; label: string }[];
}

export interface TabConfig {
    id: string;
    label: string;
    icon: string;
    apiEndpoint: string;
    columns: ColumnDef[];
    formFields?: FormField[];
}

export const AGRONOMIA_TABS: Record<string, TabConfig> = {
    'cosecha_fruta': {
        id: 'cosecha_fruta',
        label: 'Cosecha Fruta',
        icon: 'chalkboard-teacher',
        apiEndpoint: '/m_agronomia/assets/php/cosecha_fruta_api.php',
        columns: [
            { key: 'cosecha_fruta_id', label: 'ID' },
            { key: 'fecha_actividad', label: 'Fecha' },
            { key: 'responsable', label: 'Responsable' },
            { key: 'plantacion', label: 'Plantación' },
            { key: 'finca', label: 'Finca' },
            { key: 'lote', label: 'Lote' },
            { key: 'labor_especifica', label: 'Labor' },
            { key: 'supervision', label: 'Estado' }
        ],
        formFields: [
            { name: 'cosecha_fruta_id', label: 'ID', type: 'text', readOnly: true },
            { name: 'fecha_actividad', label: 'Fecha Actividad', type: 'date', required: true },
            { name: 'responsable', label: 'Responsable', type: 'text' },
            { name: 'plantacion', label: 'Plantación', type: 'text' },
            { name: 'finca', label: 'Finca', type: 'text' },
            { name: 'siembra', label: 'Siembra', type: 'text' },
            { name: 'lote', label: 'Lote', type: 'text' },
            { name: 'parcela', label: 'Parcela', type: 'text' },
            { name: 'labor_especifica', label: 'Labor Específica', type: 'text' },
            { name: 'tipo_corte', label: 'Tipo Corte', type: 'text' },
            { name: 'equipo', label: 'Equipo', type: 'text' },
            { name: 'cod_colaborador_contratista', label: 'Cod. Colaborador/Contratista', type: 'text' },
            { name: 'n_grupo_dia', label: 'N° Grupo Día', type: 'number' },
            { name: 'hora_entrada', label: 'Hora Entrada', type: 'time' },
            { name: 'hora_salida', label: 'Hora Salida', type: 'time' },
            { name: 'linea_entrada', label: 'Línea Entrada', type: 'number' },
            { name: 'linea_salida', label: 'Línea Salida', type: 'number' },
            { name: 'total_personas', label: 'Total Personas', type: 'number' },
            { name: 'unidad', label: 'Unidad', type: 'text' },
            { name: 'cantidad', label: 'Cantidad', type: 'number' },
            { name: 'peso_promedio_lonas', label: 'Peso Promedio', type: 'number' },
            { name: 'total_persona_dia', label: 'Total Persona Día', type: 'number' },
            { name: 'colaborador', label: 'Colaborador', type: 'text' },
            { name: 'nuevo_operador', label: 'Nuevo Operador', type: 'text' }
        ]
    },
    'mantenimientos': {
        id: 'mantenimientos',
        label: 'Mantenimientos',
        icon: 'users',
        apiEndpoint: '/m_agronomia/assets/php/mantenimientos_api.php', // Assumed based on pattern
        columns: [
            { key: 'mantenimientos_id', label: 'ID' },
            { key: 'fecha', label: 'Fecha' },
            { key: 'responsable', label: 'Responsable' },
            { key: 'labor_especifica', label: 'Labor' },
            { key: 'observacion', label: 'Observación' },
            { key: 'supervision', label: 'Estado' }
        ],
        formFields: [
            { name: 'mantenimientos_id', label: 'ID', type: 'text', readOnly: true },
            { name: 'fecha', label: 'Fecha', type: 'date', required: true },
            { name: 'responsable', label: 'Responsable', type: 'text' },
            { name: 'plantacion', label: 'Plantación', type: 'text' },
            { name: 'finca', label: 'Finca', type: 'text' },
            { name: 'siembra', label: 'Siembra', type: 'text' },
            { name: 'lote', label: 'Lote', type: 'text' },
            { name: 'parcela', label: 'Parcela', type: 'text' },
            { name: 'labor_especifica', label: 'Labor Específica', type: 'text' },
            { name: 'observacion', label: 'Observación', type: 'textarea' },
            { name: 'contratista', label: 'Contratista', type: 'text' },
            { name: 'codigo', label: 'Código', type: 'text' },
            { name: 'colaborador', label: 'Colaborador', type: 'text' },
            { name: 'personas', label: 'Personas', type: 'number' },
            { name: 'hora_entrada', label: 'Hora Entrada', type: 'time' },
            { name: 'hora_salida', label: 'Hora Salida', type: 'time' },
            { name: 'linea_entrada', label: 'Línea Entrada', type: 'number' },
            { name: 'linea_salida', label: 'Línea Salida', type: 'number' },
            { name: 'cantidad', label: 'Cantidad', type: 'number' },
            { name: 'unidad', label: 'Unidad', type: 'text' },
            { name: 'maquina', label: 'Máquina', type: 'text' },
            { name: 'tractorista', label: 'Tractorista', type: 'text' },
            { name: 'nuevo_operario', label: 'Nuevo Operario', type: 'text' }
        ]
    },
    'fertilizacion_organica': {
        id: 'fertilizacion_organica',
        label: 'Fert. Orgánica',
        icon: 'warehouse',
        apiEndpoint: '/m_agronomia/assets/php/fertilizacion_organica_api.php',
        columns: [
            { key: 'fertilizacion_organica_id', label: 'ID' },
            { key: 'fecha_actividad', label: 'Fecha' },
            { key: 'producto_aplicado', label: 'Producto' },
            { key: 'dosis_kg', label: 'Dosis (kg)' },
            { key: 'supervision', label: 'Estado' }
        ],
        formFields: [
            { name: 'fertilizacion_organica_id', label: 'ID', type: 'text', readOnly: true },
            { name: 'fecha_actividad', label: 'Fecha Actividad', type: 'date', required: true },
            { name: 'responsable', label: 'Responsable', type: 'text' },
            { name: 'plantacion', label: 'Plantación', type: 'text' },
            { name: 'finca', label: 'Finca', type: 'text' },
            { name: 'siembra', label: 'Siembra', type: 'text' },
            { name: 'lote', label: 'Lote', type: 'text' },
            { name: 'parcela', label: 'Parcela', type: 'text' },
            { name: 'linea_entrada', label: 'Línea Entrada', type: 'number' },
            { name: 'linea_salida', label: 'Línea Salida', type: 'number' },
            { name: 'hora_entrada', label: 'Hora Entrada', type: 'time' },
            { name: 'hora_salida', label: 'Hora Salida', type: 'time' },
            { name: 'labor_especifica', label: 'Labor Específica', type: 'text' },
            { name: 'producto_aplicado', label: 'Producto Aplicado', type: 'text' },
            { name: 'dosis_kg', label: 'Dosis (kg)', type: 'number' },
            { name: 'unidad_aplicacion', label: 'Unidad Aplicación', type: 'text' },
            { name: 'contratista_colaborador', label: 'Contratista/Colaborador', type: 'text' },
            { name: 'n_colaboradores', label: 'N° Colaboradores', type: 'number' },
            { name: 'colaboradores', label: 'Colaboradores', type: 'textarea' },
            { name: 'tipo_labor', label: 'Tipo Labor', type: 'text' },
            { name: 'contratista_maquinaria', label: 'Contratista Maquinaria', type: 'text' },
            { name: 'n_operadores', label: 'N° Operadores', type: 'number' },
            { name: 'tipo_maquina', label: 'Tipo Máquina', type: 'text' },
            { name: 'nombre_operadores', label: 'Operadores', type: 'textarea' },
            { name: 'bultos_aplicados', label: 'Bultos Aplicados', type: 'number' },
            { name: 'n_traslado', label: 'N° Traslado', type: 'number' },
            { name: 'kg_aplicados', label: 'Kg Aplicados', type: 'number' }
        ]
    },
    'monitoreos_generales': {
        id: 'monitoreos_generales',
        label: 'Monitoreos',
        icon: 'clipboard-list',
        apiEndpoint: '/m_agronomia/assets/php/monitoreos_generales_api.php',
        columns: [
            { key: 'monitoreos_generales_id', label: 'ID' },
            { key: 'fecha', label: 'Fecha' },
            { key: 'colaborador', label: 'Colaborador' },
            { key: 'plantacion', label: 'Plantación' },
            { key: 'lote', label: 'Lote' },
            { key: 'sintoma', label: 'Síntoma' },
            { key: 'supervision', label: 'Estado' }
        ],
        formFields: [
            { name: 'monitoreos_generales_id', label: 'ID', type: 'text', readOnly: true },
            { name: 'fecha', label: 'Fecha', type: 'date', required: true },
            { name: 'hora', label: 'Hora', type: 'time' },
            { name: 'colaborador', label: 'Colaborador', type: 'text' },
            { name: 'plantacion', label: 'Plantación', type: 'text' },
            { name: 'finca', label: 'Finca', type: 'text' },
            { name: 'siembra', label: 'Siembra', type: 'text' },
            { name: 'lote', label: 'Lote', type: 'text' },
            { name: 'parcela', label: 'Parcela', type: 'text' },
            { name: 'linea', label: 'Línea', type: 'number' },
            { name: 'palma', label: 'Palma', type: 'number' },
            { name: 'grupo', label: 'Grupo', type: 'text' },
            { name: 'estado', label: 'Estado Palma', type: 'text' },
            { name: 'validacion', label: 'Validación', type: 'text' },
            { name: 'sintoma', label: 'Síntoma', type: 'text' },
            { name: 'observacion', label: 'Observación', type: 'textarea' }
        ]
    },
    'plagas': {
        id: 'plagas',
        label: 'Plagas',
        icon: 'bug',
        apiEndpoint: '/m_agronomia/assets/php/plagas_api.php',
        columns: [
            { key: 'plagas_id', label: 'ID' },
            { key: 'fecha', label: 'Fecha' },
            { key: 'colaborador', label: 'Colaborador' },
            { key: 'plaga', label: 'Plaga' },
            { key: 'cantidad', label: 'Cant.' },
            { key: 'estado', label: 'Estado' },
            { key: 'supervision', label: 'Estado' }
        ],
        formFields: [
            { name: 'plagas_id', label: 'ID', type: 'text', readOnly: true },
            { name: 'fecha', label: 'Fecha', type: 'date', required: true },
            { name: 'hora', label: 'Hora', type: 'time' },
            { name: 'colaborador', label: 'Colaborador', type: 'text' },
            { name: 'plantacion', label: 'Plantación', type: 'text' },
            { name: 'finca', label: 'Finca', type: 'text' },
            { name: 'siembra', label: 'Siembra', type: 'text' },
            { name: 'lote', label: 'Lote', type: 'text' },
            { name: 'parcela', label: 'Parcela', type: 'text' },
            { name: 'linea', label: 'Línea', type: 'number' },
            { name: 'palma', label: 'Palma', type: 'number' },
            { name: 'ubicacion', label: 'Ubicación', type: 'text' },
            { name: 'orden', label: 'Orden', type: 'text' },
            { name: 'plaga', label: 'Plaga', type: 'text' },
            { name: 'etapa', label: 'Etapa', type: 'text' },
            { name: 'cantidad', label: 'Cantidad', type: 'number' },
            { name: 'instar', label: 'Instar', type: 'text' },
            { name: 'estado', label: 'Estado', type: 'text' }
        ]
    },
    'polinizacion': {
        id: 'polinizacion',
        label: 'Polinización',
        icon: 'flower-2',
        apiEndpoint: '/m_agronomia/assets/php/polinizacion_api.php',
        columns: [
            { key: 'polinizacion_id', label: 'ID' },
            { key: 'fecha', label: 'Fecha' },
            { key: 'colaborador', label: 'Colaborador' },
            { key: 'labor', label: 'Labor' },
            { key: 'flores_buenas', label: 'Flores B' },
            { key: 'supervision', label: 'Estado' }
        ],
        formFields: [
            { name: 'polinizacion_id', label: 'ID', type: 'text', readOnly: true },
            { name: 'fecha', label: 'Fecha', type: 'date', required: true },
            { name: 'colaborador', label: 'Colaborador', type: 'text' },
            { name: 'plantacion', label: 'Plantación', type: 'text' },
            { name: 'finca', label: 'Finca', type: 'text' },
            { name: 'siembra', label: 'Siembra', type: 'text' },
            { name: 'lote', label: 'Lote', type: 'text' },
            { name: 'parcela', label: 'Parcela', type: 'text' },
            { name: 'labor', label: 'Labor', type: 'text' },
            { name: 'linea_entrada', label: 'Línea Entrada', type: 'number' },
            { name: 'linea_salida', label: 'Línea Salida', type: 'number' },
            { name: 'hora_entrada', label: 'Hora Entrada', type: 'time' },
            { name: 'hora_salida', label: 'Hora Salida', type: 'time' },
            { name: 'polen_g', label: 'Polen (g)', type: 'number' },
            { name: 'talco_g', label: 'Talco (g)', type: 'number' },
            { name: 'flores_buenas', label: 'Flores Buenas', type: 'number' },
            { name: 'flores_ayudadas', label: 'Flores Ayudadas', type: 'number' },
            { name: 'flores_dobles', label: 'Flores Dobles', type: 'number' },
            { name: 'observaciones', label: 'Observaciones', type: 'textarea' }
        ]
    },

};
