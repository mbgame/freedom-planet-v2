'use client';
import { useProgress } from '@react-three/drei';
import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

/**
 * LoadingTracker sits inside the Canvas but OUTSIDE the Suspense boundary.
 * This ensures it doesn't suspend itself, allowing it to track and update 
 * the loading progress of all components inside the Suspense boundary.
 */
export const LoadingTracker = () => {
    const { progress, active, total, loaded, item } = useProgress();
    const setLoading = useGameStore(state => state.setLoading);

    useEffect(() => {
        // Log to console so user can see what's happening
        console.log(`[Loading] ${Math.round(progress)}% | Active: ${active} | ${loaded}/${total} | Last: ${item}`);

        // Always sync progress to store
        setLoading(true, Math.round(progress));

        // If load is complete or definitely not active anymore
        if (!active && (progress === 100 || total === 0)) {
            const timer = setTimeout(() => {
                setLoading(false, 100);
            }, 800);
            return () => clearTimeout(timer);
        }

        // Safety timeout: If we're stuck for 15 seconds, force proceed
        const safetyTimer = setTimeout(() => {
            setLoading(false, 100);
        }, 15000);
        return () => clearTimeout(safetyTimer);

    }, [active, progress, total, loaded, item, setLoading]);

    return null;
};
