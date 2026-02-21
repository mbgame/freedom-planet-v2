'use client';

import { Leva } from 'leva';

export const ClientLeva: React.FC<{ hidden?: boolean }> = ({ hidden }) => {
    return <Leva hidden={hidden} collapsed />;
};
