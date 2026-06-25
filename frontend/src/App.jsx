import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const Home = React.lazy(() => import('./features/search/pages/Home'));
const Search = React.lazy(() => import('./features/search/pages/Search'));

function App() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 font-bold uppercase tracking-widest text-xs animate-pulse">
        Loading...
      </div>
    }>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
      </Routes>
    </Suspense>
  );
}

export default App;
