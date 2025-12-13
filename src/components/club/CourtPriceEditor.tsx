import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../ui/Button';

interface CourtPriceEditorProps {
    courtId: string;
    initialPrice: number;
    onSave: (courtId: string, price: number) => Promise<void>;
}

export function CourtPriceEditor({ courtId, initialPrice, onSave }: CourtPriceEditorProps) {
    const [price, setPrice] = useState(initialPrice);
    const [isDirty, setIsDirty] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onSave(courtId, price);
        setSaving(false);
        setIsDirty(false);
    };

    return (
        <div className="flex flex-col items-end gap-2">
            <div className="flex flex-col items-end">
                <label className="text-xs text-gray-400 mb-1">Precio/Turno</label>
                <div className="flex items-center gap-2">
                    <span className="text-gray-400">$</span>
                    <input
                        type="number"
                        className={`w-24 bg-black/20 border rounded px-2 py-1 text-right text-white focus:border-primary focus:outline-none transition-colors ${isDirty ? 'border-yellow-500/50' : 'border-white/10'
                            }`}
                        value={price}
                        onChange={(e) => {
                            setPrice(Number(e.target.value));
                            setIsDirty(true);
                        }}
                    />
                </div>
            </div>
            {isDirty && (
                <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-7 text-xs px-2"
                    icon={Save}
                >
                    {saving ? '...' : 'Guardar'}
                </Button>
            )}
        </div>
    );
}
