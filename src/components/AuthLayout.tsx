import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                        APPadeleros
                    </h1>
                    <p className="text-gray-400">Tu comunidad de pádel definitiva</p>
                </div>
                <Outlet />
            </div>
        </div>
    );
}
