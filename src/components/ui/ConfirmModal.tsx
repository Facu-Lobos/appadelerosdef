import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

export type ConfirmActionType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmActionType;
    isLoading?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'warning',
    isLoading = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <XCircle className="w-12 h-12 text-red-500 mb-4" />;
            case 'warning':
                return <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />;
            case 'success':
                return <CheckCircle className="w-12 h-12 text-green-500 mb-4" />;
            case 'info':
            default:
                return <Info className="w-12 h-12 text-blue-500 mb-4" />;
        }
    };

    const getConfirmButtonClass = () => {
        switch (type) {
            case 'danger':
                return 'bg-red-500 hover:bg-red-600 border-red-500 shadow-lg shadow-red-500/20';
            case 'warning':
                return 'bg-yellow-500 hover:bg-yellow-600 border-yellow-500 shadow-lg shadow-yellow-500/20 text-black';
            case 'success':
                return 'bg-green-500 hover:bg-green-600 border-green-500 shadow-lg shadow-green-500/20';
            case 'info':
            default:
                return 'bg-primary hover:bg-primary-hover border-primary shadow-lg shadow-primary/20 text-black';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
            <div className="flex flex-col items-center text-center p-2">
                {getIcon()}
                
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <div className="text-gray-300 mb-8 w-full whitespace-pre-line">
                    {message}
                </div>

                <div className="flex w-full gap-3 justify-center">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        className={`flex-1 ${getConfirmButtonClass()}`}
                        onClick={onConfirm}
                        isLoading={isLoading}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
