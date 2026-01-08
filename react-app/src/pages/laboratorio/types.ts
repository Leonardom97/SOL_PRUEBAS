export interface Tanque {
    id: string; // or number, keeping string for safety with PHP IDs
    numero_tanque: string;
    id_variedad?: string | null;
    capacidad_toneladas: string; // From API strings
    variedad_nombre?: string;
    calidad?: string;
}

export interface Variedad {
    id: string;
    nombre: string;
}

export interface RegistroDiario {
    id: string;
    id_tanque: string;
    fecha: string; // YYYY-MM-DD
    numero_tanque: string;
    variedad_nombre?: string;
    capacidad_toneladas: string;

    // Inventory
    inventario_inicial: string;
    despacho_neto: string | null;
    inventario_final: string | null;

    // Secadores logic
    total_secadores: string | number;
    total_ton_secadores: string;

    // Measurements (Calculated)
    medicion_inicial: string | null;
    medicion_final: string | null;

    // Temperature
    temperatura_inicial: string | null;
    temperatura_final: string | null;

    // Status
    cerrado: boolean | 0 | 1;
    created_at?: string;
    updated_at?: string;
    ac_id_cierre?: string;
    ac_nombre1?: string;
    ac_apellido1?: string;

    // Daily Quality Summary (from related measurements)
    calidad_acidez?: string;
    calidad_humedad?: string;
    calidad_yodo?: string;
}

export interface LugarMuestreo {
    id: string;
    nombre: string;
}

export interface Secador {
    id: string;
    nombre: string;
    codigo: string;
    capacidad_toneladas: string;
}

export interface Colaborador {
    ac_id: string;
    ac_nombre1: string;
    ac_nombre2?: string;
    ac_apellido1: string;
    ac_apellido2?: string;
}

export interface MedicionCalculoPayload {
    id: string; // Registro ID
    tipo: 'inicial' | 'final';
    medicion_resultado: string | number;
    p_ref_ini: string | number;
    p_ref_fin: string | number;
}

export interface CierreDiaPayload {
    id: string; // Registro ID
    inventario_final: string | number;
    observaciones?: string;
}

export interface SaveRegistroPayload {
    id: string | null; // null for new
    id_tanque: string;
    fecha: string;
    despacho_neto?: string | number;
    inventario_final?: string | number;
    temperatura_inicial?: string | number;
    temperatura_final?: string | number;
}

export interface BaseMedicionPayload {
    id_tanque: string;
    tipo_medida: string; // 'Manual' | 'NIR'
    id_lugar_muestreo?: string | null;
    id_colaborador?: string | null;
    observaciones?: string;
    tipo_origen?: string; // 'tanque', 'bombeo', 'despacho'
    id_registro_origen?: string | null;
}

export interface SaveAcidezPayload extends BaseMedicionPayload {
    valor_manual?: string | number;
    cantidad_muestra_gramos?: string | number;
    peso_muestra_w?: string | number;
    normalidad_n?: string | number;
    volumen_naoh_v?: string | number;
}

export interface SaveHumedadPayload extends BaseMedicionPayload {
    valor_manual?: string | number;
    peso_recipiente_a?: string | number;
    peso_muestra_humedad_b?: string | number;
    peso_muestra_seca_recipiente_c?: string | number;
}

export interface SaveYodoPayload extends BaseMedicionPayload {
    valor_manual?: string | number;
    peso_aceite_w?: string | number;
    volumen_blanco_vb?: string | number;
    volumen_aceite_va?: string | number;
}

export interface SaveBombeoPayload {
    id_secador: string;
    id_tanque_destino: string;
    toneladas: string | number;
    porcentaje_humedad?: string | number | null;
    porcentaje_acidez?: string | number | null;
    indice_yodo?: string | number | null;
}

export interface SaveDespachoPayload {
    id_tanque: string;
    toneladas: string | number;
    placa_vehiculo: string;
    responsable_vehiculo: string;
    porcentaje_humedad?: string | number | null;
    porcentaje_acidez?: string | number | null;
    indice_yodo?: string | number | null;
}
