
import { useState } from 'react';
import { seeder } from '../../utils/seeder';
import { supabaseService } from '../../services/supabaseService';
import { Button } from '../../components/ui/Button';

export default function SeederPage() {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleSeedPlayers = async (count: number = 3) => {
        setLoading(true);
        addLog(`Starting Player Seeding (${count})...`);
        // Note: This relies on SignUp which logs you in. 
        // You might lose your current session!
        alert("Warning: This will attempt to create users via SignUp. You WILL be logged out.");
        try {
            const ids = await seeder.seedPlayers(count);
            addLog(`Created ${ids.length} players.`);
        } catch (e) {
            addLog(`Error: ${e}`);
        }
        setLoading(false);
    };

    const handleSeedClubData = async () => {
        setLoading(true);
        addLog('Seeding Club Data (Tournaments & Bookings)...');
        try {
            const user = await supabaseService.getCurrentUser();
            if (!user || user.role !== 'club') {
                addLog('Error: proper Club session required.');
                setLoading(false);
                return;
            }

            await seeder.seedTournaments(user.id);
            addLog('Tournaments seeded.');

            await seeder.seedBookings(user.id);
            addLog('Bookings seeded.');

        } catch (e) {
            addLog(`Error: ${e}`);
        }
        setLoading(false);
    };

    const handleRegisterTeams = async () => {
        setLoading(true);
        addLog('Registering Teams to Tournament...');
        try {
            const user = await supabaseService.getCurrentUser();
            if (!user || user.role !== 'club') {
                addLog('Error: proper Club session required.');
                setLoading(false);
                return;
            }
            await seeder.seedTournamentRegistrations(user.id);
            addLog('Teams registered!');
        } catch (e) {
            addLog(`Error: ${e}`);
        }
        setLoading(false);
    };

    return (
        <div className="p-8 bg-slate-900 min-h-screen text-white">
            <h1 className="text-3xl font-bold mb-4">Promo Video Data Seeder</h1>

            <div className="space-y-4">
                <div className="p-4 bg-slate-800 rounded border border-slate-700">
                    <h2 className="text-xl font-bold mb-2">1. Create Demo Players</h2>
                    <p className="text-gray-400 mb-4 text-sm">Creates fake accounts in Auth. WARNING: Modifies session.</p>
                    <div className="flex gap-2">
                        <Button onClick={() => handleSeedPlayers(5)} disabled={loading} variant="secondary">
                            Create 5 Players
                        </Button>
                        <Button onClick={() => handleSeedPlayers(32)} disabled={loading} variant="primary">
                            Create 32 Players (Full Tournament)
                        </Button>
                    </div>
                </div>

                <div className="p-4 bg-slate-800 rounded border border-slate-700">
                    <h2 className="text-xl font-bold mb-2">2. Seed Club Data</h2>
                    <p className="text-gray-400 mb-4 text-sm">Must be logged in as Club. Creates tournaments and guest bookings.</p>
                    <Button onClick={handleSeedClubData} disabled={loading}>
                        Seed Calendar & Tournaments
                    </Button>
                    <Button onClick={handleRegisterTeams} disabled={loading} variant="secondary" className="ml-2">
                        Register Teams (Requires Players)
                    </Button>
                </div>
            </div>

            <div className="mt-8 p-4 bg-black rounded font-mono text-xs h-64 overflow-y-auto">
                {logs.map((L, i) => <div key={i}>{L}</div>)}
            </div>
        </div>
    );
}
