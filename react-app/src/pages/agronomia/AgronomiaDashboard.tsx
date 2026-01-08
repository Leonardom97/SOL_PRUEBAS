import { useState } from 'react';

import AgronomiaTable from './components/AgronomiaTable';
import { AGRONOMIA_TABS } from './AgronomiaConfig';
import api from '../../services/api';
import Modal from '../../components/ui/Modal';
import GenericAuditForm from './components/GenericAuditForm';

const AgronomiaDashboard = () => {
    // const { user } = useAuth(); // Unused
    const [activeTab, setActiveTab] = useState('cosecha'); // Default tab
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    // const [loadingConfig, setLoadingConfig] = useState(false); // Unused
    const [refreshKey, setRefreshKey] = useState(0);

    // Filter allowed tabs based on user permissions or role
    // For now, allow all tabs defined in config
    const allowedTabs = Object.keys(AGRONOMIA_TABS);
    const currentTabConfig = AGRONOMIA_TABS[activeTab];

    const handleCreate = () => {
        setEditingId(null);
        setFormData({});
        setIsModalOpen(true);
    };

    const handleSave = async (data: any) => {
        if (!currentTabConfig) return;
        setSaving(true);
        try {
            // Add ID if editing
            const payload = { ...data };
            // API expects `action=upsert` (from cosecha_fruta.js)
            // The ID key depends on the tab, e.g. cosecha_fruta_id.

            // We need to send it as JSON
            const res = await api.post(`${currentTabConfig.apiEndpoint}?action=upsert`, payload);

            if (res.data.success) {
                setIsModalOpen(false);
                // Trigger reload in table
                setRefreshKey(prev => prev + 1);
            } else {
                alert(res.data.error || 'Error al guardar');
            }
        } catch (error: any) {
            console.error("Save error", error);
            alert(error.response?.data?.error || error.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50/50">
            {/* Tab Navigation */}
            <div className="bg-white border-b border-gray-200 overflow-x-auto">
                <div className="flex px-4 gap-1 min-w-max">
                    {allowedTabs.map(tabId => {
                        const config = AGRONOMIA_TABS[tabId];
                        if (!config) return null;

                        const isActive = activeTab === tabId;
                        return (
                            <button
                                key={tabId}
                                onClick={() => setActiveTab(tabId)}
                                className={`
                                    py-3 px-4 border-b-2 text-sm font-medium transition-colors flex items-center gap-2
                                    ${isActive
                                        ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
                                `}
                            >
                                {config.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-4 overflow-hidden">
                {currentTabConfig ? (
                    <>
                        <AgronomiaTable
                            key={activeTab + refreshKey}
                            title={currentTabConfig.label}
                            apiEndpoint={currentTabConfig.apiEndpoint}
                            columns={currentTabConfig.columns}
                            canCreate={true}
                            canEdit={true}
                            onCreate={handleCreate}
                            onEditItem={(item) => {
                                setEditingId(item.id || item[Object.keys(item)[0]]); // Fallback ID
                                setFormData(item);
                                setIsModalOpen(true);
                            }}
                        />

                        {/* Audit Form Modal */}
                        {currentTabConfig.formFields && (
                            <Modal
                                isOpen={isModalOpen}
                                onClose={() => setIsModalOpen(false)}
                                title={editingId ? `Editar ${currentTabConfig.label}` : `Nuevo ${currentTabConfig.label}`}
                                size="xl"
                            >
                                <GenericAuditForm
                                    fields={currentTabConfig.formFields}
                                    initialData={formData}
                                    onSubmit={handleSave}
                                    onCancel={() => setIsModalOpen(false)}
                                    loading={saving}
                                />
                            </Modal>
                        )}
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        Seleccione una pestaña
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgronomiaDashboard;
