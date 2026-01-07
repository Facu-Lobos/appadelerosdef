import { useEffect, useState } from 'react';
import { weatherService } from '../services/weatherService';
import { Sun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudLightning, Thermometer } from 'lucide-react';

interface WeatherWidgetProps {
    location?: string; // For display name if needed
    coords?: { lat: number, lng: number }; // If we had exact coords
}

// Map string icon names to components
const iconMap: any = {
    Sun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudLightning
};

export function WeatherWidget({ location }: WeatherWidgetProps) {
    const [weather, setWeather] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWeather = async () => {
            // Default to Buenos Aires if no location
            let lat = -34.6037;
            let lng = -58.3816;

            if (location) {
                const coords = await weatherService.getCoordinates(location);
                if (coords) {
                    lat = coords.lat;
                    lng = coords.lng;
                }
            }

            const data = await weatherService.getWeather(lat, lng);
            setWeather(data);
            setLoading(false);
        };

        fetchWeather();
    }, [location]);

    if (loading || !weather) return null; // Hidde if loading or error

    const info = weatherService.getWeatherInfo(weather.current.code);
    const Icon = iconMap[info.icon] || Cloud;

    return (
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full bg-white/10 ${info.color}`}>
                    <Icon size={24} />
                </div>
                <div>
                    <div className="text-xs text-blue-200 uppercase font-bold tracking-wider">Clima Actual</div>
                    <div className="font-bold text-white text-lg flex items-center gap-1">
                        {info.label}
                        <span className="text-2xl ml-2">{Math.round(weather.current.temp)}°</span>
                    </div>
                </div>
            </div>

            {/* Advice Badge */}
            <div className="text-right">
                {weather.current.code > 60 ? (
                    <span className="text-xs font-bold bg-red-500/80 text-white px-2 py-1 rounded-md">
                        Posible Lluvia
                    </span>
                ) : (
                    <span className="text-xs font-bold bg-green-500/80 text-white px-2 py-1 rounded-md">
                        Ideal para Jugar
                    </span>
                )}
            </div>
        </div>
    );
}
