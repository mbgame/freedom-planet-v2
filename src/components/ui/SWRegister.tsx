'use client';

import { useEffect } from 'react';

export const SWRegister: React.FC = () => {
    useEffect(() => {
        if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
            window.addEventListener('load', () => {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((registration) => {
                        console.log('AETHEROS: Service Worker registered with scope:', registration.scope);
                    })
                    .catch((error) => {
                        console.error('AETHEROS: Service Worker registration failed:', error);
                    });
            });
        }
    }, []);

    return null;
};
