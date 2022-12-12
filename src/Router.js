import React from "react"
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './Routes/App'
import Widget from './Routes/Widget'

// This site has 3 pages, all of which are rendered
// dynamically in the browser (not server rendered).
//
// Although the page does not ever refresh, notice how
// React Router keeps the URL up to date as you navigate
// through the site. This preserves the browser history,
// making sure things like the back button and bookmarks
// work properly.

export default function Router() {
    return (
        <BrowserRouter>
            <Routes>
                <Route exact path="/" element={<App />} />
                <Route path="/app" element={<App />} />
                <Route path="/widget" element={<Widget />} />
            </Routes>
        </BrowserRouter>
    )
}