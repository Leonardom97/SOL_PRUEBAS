export interface Finca {
    id: string;
    nombre_finca: string;
    nombre_empresa: string;
    nit: string;
    distancia_km: string;
}

export interface Acopio {
    id: string;
    finca_id: string;
    identificador: string;
}

export interface Cajon {
    id: string;
    codigo: string;
    color: string;
    empresa: string;
    tipo: 'Metálico' | 'Madera';
    capacidad_ton: number;
}

export interface ProgramacionItem {
    id: string;
    fecha_programacion: string;
    jornada: 'Mañana' | 'Tarde';
    finca_id: string;
    nombre_finca?: string; // joined
    finca_empresa?: string; // joined
    proveedor_nombre?: string; // joined
    acopio_id: string;
    acopio_nombre?: string; // joined
    variedad_fruto: string;
    tipo_material?: string; // alias
    cajon_id: string;
    cantidad_cajones: number;
    toneladas_estimadas: number;
    // Helper fields for display
    cajon_color?: string;
}

export interface Viaje {
    id: string;
    programacion_id: string;
    vehiculo_id: string;
    conductor_id: string;
    estado_viaje: 'pendiente' | 'en_curso' | 'completo';
    placa?: string;
    tipo_vehiculo?: string;
    nombres?: string; // Conductor
    apellidos?: string; // Conductor
    created_at?: string;
}

export interface Vehiculo {
    id: string;
    placa: string;
    tipo_vehiculo: string;
    estado_vehiculo: string;
    ubicacion_actual: string;
}

export interface Conductor {
    id: string;
    nombres: string;
    apellidos: string;
    estado_conductor: string;
}

export interface SaveProgramacionPayload {
    id?: string;
    fecha_programacion: string;
    jornada: string;
    variedad_fruto: string;
    finca_id: string;
    acopio_id: string;
    cajon_id: string;
    cantidad_cajones: number;
    toneladas_estimadas: number;
}

export interface SaveRemisionPayload {
    viaje_id: string;
    fecha_corte: string;
    ciclo_cosecha?: string;
    lotes_corte?: string;
    variedad_tipo: 'hibrido' | 'guineensis';
    cosechado_por?: string;
    fecha_hora_cargue: string;
    fecha_hora_recogida: string;
    fruto_certificado?: boolean;
    certificado_por?: string;
    observaciones?: string;
}
