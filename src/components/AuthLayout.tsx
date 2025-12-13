import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header removed as Login page handles its own branding */}
                <Outlet />
            </div>
        </div>
    );
}
