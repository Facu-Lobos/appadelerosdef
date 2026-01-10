export const playNotificationSound = () => {
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Simple "Ding" sound
        audio.volume = 0.5;
        audio.play().catch(e => console.warn('Audio play failed (user interaction needed first):', e));
    } catch (error) {
        console.error('Error playing sound:', error);
    }
};
