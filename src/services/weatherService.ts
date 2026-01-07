export const weatherService = {
    async getCoordinates(city: string) {
        try {
            // Remove "Argentina" or extra info if present to help search, or keep it? 
            // Better to search as is first.
            const response = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=es&format=json`
            );
            if (!response.ok) throw new Error('Geocoding API Error');
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                return {
                    lat: data.results[0].latitude,
                    lng: data.results[0].longitude,
                    name: data.results[0].name
                };
            }
            return null;
        } catch (error) {
            console.error('Error geocoding city:', error);
            return null;
        }
    },

    async getWeather(latitude: number, longitude: number) {
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&hourly=temperature_2m,precipitation_probability,weather_code&timezone=auto&forecast_days=1`
            );

            if (!response.ok) throw new Error('Weather API Error');

            const data = await response.json();
            return {
                current: {
                    temp: data.current.temperature_2m,
                    code: data.current.weather_code,
                },
                hourly: {
                    time: data.hourly.time,
                    temp: data.hourly.temperature_2m,
                    precip: data.hourly.precipitation_probability,
                    code: data.hourly.weather_code
                }
            };
        } catch (error) {
            console.error('Error fetching weather:', error);
            return null;
        }
    },

    // Helper to get icon/label from WMO code
    getWeatherInfo(code: number) {
        // WMO Weather interpretation codes (WW)
        if (code === 0) return { label: 'Despejado', icon: 'Sun', color: 'text-yellow-400' };
        if (code >= 1 && code <= 3) return { label: 'Nublado', icon: 'Cloud', color: 'text-gray-300' };
        if (code >= 45 && code <= 48) return { label: 'Niebla', icon: 'CloudFog', color: 'text-gray-400' };
        if (code >= 51 && code <= 55) return { label: 'Llaovizna', icon: 'CloudDrizzle', color: 'text-blue-300' };
        if (code >= 61 && code <= 65) return { label: 'Lluvia', icon: 'CloudRain', color: 'text-blue-500' };
        if (code >= 80 && code <= 82) return { label: 'Chubascos', icon: 'CloudRain', color: 'text-blue-600' };
        if (code >= 95) return { label: 'Tormenta', icon: 'CloudLightning', color: 'text-purple-500' };

        return { label: 'Desconocido', icon: 'Cloud', color: 'text-gray-400' };
    }
};
