import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Truck, Package } from 'lucide-react';
import { logisticaService } from './services/logisticaService';
import type { ProgramacionItem } from './types';
import ProgramacionModal from './components/ProgramacionModal';
import AsignarViajeModal from './components/AsignarViajeModal';

const ProgramacionDashboard: React.FC = () => {
    // Current week: "YYYY-W##"
    const [currentWeek, setCurrentWeek] = useState(() => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const year = d.getUTCFullYear();
        const weekNo = Math.ceil((((d.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86400000) + 1) / 7);
        return `${year}-W${weekNo.toString().padStart(2, '0')}`;
    });

    const [items, setItems] = useState<ProgramacionItem[]>([]);
    // const [loading, setLoading] = useState(true); // removed unused loading per build fix

    // Modals
    const [showProgModal, setShowProgModal] = useState(false);
    const [editingItem, setEditingItem] = useState<ProgramacionItem | null>(null);
    const [showViajeModal, setShowViajeModal] = useState(false);
    const [selectedProgIdForViaje, setSelectedProgIdForViaje] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [currentWeek]);

    const loadData = async () => {
        // setLoading(true);
        try {
            const data = await logisticaService.getProgramacion(currentWeek);
            setItems(data);
        } catch (error) {
            console.error(error);
        } finally {
            // setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingItem(null);
        setShowProgModal(true);
    };

    const handleEdit = (item: ProgramacionItem) => {
        setEditingItem(item);
        setShowProgModal(true);
    };

    const handleAssignViaje = (item: ProgramacionItem) => {
        setSelectedProgIdForViaje(item.id);
        setShowViajeModal(true);
    };

    // --- Matrix Logic ---
    const [year, week] = currentWeek.split('-W');
    const simpleDate = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
    const dayOfWeek = simpleDate.getDay();
    const ISOweekStart = new Date(simpleDate);
    if (dayOfWeek <= 4) ISOweekStart.setDate(simpleDate.getDate() - simpleDate.getDay() + 1);
    else ISOweekStart.setDate(simpleDate.getDate() + 8 - simpleDate.getDay());

    const weekDates: string[] = [];
    const daysHeader: { name: string; day: number; date: string }[] = [];
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    for (let i = 0; i < 7; i++) {
        const d = new Date(ISOweekStart);
        d.setDate(ISOweekStart.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        weekDates.push(dateStr);
        daysHeader.push({ name: dayNames[i], day: d.getDate(), date: dateStr });
    }

    const matrix: any = {};
    const dailyTotals = Array(7).fill(0);
    let grandTotal = 0;

    items.forEach(item => {
        const type = (item.proveedor_nombre && item.proveedor_nombre.toUpperCase().includes('PROPIO')) ? 'PROPIO' : 'PROVEEDOR';
        const finca = item.nombre_finca || item.finca_empresa || 'N/A';
        const jornada = item.jornada || 'Tarde';
        const variedad = item.variedad_fruto || item.tipo_material || '-';
        const key = `${type}|${finca}|${jornada}|${variedad}`;

        if (!matrix[key]) {
            matrix[key] = { type, finca, jornada, variedad, days: Array(7).fill(0), rowTotal: 0, items: Array(7).fill(null) };
        }

        const dateIdx = weekDates.indexOf(item.fecha_programacion);
        if (dateIdx !== -1) {
            const tons = parseFloat(item.toneladas_estimadas.toString()) || 0;
            matrix[key].days[dateIdx] += tons;
            matrix[key].rowTotal += tons;
            matrix[key].items[dateIdx] = item;

            dailyTotals[dateIdx] += tons;
            grandTotal += tons;
        }
    });

    const sortedKeys = Object.keys(matrix).sort((a, b) => {
        const typeA = matrix[a].type;
        const typeB = matrix[b].type;
        if (typeA !== typeB) return typeA === 'PROPIO' ? -1 : 1;
        return matrix[a].finca.localeCompare(matrix[b].finca);
    });

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <Calendar size={24} />
                    </div>
                    Programación Semanal
                </h1>

                <div className="flex items-center gap-4">
                    <div className="bg-white px-3 py-2 rounded shadow-sm border flex items-center gap-2">
                        <span className="text-gray-500 text-sm">Semana:</span>
                        <input
                            type="week"
                            className="border-none outline-none text-gray-700 font-medium"
                            value={currentWeek}
                            onChange={(e) => setCurrentWeek(e.target.value)}
                        />
                    </div>
                    <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm">
                        <Plus size={20} /> Programar
                    </button>
                    <button className="bg-gray-100 text-gray-700 px-3 py-2 rounded border hover:bg-gray-200">
                        Exportar
                    </button>
                </div>
            </div>

            {/* Matrix View */}
            <div className="bg-white rounded-lg shadow-sm overflow-x-auto mb-8 border">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="px-4 py-3 text-left font-semibold text-gray-600 w-64">FINCA</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600 w-24">JORNADA</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600 w-24">VAR</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600 w-24">TIPO</th>
                            {daysHeader.map((d, i) => (
                                <th key={i} className={`px-2 py-2 text-center w-20 ${d.date === new Date().toISOString().split('T')[0] ? 'bg-blue-50 border-b-2 border-blue-500' : ''}`}>
                                    <div className="text-xs uppercase text-gray-500">{d.name}</div>
                                    <div className="text-lg font-bold text-gray-800">{d.day}</div>
                                </th>
                            ))}
                            <th className="px-4 py-3 text-center font-semibold text-gray-600">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {sortedKeys.map(key => {
                            const row = matrix[key];
                            return (
                                <tr key={key} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 font-medium text-gray-900">{row.finca}</td>
                                    <td className="px-4 py-2 text-gray-500 text-xs uppercase">{row.jornada}</td>
                                    <td className="px-4 py-2">
                                        {row.variedad === 'Premium'
                                            ? <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-semibold">Premium</span>
                                            : <span className="text-gray-600 text-xs">{row.variedad}</span>
                                        }
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${row.type === 'PROPIO' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>
                                            {row.type}
                                        </span>
                                    </td>
                                    {row.days.map((val: number, i: number) => (
                                        <td key={i} className="px-1 py-2 text-center">
                                            {val > 0 ? (
                                                <button
                                                    onClick={() => handleEdit(row.items[i])}
                                                    className="w-full py-1 rounded bg-gray-100 hover:bg-blue-100 text-gray-800 font-bold text-xs transition-colors"
                                                >
                                                    {val.toFixed(1)}
                                                </button>
                                            ) : (
                                                <span className="text-gray-200 text-lg">·</span>
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-4 py-2 text-center font-bold text-gray-900 border-l bg-gray-50">{row.rowTotal.toFixed(1)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-gray-100 border-t font-bold">
                        <tr>
                            <td colSpan={4} className="px-4 py-3 text-right text-gray-600 uppercase text-xs tracking-wider">Total General</td>
                            {dailyTotals.map((val, i) => (
                                <td key={i} className="px-1 py-3 text-center text-gray-900">{val > 0 ? val.toFixed(1) : '-'}</td>
                            ))}
                            <td className="px-4 py-3 text-center bg-gray-800 text-white">{grandTotal.toFixed(1)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* List View */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="font-bold text-lg text-gray-800 mb-4 border-b pb-2">Programación de Vehículos</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 border-b">
                                <th className="px-3 py-2">Fecha</th>
                                <th className="px-3 py-2">Finca / Acopio</th>
                                <th className="px-3 py-2">Cajones</th>
                                <th className="px-3 py-2">Material</th>
                                <th className="px-3 py-2">Vehículo Asignado</th>
                                <th className="px-3 py-2">Estado</th>
                                <th className="px-3 py-2 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {items.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-4 text-gray-500">No hay programación para esta semana.</td></tr>
                            ) : items.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2">
                                        <div className="font-medium text-gray-900">{new Date(item.fecha_programacion).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}</div>
                                        <div className="text-xs text-gray-500">{item.fecha_programacion}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="font-medium">{item.nombre_finca}</div>
                                        <div className="text-xs text-gray-500">{item.acopio_nombre}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-1">
                                            <Package size={14} className="text-gray-400" />
                                            <span>{item.cantidad_cajones}</span>
                                        </div>
                                        <div className="text-xs text-gray-500">{item.cajon_color}</div>
                                    </td>
                                    <td className="px-3 py-2">{item.variedad_fruto}</td>
                                    <td className="px-3 py-2">
                                        <span className="text-gray-400 text-xs italic">Ver detalles</span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs">Pendiente</span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <button
                                            onClick={() => handleAssignViaje(item)}
                                            className="text-white bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded text-xs flex items-center gap-1 ml-auto"
                                        >
                                            <Truck size={12} /> Asignar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ProgramacionModal
                isOpen={showProgModal}
                onClose={() => setShowProgModal(false)}
                editingItem={editingItem}
                week={currentWeek}
                onSuccess={() => {
                    loadData();
                }}
            />

            <AsignarViajeModal
                isOpen={showViajeModal}
                onClose={() => setShowViajeModal(false)}
                programacionId={selectedProgIdForViaje}
                onSuccess={() => {
                    loadData();
                }}
            />
        </div>
    );
};

export default ProgramacionDashboard;
