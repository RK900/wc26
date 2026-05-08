import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Home } from '@/routes/Home';
import { Preview } from '@/routes/Preview';
import { PoolNew } from '@/routes/PoolNew';
import { PoolJoin } from '@/routes/PoolJoin';
import { PoolView } from '@/routes/PoolView';
import { BracketEdit } from '@/routes/BracketEdit';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/preview" element={<Preview />} />
        <Route path="/pool/new" element={<PoolNew />} />
        <Route path="/pool/:id" element={<PoolView />} />
        <Route path="/pool/:id/join" element={<PoolJoin />} />
        <Route path="/pool/:id/bracket/:bracketId" element={<BracketEdit />} />
      </Route>
    </Routes>
  );
}
