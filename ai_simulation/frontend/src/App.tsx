import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes/router';
import { ToastProvider } from '@/components/common/Toast';

function App() {
    return (
        <>
            <ToastProvider />
            <RouterProvider router={router} />
        </>
    );
}

export default App;