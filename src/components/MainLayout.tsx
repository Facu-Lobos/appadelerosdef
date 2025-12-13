import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Calendar, Trophy, Users, User, LogOut, Search, Bell, Medal } from 'lucide-react';
import clsx from 'clsx';
import AIAssistant from './AIAssistant';
import { useNotifications } from '../context/NotificationContext';
import { useState } from 'react';
import { AppLogo } from './AppLogo';

export default function MainLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const { notifications, unreadCount, markAsRead } = useNotifications();
    // State split to prevent collisions
    const [showDesktopNotifications, setShowDesktopNotifications] = useState(false);
    const [showMobileNotifications, setShowMobileNotifications] = useState(false);

    const handleNotificationClick = (notificationId: string) => {
        markAsRead(notificationId);
        setShowDesktopNotifications(false);
        setShowMobileNotifications(false);
    };

    const playerLinks = [
        { to: '/player', icon: Search, label: 'Explorar' },
        { to: '/player/bookings', icon: Calendar, label: 'Mis Reservas' },
        { to: '/player/tournaments', icon: Trophy, label: 'Torneos' },
        { to: '/player/community', icon: Users, label: 'Comunidad' },
        { to: '/player/profile', icon: User, label: 'Perfil' },
    ];

    const clubLinks = [
        { to: '/club', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/club/calendar', icon: Calendar, label: 'Calendario' },
        { to: '/club/tournaments', icon: Trophy, label: 'Torneos' },
        { to: '/club/rankings', icon: Medal, label: 'Rankings' },
        { to: '/club/community', icon: Users, label: 'Comunidad' },
        { to: '/club/profile', icon: User, label: 'Perfil Club' },
    ];

    const links = user?.role === 'club' ? clubLinks : playerLinks;

    return (
        <div className="min-h-screen bg-background text-white flex">
            {/* Sidebar */}
            <aside className="w-64 bg-surface border-r border-white/5 flex flex-col fixed h-full z-10 hidden md:flex">
                <div className="p-6">
                    <AppLogo />
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = location.pathname === link.to;
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={clsx(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                                    isActive
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                )}
                            >
                                <Icon size={20} />
                                <span>{link.label}</span>
                            </Link>
                        );
                    })}

                    {/* Sidebar Notification Button */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDesktopNotifications(!showDesktopNotifications)}
                            className={clsx(
                                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-gray-400 hover:bg-white/5 hover:text-white',
                                showDesktopNotifications && 'bg-white/5 text-white'
                            )}
                        >
                            <div className="relative">
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface"></span>
                                )}
                            </div>
                            <span>Notificaciones</span>
                        </button>

                        {showDesktopNotifications && (
                            <div className="absolute left-0 top-full mt-2 w-full bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                                <div className="p-3 border-b border-white/10 font-bold text-sm">Notificaciones</div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-gray-500">No tienes notificaciones</div>
                                    ) : (
                                        notifications.map(n => (
                                            <Link
                                                key={n.id}
                                                to={n.link}
                                                className={`block p-3 hover:bg-white/5 border-b border-white/5 last:border-0 ${n.read ? 'opacity-50' : ''}`}
                                                onClick={() => handleNotificationClick(n.id)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <p className="text-sm font-medium text-white">{n.title}</p>
                                                    {!n.read && <span className="w-2 h-2 bg-primary rounded-full mt-1"></span>}
                                                </div>
                                                <p className="text-xs text-gray-400">{n.description}</p>
                                                <p className="text-[10px] text-gray-600 mt-1">
                                                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </Link>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-4 px-4">
                        <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                            {user?.avatar_url && <img src={user.avatar_url} alt={user.name} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.name}</p>
                            <p className="text-xs text-gray-500 truncate capitalize">{user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-xl w-full transition-colors"
                    >
                        <LogOut size={20} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-dark-primary border-b border-white/5 p-4 z-50 flex justify-between items-center shadow-lg">
                <AppLogo />

                {/* Notification Bell (Mobile) */}
                <div className="relative">
                    <button onClick={() => setShowMobileNotifications(!showMobileNotifications)} className="p-2 text-gray-400 hover:text-white relative">
                        <Bell size={24} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface"></span>
                        )}
                    </button>

                    {/* Dropdown */}
                    {showMobileNotifications && (
                        <div className="absolute right-0 mt-2 w-64 bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                            <div className="p-3 border-b border-white/10 font-bold text-sm">Notificaciones</div>
                            <div className="max-h-64 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-gray-500">No tienes notificaciones</div>
                                ) : (
                                    notifications.map(n => (
                                        <Link
                                            key={n.id}
                                            to={n.link}
                                            className={`block p-3 hover:bg-white/5 border-b border-white/5 last:border-0 ${n.read ? 'opacity-50' : ''}`}
                                            onClick={() => handleNotificationClick(n.id)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <p className="text-sm font-medium text-white">{n.title}</p>
                                                {!n.read && <span className="w-2 h-2 bg-primary rounded-full mt-1"></span>}
                                            </div>
                                            <p className="text-xs text-gray-400">{n.description}</p>
                                            <p className="text-[10px] text-gray-600 mt-1">
                                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>



            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 pt-24 md:pt-8 pb-28 md:pb-8">
                <Outlet />
            </main>

            {/* Mobile Bottom Nav */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60]">
                <div className="container mx-auto max-w-lg">
                    <div className="flex gap-2 border-t border-white/10 bg-dark-primary px-4 pb-4 pt-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] justify-between">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = location.pathname === link.to;
                            const activeClass = 'text-primary';
                            const inactiveClass = 'text-light-secondary hover:text-white';

                            return (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={`relative flex flex-1 flex-col items-center justify-end gap-1 transition-colors ${isActive ? activeClass : inactiveClass}`}
                                >
                                    <div className="flex h-7 items-center justify-center">
                                        <Icon size={24} />
                                    </div>
                                    <p className="text-[10px] truncate max-w-[64px] text-center font-medium tracking-tight">{link.label}</p>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* AI Assistant Global Component */}
            {user?.role === 'player' && <AIAssistant />}
        </div>
    );
}
